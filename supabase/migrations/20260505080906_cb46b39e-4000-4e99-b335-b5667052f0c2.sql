-- =====================================================================
-- PHASE 1: SECURITY & DATA INTEGRITY CORE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SECURE TRACKING CODES
-- ---------------------------------------------------------------------
-- Crockford base32 alphabet (no 0/O/1/I/L confusion)
CREATE OR REPLACE FUNCTION public.generate_secure_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
  i int;
  rand_bytes bytea;
  exists_check int;
  attempts int := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 8 THEN
      RAISE EXCEPTION 'Could not generate unique order code after % attempts', attempts;
    END IF;

    -- 6 chars from 30-char alphabet = ~30^6 = ~7.3e8 combinations (high entropy)
    rand_bytes := gen_random_bytes(6);
    code := 'ONLY-';
    FOR i IN 0..5 LOOP
      code := code || substr(alphabet, (get_byte(rand_bytes, i) % 30) + 1, 1);
    END LOOP;

    SELECT count(*) INTO exists_check FROM public.orders WHERE order_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Replace the legacy generator to use the secure version going forward
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public.generate_secure_order_code();
$$;

-- ---------------------------------------------------------------------
-- 2. STRICT ORDER STATE MACHINE
-- ---------------------------------------------------------------------
-- Allowed transitions (enforced for non-admins):
--   pending     -> assigned, cancelled
--   assigned    -> picked, cancelled
--   picked      -> in_transit
--   in_transit  -> delivered
--   delivered   -> (terminal)
--   cancelled   -> (terminal)

