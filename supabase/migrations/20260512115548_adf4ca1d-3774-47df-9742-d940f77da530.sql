
-- =========== Phase 3: Rider Lifecycle & Storage ===========

-- 1. New columns on riders for documents + admin workflow
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS profile_photo_path text,
  ADD COLUMN IF NOT EXISTS id_doc_path        text,
  ADD COLUMN IF NOT EXISTS license_doc_path   text,
  ADD COLUMN IF NOT EXISTS vehicle_doc_path   text,
  ADD COLUMN IF NOT EXISTS rejection_reason   text,
  ADD COLUMN IF NOT EXISTS approved_at        timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by        uuid;

-- 2. POD on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pod_photo_path text,
  ADD COLUMN IF NOT EXISTS delivered_at   timestamptz;

-- 3. Storage buckets (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rider-docs', 'rider-docs', false),
       ('pod', 'pod', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS for rider-docs:
--    Path layout: {auth.uid()}/{filename}
DROP POLICY IF EXISTS "Riders manage own docs" ON storage.objects;
CREATE POLICY "Riders manage own docs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'rider-docs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'rider-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins read all rider docs" ON storage.objects;
CREATE POLICY "Admins read all rider docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'rider-docs' AND has_role(auth.uid(), 'admin'::app_role));

-- 5. Storage RLS for pod:
--    Path layout: {order_id}/{filename}.  Riders may upload to their assigned orders.
DROP POLICY IF EXISTS "Riders upload POD for own orders" ON storage.objects;
CREATE POLICY "Riders upload POD for own orders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pod'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND r.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Riders read POD for own orders" ON storage.objects;
CREATE POLICY "Riders read POD for own orders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pod'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND r.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins read all POD" ON storage.objects;
CREATE POLICY "Admins read all POD"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pod' AND has_role(auth.uid(), 'admin'::app_role));

-- 6. Strengthen the order trigger:
--    - Only approved riders may self-assign
--    - Cannot transition to 'delivered' without pod_photo_path
--    - Stamp delivered_at automatically
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_is_admin    boolean := has_role(auth.uid(), 'admin'::app_role);
  v_rider_status text;
BEGIN
  IF OLD.status IN ('delivered','cancelled') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Order is finalized (%). It cannot be changed.', OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_is_admin THEN
    IF NOT public.is_valid_order_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Self-assignment by rider: must be approved
  IF NOT v_is_admin AND NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    IF NOT (OLD.rider_id IS NULL AND NEW.rider_id IS NOT NULL AND NEW.status = 'assigned') THEN
      RAISE EXCEPTION 'Riders cannot reassign orders';
    END IF;
    SELECT status INTO v_rider_status FROM public.riders WHERE id = NEW.rider_id;
    IF v_rider_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Only approved riders can accept orders';
    END IF;
  END IF;

  -- POD required to mark delivered (admins exempt for manual override)
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' AND NOT v_is_admin THEN
    IF NEW.pod_photo_path IS NULL OR length(NEW.pod_photo_path) = 0 THEN
      RAISE EXCEPTION 'Proof of delivery photo is required to mark delivered'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.delivered_at := now();
  END IF;

  IF NOT v_is_admin THEN
    IF NEW.customer_name   <> OLD.customer_name
    OR NEW.customer_phone  <> OLD.customer_phone
    OR NEW.pickup_location <> OLD.pickup_location
    OR NEW.drop_location   <> OLD.drop_location
    OR NEW.item_type       <> OLD.item_type
    OR NEW.delivery_type   <> OLD.delivery_type THEN
      RAISE EXCEPTION 'Riders cannot edit order details';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Admin approve/reject RPCs
CREATE OR REPLACE FUNCTION public.admin_approve_rider(p_rider_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.riders
     SET status = 'approved',
         rejection_reason = NULL,
         approved_at = now(),
         approved_by = auth.uid()
   WHERE id = p_rider_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_rider(p_rider_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Rejection reason required (min 3 chars)';
  END IF;
  UPDATE public.riders
     SET status = 'rejected',
         rejection_reason = trim(p_reason),
         approved_at = NULL
   WHERE id = p_rider_id;
END;
$$;

-- 8. Public POD signed URL via RPC (lets a tracking visitor view the POD without auth)
CREATE OR REPLACE FUNCTION public.get_order_pod_path(p_code text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_path text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 4 OR length(p_code) > 32 THEN
    RAISE EXCEPTION 'Invalid order code';
  END IF;
  SELECT pod_photo_path INTO v_path FROM public.orders
   WHERE order_code = upper(p_code) AND status = 'delivered'
   LIMIT 1;
  RETURN v_path;
END;
$$;
