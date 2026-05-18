-- ============================================================
-- Phase 6a: Customer accounts, history, ratings
-- ============================================================

-- 1) customer_profiles ----------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  phone text,
  default_pickup text,
  default_drop text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own profile"
  ON public.customer_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Customers insert own profile"
  ON public.customer_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customers update own profile"
  ON public.customer_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all customer profiles"
  ON public.customer_profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER customer_profiles_touch
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) orders.customer_user_id -----------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id uuid;

CREATE INDEX IF NOT EXISTS orders_customer_user_id_idx
  ON public.orders(customer_user_id) WHERE customer_user_id IS NOT NULL;

-- Allow customers to view their own orders
CREATE POLICY "Customers view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (customer_user_id IS NOT NULL AND customer_user_id = auth.uid());

-- 3) reviews ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  rider_id uuid NOT NULL,
  customer_user_id uuid NOT NULL,
  rating smallint NOT NULL,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "Admins read all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved riders read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Inserts go through SECURITY DEFINER fn `submit_review`; no direct INSERT policy.

CREATE INDEX IF NOT EXISTS reviews_rider_id_idx ON public.reviews(rider_id);

-- 4) Denormalized rider rating columns -------------------------
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

-- Trigger to keep rider aggregate fresh
CREATE OR REPLACE FUNCTION public.refresh_rider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_rider uuid;
BEGIN
  v_rider := COALESCE(NEW.rider_id, OLD.rider_id);
  UPDATE public.riders r
     SET avg_rating = sub.avg_r,
         reviews_count = sub.cnt
    FROM (
      SELECT rider_id, ROUND(avg(rating)::numeric, 2) AS avg_r, count(*) AS cnt
        FROM public.reviews
       WHERE rider_id = v_rider
       GROUP BY rider_id
    ) sub
   WHERE r.id = v_rider AND sub.rider_id = v_rider;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_rider_rating ON public.reviews;
CREATE TRIGGER reviews_refresh_rider_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_rider_rating();

-- 5) submit_review SECURITY DEFINER ----------------------------
CREATE OR REPLACE FUNCTION public.submit_review(
  p_order_code text,
  p_rating int,
  p_feedback text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_order public.orders;
  v_review_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be 1..5';
  END IF;
  IF p_feedback IS NOT NULL AND length(p_feedback) > 1000 THEN
    RAISE EXCEPTION 'Feedback too long';
  END IF;

  SELECT * INTO v_order FROM public.orders
   WHERE order_code = upper(p_order_code) LIMIT 1;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.customer_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your order';
  END IF;
  IF v_order.status <> 'delivered' THEN
    RAISE EXCEPTION 'Only delivered orders can be reviewed';
  END IF;
  IF v_order.rider_id IS NULL THEN
    RAISE EXCEPTION 'No rider on this order';
  END IF;

  INSERT INTO public.reviews(order_id, rider_id, customer_user_id, rating, feedback)
  VALUES (v_order.id, v_order.rider_id, auth.uid(), p_rating, NULLIF(trim(coalesce(p_feedback,'')),''))
  ON CONFLICT (order_id) DO UPDATE
     SET rating = EXCLUDED.rating, feedback = EXCLUDED.feedback
  RETURNING id INTO v_review_id;

  PERFORM public.log_audit_event('review.submitted', 'order', v_order.id::text,
    jsonb_build_object('rating', p_rating, 'order_code', v_order.order_code));

  RETURN v_review_id;
END;
$$;

-- 6) get_my_orders ---------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id uuid,
  order_code text,
  pickup_location text,
  drop_location text,
  item_type text,
  delivery_type text,
  status text,
  created_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_at timestamptz,
  rider_name text,
  rider_id uuid,
  review_rating smallint,
  review_feedback text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    o.id, o.order_code, o.pickup_location, o.drop_location,
    o.item_type, o.delivery_type, o.status, o.created_at, o.delivered_at,
    o.estimated_delivery_at,
    r.name AS rider_name, o.rider_id,
    rv.rating AS review_rating, rv.feedback AS review_feedback
  FROM public.orders o
  LEFT JOIN public.riders r ON r.id = o.rider_id
  LEFT JOIN public.reviews rv ON rv.order_id = o.id
  WHERE o.customer_user_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

-- 7) Updated create_guest_order: now auto-links auth.uid() when present
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_customer_name text,
  p_customer_phone text,
  p_pickup_location text,
  p_drop_location text,
  p_item_type text,
  p_delivery_type text,
  p_notes text DEFAULT NULL,
  p_client_id text DEFAULT NULL
) RETURNS TABLE(id uuid, order_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_id uuid;
  v_code text;
  v_eta timestamptz;
  v_rl jsonb;
  v_identifier text;
  v_uid uuid := auth.uid();
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 OR length(p_customer_name) > 80 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) < 7 OR length(p_customer_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;
  IF p_pickup_location IS NULL OR length(trim(p_pickup_location)) < 3 OR length(p_pickup_location) > 200 THEN
    RAISE EXCEPTION 'Invalid pickup';
  END IF;
  IF p_drop_location IS NULL OR length(trim(p_drop_location)) < 3 OR length(p_drop_location) > 200 THEN
    RAISE EXCEPTION 'Invalid drop';
  END IF;
  IF p_item_type IS NULL OR length(p_item_type) > 40 THEN
    RAISE EXCEPTION 'Invalid item type';
  END IF;
  IF p_delivery_type NOT IN ('emergency','sameday') THEN
    RAISE EXCEPTION 'Invalid delivery type';
  END IF;
  IF p_notes IS NOT NULL AND length(p_notes) > 500 THEN
    RAISE EXCEPTION 'Notes too long';
  END IF;

  v_identifier := 'phone:' || trim(p_customer_phone) || coalesce(':' || p_client_id, '');
  v_rl := public.check_rate_limit('create_order', v_identifier, 5, 600);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Too many orders. Please wait % seconds before trying again.',
      (v_rl->>'retry_after_seconds')::int
      USING ERRCODE = 'too_many_connections';
  END IF;

  v_eta := CASE
    WHEN p_delivery_type = 'emergency' THEN now() + interval '60 minutes'
    ELSE now() + interval '8 hours'
  END;

  INSERT INTO public.orders (
    customer_name, customer_phone, pickup_location, drop_location,
    item_type, delivery_type, notes, estimated_delivery_at, customer_user_id
  )
  VALUES (
    trim(p_customer_name), trim(p_customer_phone), trim(p_pickup_location),
    trim(p_drop_location), p_item_type, p_delivery_type, p_notes, v_eta, v_uid
  )
  RETURNING orders.id, orders.order_code INTO v_id, v_code;

  PERFORM public.record_rate_attempt('create_order', v_identifier, true, NULL);
  RETURN QUERY SELECT v_id, v_code;
END;
$$;
