
-- 1. Remove public PII exposure on orders
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;

-- 2. Tighten rider update policy: must own the order, and cannot regress status
DROP POLICY IF EXISTS "Riders update assignable orders" ON public.orders;

CREATE POLICY "Riders update their assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'rider'::app_role)
  AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

-- Trigger to prevent status regression and forbid changing customer PII / rider_id by riders
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank_old int;
  v_rank_new int;
BEGIN
  -- Admins bypass these rules
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Rank statuses to prevent regression
  v_rank_old := CASE OLD.status
    WHEN 'pending' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'picked' THEN 3
    WHEN 'in_transit' THEN 4
    WHEN 'delivered' THEN 5
    WHEN 'cancelled' THEN 99
    ELSE 0 END;
  v_rank_new := CASE NEW.status
    WHEN 'pending' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'picked' THEN 3
    WHEN 'in_transit' THEN 4
    WHEN 'delivered' THEN 5
    WHEN 'cancelled' THEN 99
    ELSE 0 END;

  IF OLD.status = 'delivered' OR OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is finalized and cannot be changed';
  END IF;

  IF v_rank_new < v_rank_old AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Status cannot move backwards';
  END IF;

  -- Riders cannot reassign or edit PII
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    RAISE EXCEPTION 'Riders cannot change order assignment';
  END IF;
  IF NEW.customer_name <> OLD.customer_name
     OR NEW.customer_phone <> OLD.customer_phone
     OR NEW.pickup_location <> OLD.pickup_location
     OR NEW.drop_location <> OLD.drop_location
     OR NEW.item_type <> OLD.item_type
     OR NEW.delivery_type <> OLD.delivery_type THEN
    RAISE EXCEPTION 'Riders cannot edit order details';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_update ON public.orders;
CREATE TRIGGER trg_enforce_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_update_rules();

-- 3. Secure RPC for guest tracking (no PII)
CREATE OR REPLACE FUNCTION public.get_order_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  order_code text,
  pickup_location text,
  drop_location text,
  item_type text,
  delivery_type text,
  status text,
  rider_id uuid,
  estimated_delivery_at timestamptz,
  created_at timestamptz,
  rider_name text,
  rider_vehicle text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_code,
    o.pickup_location,
    o.drop_location,
    o.item_type,
    o.delivery_type,
    o.status,
    o.rider_id,
    o.estimated_delivery_at,
    o.created_at,
    r.name AS rider_name,
    r.vehicle_type AS rider_vehicle
  FROM public.orders o
  LEFT JOIN public.riders r ON r.id = o.rider_id
  WHERE o.order_code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_code(text) TO anon, authenticated;

-- 4. Allow self-assignment of the 'rider' role only (never admin/moderator)
DROP POLICY IF EXISTS "Users can self-assign rider role" ON public.user_roles;
CREATE POLICY "Users can self-assign rider role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND role = 'rider'::app_role
);

-- 5. Admin bootstrap helper — only works when no admin exists yet
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role) THEN
    RAISE EXCEPTION 'An admin already exists. Use the admin panel to create more.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email %. Sign up first, then call bootstrap.', p_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN 'Admin role granted to ' || p_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin(text) FROM anon, authenticated;
