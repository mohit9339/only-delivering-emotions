-- =========================================================================
-- Phase 2: Live Operations — rider geolocation + public live mirror
-- =========================================================================

-- Latest known position per rider (one row per rider, upserted)
CREATE TABLE IF NOT EXISTS public.rider_locations (
  rider_id     uuid PRIMARY KEY REFERENCES public.riders(id) ON DELETE CASCADE,
  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  accuracy_m   double precision,
  heading_deg  double precision,
  speed_mps    double precision,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage own location"
  ON public.rider_locations
  FOR ALL
  TO authenticated
  USING (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  )
  WITH CHECK (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins read all rider locations"
  ON public.rider_locations
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public PII-safe mirror: only rows tied to an ACTIVE order (non-terminal).
-- Keyed by order_code so tracking page can subscribe with no auth.
CREATE TABLE IF NOT EXISTS public.order_live_locations (
  order_id    uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code  text NOT NULL UNIQUE,
  rider_id    uuid NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  heading_deg double precision,
  speed_mps   double precision,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_live_locations ENABLE ROW LEVEL SECURITY;

-- Public read is safe: contains only coordinates + code, no PII.
CREATE POLICY "Public can read live order locations"
  ON public.order_live_locations
  FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_order_live_locations_rider
  ON public.order_live_locations(rider_id);

-- =========================================================================
-- RPC: upsert_rider_location
--   Called by the rider client every ~15s (Balanced).
--   Validates input, rate-limits, updates rider_locations,
--   and mirrors to order_live_locations for each active order.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.upsert_rider_location(
  p_lat         double precision,
  p_lng         double precision,
  p_accuracy_m  double precision DEFAULT NULL,
  p_heading_deg double precision DEFAULT NULL,
  p_speed_mps   double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_rider_id uuid;
  v_rl       jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate coordinates
  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90  OR p_lat > 90
     OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  SELECT id INTO v_rider_id
    FROM public.riders
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_rider_id IS NULL THEN
    RAISE EXCEPTION 'No rider profile for current user';
  END IF;

  -- Rate limit: 30 writes / 60s / rider (~1 every 2s ceiling, normal cadence is 15s)
  v_rl := public.check_rate_limit('rider_location', v_rider_id::text, 30, 60);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Location updates throttled. Retry in % seconds.',
      (v_rl->>'retry_after_seconds')::int
      USING ERRCODE = 'too_many_connections';
  END IF;

  INSERT INTO public.rider_locations
    (rider_id, lat, lng, accuracy_m, heading_deg, speed_mps, updated_at)
  VALUES
    (v_rider_id, p_lat, p_lng, p_accuracy_m, p_heading_deg, p_speed_mps, now())
  ON CONFLICT (rider_id) DO UPDATE SET
    lat         = EXCLUDED.lat,
    lng         = EXCLUDED.lng,
    accuracy_m  = EXCLUDED.accuracy_m,
    heading_deg = EXCLUDED.heading_deg,
    speed_mps   = EXCLUDED.speed_mps,
    updated_at  = now();

  -- Mirror to PII-safe public table for each active assigned order
  INSERT INTO public.order_live_locations
    (order_id, order_code, rider_id, lat, lng, heading_deg, speed_mps, updated_at)
  SELECT o.id, o.order_code, v_rider_id, p_lat, p_lng, p_heading_deg, p_speed_mps, now()
    FROM public.orders o
   WHERE o.rider_id = v_rider_id
     AND o.status IN ('assigned','picked','in_transit')
  ON CONFLICT (order_id) DO UPDATE SET
    lat         = EXCLUDED.lat,
    lng         = EXCLUDED.lng,
    heading_deg = EXCLUDED.heading_deg,
    speed_mps   = EXCLUDED.speed_mps,
    updated_at  = now();

  PERFORM public.record_rate_attempt('rider_location', v_rider_id::text, true, NULL);
END;
$$;

-- =========================================================================
-- RPC: get_order_live_location
--   Public, rate-limited fetch of the latest rider position for an order.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_order_live_location(
  p_code      text,
  p_client_id text DEFAULT NULL
)
RETURNS TABLE(
  order_code  text,
  lat         double precision,
  lng         double precision,
  heading_deg double precision,
  speed_mps   double precision,
  updated_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_rl jsonb;
  v_id text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 4 OR length(p_code) > 32 THEN
    RAISE EXCEPTION 'Invalid order code';
  END IF;

  v_id := coalesce(p_client_id, 'anon') || ':' || upper(p_code);
  v_rl := public.check_rate_limit('live_location_lookup', v_id, 120, 300);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Too many lookups. Retry in % seconds.',
      (v_rl->>'retry_after_seconds')::int
      USING ERRCODE = 'too_many_connections';
  END IF;

  RETURN QUERY
  SELECT l.order_code, l.lat, l.lng, l.heading_deg, l.speed_mps, l.updated_at
    FROM public.order_live_locations l
   WHERE l.order_code = upper(p_code)
   LIMIT 1;
END;
$$;

-- =========================================================================
-- Realtime: publish the public live-location mirror (PII-safe)
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'order_live_locations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.order_live_locations';
  END IF;
END $$;

ALTER TABLE public.order_live_locations REPLICA IDENTITY FULL;