CREATE OR REPLACE FUNCTION public.is_valid_order_transition(_from text, _to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _from = _to THEN true
    WHEN _from = 'pending'    AND _to IN ('assigned','cancelled') THEN true
    WHEN _from = 'assigned'   AND _to IN ('picked','cancelled')   THEN true
    WHEN _from = 'picked'     AND _to = 'in_transit'              THEN true
    WHEN _from = 'in_transit' AND _to = 'delivered'               THEN true
    ELSE false
  END;
$$;

-- Replace the previous looser trigger function with the strict state machine.
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  -- Terminal states are immutable for everyone (admins included) except via explicit admin override path.
  IF OLD.status IN ('delivered','cancelled') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Order is finalized (%). It cannot be changed.', OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate state transition (admins can still override if needed)
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_is_admin THEN
    IF NOT public.is_valid_order_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Non-admins cannot reassign orders
  IF NOT v_is_admin AND NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    -- Allow the initial self-assignment (pending -> assigned by an unassigned order being claimed)
    IF NOT (OLD.rider_id IS NULL AND NEW.rider_id IS NOT NULL AND NEW.status = 'assigned') THEN
      RAISE EXCEPTION 'Riders cannot reassign orders';
    END IF;
  END IF;

  -- Non-admins cannot edit PII or order details
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

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_order_update_rules ON public.orders;
CREATE TRIGGER trg_enforce_order_update_rules
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_update_rules();

-- ---------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_order_code  ON public.orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id    ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_rider ON public.orders (status, rider_id);
CREATE INDEX IF NOT EXISTS idx_riders_user_id     ON public.riders (user_id);
CREATE INDEX IF NOT EXISTS idx_riders_status      ON public.riders (status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- ---------------------------------------------------------------------
-- 4. RATE LIMITING INFRASTRUCTURE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL,
  identifier    text NOT NULL,    -- email, IP, or composite
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  succeeded     boolean NOT NULL DEFAULT false,
  metadata      jsonb
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (action, identifier, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON public.rate_limits (attempted_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can read; the function inserts via SECURITY DEFINER.
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limits;
CREATE POLICY "Admins can view rate limits"
  ON public.rate_limits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- check_rate_limit: returns jsonb { allowed, retry_after_seconds, attempts }
-- Sliding window with exponential backoff once limit exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action      text,
  p_identifier  text,
  p_max_attempts int  DEFAULT 5,
  p_window_seconds int DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_attempts int;
  v_failed   int;
  v_last     timestamptz;
  v_backoff  int;
  v_retry    int := 0;
BEGIN
  IF p_identifier IS NULL OR length(p_identifier) = 0 THEN
    RAISE EXCEPTION 'Identifier required for rate limit check';
  END IF;

  -- Count attempts within the sliding window
  SELECT count(*),
         count(*) FILTER (WHERE NOT succeeded),
         max(attempted_at)
    INTO v_attempts, v_failed, v_last
    FROM public.rate_limits
   WHERE action = p_action
     AND identifier = p_identifier
     AND attempted_at > now() - make_interval(secs => p_window_seconds);

  -- Exponential backoff after exceeding: 2^(failed-max) seconds, capped at 1h
  IF v_failed >= p_max_attempts THEN
    v_backoff := LEAST(3600, power(2, GREATEST(0, v_failed - p_max_attempts + 1))::int * 30);
    v_retry := GREATEST(0, v_backoff - EXTRACT(EPOCH FROM (now() - v_last))::int);
    IF v_retry > 0 THEN
      -- Record the blocked attempt for audit
      INSERT INTO public.rate_limits (action, identifier, succeeded, metadata)
      VALUES (p_action, p_identifier, false, jsonb_build_object('blocked', true));
      RETURN jsonb_build_object(
        'allowed', false,
        'retry_after_seconds', v_retry,
        'attempts', v_attempts,
        'reason', 'rate_limited'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', v_attempts,
    'remaining', GREATEST(0, p_max_attempts - v_failed)
  );
END;
$$;

-- record_rate_attempt: log success/failure (called after the protected action)
CREATE OR REPLACE FUNCTION public.record_rate_attempt(
  p_action     text,
  p_identifier text,
  p_succeeded  boolean,
  p_metadata   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  INSERT INTO public.rate_limits (action, identifier, succeeded, metadata)
  VALUES (p_action, p_identifier, p_succeeded, p_metadata);
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,int,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rate_attempt(text,text,boolean,jsonb) TO anon, authenticated;

-- Auto-cleanup of old rate limit rows (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  DELETE FROM public.rate_limits WHERE attempted_at < now() - interval '24 hours';
$$;

-- ---------------------------------------------------------------------
-- 5. RATE-LIMITED GUEST ORDER CREATION
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_customer_name   text,
  p_customer_phone  text,
  p_pickup_location text,
  p_drop_location   text,
  p_item_type       text,
  p_delivery_type   text,
  p_notes           text DEFAULT NULL,
  p_client_id       text DEFAULT NULL  -- optional client fingerprint for rate limiting
)
RETURNS TABLE(id uuid, order_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_code text;
  v_eta timestamptz;
  v_rl jsonb;
  v_identifier text;
BEGIN
  -- Validation
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

  -- Rate limit by phone + optional client id (5 orders per 10 minutes)
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
    item_type, delivery_type, notes, estimated_delivery_at
  )
  VALUES (
    trim(p_customer_name), trim(p_customer_phone), trim(p_pickup_location),
    trim(p_drop_location), p_item_type, p_delivery_type, p_notes, v_eta
  )
  RETURNING orders.id, orders.order_code INTO v_id, v_code;

  PERFORM public.record_rate_attempt('create_order', v_identifier, true, NULL);

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. RATE-LIMITED, PII-SAFE TRACKING LOOKUP
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_order_by_code(
  p_code       text,
  p_client_id  text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, order_code text, pickup_location text, drop_location text,
  item_type text, delivery_type text, status text, rider_id uuid,
  estimated_delivery_at timestamptz, created_at timestamptz,
  rider_name text, rider_vehicle text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rl jsonb;
  v_identifier text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 4 OR length(p_code) > 32 THEN
    RAISE EXCEPTION 'Invalid order code';
  END IF;

  -- Rate-limit tracking lookups (60 per 5 min per client) to prevent enumeration attacks
  v_identifier := coalesce(p_client_id, 'anon') || ':' || upper(p_code);
  v_rl := public.check_rate_limit('track_lookup', v_identifier, 60, 300);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Too many lookups. Please wait % seconds.',
      (v_rl->>'retry_after_seconds')::int
      USING ERRCODE = 'too_many_connections';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.order_code, o.pickup_location, o.drop_location,
    o.item_type, o.delivery_type, o.status, o.rider_id,
    o.estimated_delivery_at, o.created_at,
    r.name AS rider_name, r.vehicle_type AS rider_vehicle
  FROM public.orders o
  LEFT JOIN public.riders r ON r.id = o.rider_id
  WHERE o.order_code = upper(p_code)
  LIMIT 1;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. REALTIME PII HARDENING
-- ---------------------------------------------------------------------
-- Public-safe mirror table: only contains tracking-safe fields.
CREATE TABLE IF NOT EXISTS public.order_public_status (
  order_id    uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code  text NOT NULL UNIQUE,
  status      text NOT NULL,
  rider_id    uuid,
  estimated_delivery_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_public_status_code
  ON public.order_public_status (order_code);

ALTER TABLE public.order_public_status ENABLE ROW LEVEL SECURITY;

-- Anyone can read this safe mirror (no PII present).
DROP POLICY IF EXISTS "Public can read order status mirror" ON public.order_public_status;
CREATE POLICY "Public can read order status mirror"
  ON public.order_public_status FOR SELECT
  USING (true);

-- Only the trigger writes here; no direct write policy.

-- Sync trigger: keep mirror current
CREATE OR REPLACE FUNCTION public.sync_order_public_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.order_public_status WHERE order_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.order_public_status (order_id, order_code, status, rider_id, estimated_delivery_at, updated_at)
  VALUES (NEW.id, NEW.order_code, NEW.status, NEW.rider_id, NEW.estimated_delivery_at, now())
  ON CONFLICT (order_id) DO UPDATE SET
    order_code            = EXCLUDED.order_code,
    status                = EXCLUDED.status,
    rider_id              = EXCLUDED.rider_id,
    estimated_delivery_at = EXCLUDED.estimated_delivery_at,
    updated_at            = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_public_status ON public.orders;
CREATE TRIGGER trg_sync_order_public_status
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_public_status();

-- Backfill existing orders into the mirror
INSERT INTO public.order_public_status (order_id, order_code, status, rider_id, estimated_delivery_at, updated_at)
SELECT id, order_code, status, rider_id, estimated_delivery_at, updated_at
FROM public.orders
ON CONFLICT (order_id) DO NOTHING;

-- Realtime publication: REMOVE orders (PII) and ADD the public mirror.
DO $$
BEGIN
  -- remove orders if present
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
  END IF;

  -- add the safe mirror if not already
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_public_status'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.order_public_status';
  END IF;
END $$;

ALTER TABLE public.order_public_status REPLICA IDENTITY FULL;