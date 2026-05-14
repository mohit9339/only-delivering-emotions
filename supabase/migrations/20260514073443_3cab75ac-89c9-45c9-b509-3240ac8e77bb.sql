
-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_type, target_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_logs(actor_user_id, actor_email, action, target_type, target_id, metadata)
  VALUES (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_metadata);
END;
$$;

-- ============ NOTIFICATION OUTBOX ============
CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',     -- pending | sending | sent | failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX idx_notif_outbox_status ON public.notification_outbox (status, created_at);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read outbox"
  ON public.notification_outbox FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_channel text,
  p_recipient text,
  p_subject text,
  p_template text,
  p_payload jsonb
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_recipient IS NULL OR length(trim(p_recipient)) = 0 THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notification_outbox(channel, recipient, subject, template, payload)
  VALUES (coalesce(p_channel,'email'), trim(p_recipient), p_subject, p_template, coalesce(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Dispatcher claim/mark functions (called via service role from server route)
CREATE OR REPLACE FUNCTION public.claim_pending_notifications(p_limit int DEFAULT 20)
RETURNS SETOF public.notification_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH cte AS (
    SELECT id FROM public.notification_outbox
    WHERE status = 'pending' AND attempts < 5
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(100, p_limit))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notification_outbox o
     SET status = 'sending', attempts = attempts + 1, updated_at = now()
    FROM cte
   WHERE o.id = cte.id
  RETURNING o.*;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_sent(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  UPDATE public.notification_outbox
     SET status = 'sent', sent_at = now(), updated_at = now(), last_error = NULL
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_failed(p_id uuid, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE public.notification_outbox
     SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
         last_error = left(coalesce(p_error,''), 1000),
         updated_at = now()
   WHERE id = p_id;
END;
$$;

-- ============ ORDER LIFECYCLE TRIGGER ============
CREATE OR REPLACE FUNCTION public.audit_and_notify_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_subject text;
  v_template text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'order.created', 'order', NEW.id::text,
            jsonb_build_object('order_code', NEW.order_code, 'delivery_type', NEW.delivery_type));
    PERFORM public.enqueue_notification(
      'email', NEW.customer_phone, -- phone fallback if no email; dispatcher will skip non-email
      'Your ONLY order ' || NEW.order_code || ' is confirmed',
      'order_created',
      jsonb_build_object(
        'order_code', NEW.order_code,
        'customer_name', NEW.customer_name,
        'pickup', NEW.pickup_location,
        'drop', NEW.drop_location,
        'delivery_type', NEW.delivery_type,
        'eta', NEW.estimated_delivery_at
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      VALUES (auth.uid(), 'order.status_changed', 'order', NEW.id::text,
              jsonb_build_object('order_code', NEW.order_code, 'from', OLD.status, 'to', NEW.status));

      v_subject := 'Order ' || NEW.order_code || ' update: ' || NEW.status;
      v_template := 'order_status_' || NEW.status;
      v_payload := jsonb_build_object(
        'order_code', NEW.order_code,
        'customer_name', NEW.customer_name,
        'status', NEW.status,
        'pickup', NEW.pickup_location,
        'drop', NEW.drop_location
      );
      PERFORM public.enqueue_notification('email', NEW.customer_phone, v_subject, v_template, v_payload);
    END IF;

    IF NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
      INSERT INTO public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      VALUES (auth.uid(), 'order.rider_assigned', 'order', NEW.id::text,
              jsonb_build_object('order_code', NEW.order_code, 'rider_id', NEW.rider_id));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_notify_order ON public.orders;
CREATE TRIGGER trg_audit_notify_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_and_notify_order();

-- ============ RIDER LIFECYCLE TRIGGER ============
CREATE OR REPLACE FUNCTION public.audit_and_notify_rider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(),
            'rider.' || NEW.status,
            'rider', NEW.id::text,
            jsonb_build_object('name', NEW.name, 'reason', NEW.rejection_reason));

    IF NEW.email IS NOT NULL THEN
      IF NEW.status = 'approved' THEN
        PERFORM public.enqueue_notification(
          'email', NEW.email,
          'You are approved to ride with ONLY',
          'rider_approved',
          jsonb_build_object('name', NEW.name)
        );
      ELSIF NEW.status = 'rejected' THEN
        PERFORM public.enqueue_notification(
          'email', NEW.email,
          'Update on your ONLY rider application',
          'rider_rejected',
          jsonb_build_object('name', NEW.name, 'reason', NEW.rejection_reason)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_notify_rider ON public.riders;
CREATE TRIGGER trg_audit_notify_rider
AFTER UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.audit_and_notify_rider();

-- ============ ANALYTICS RPC ============
CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_days int DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_days int := GREATEST(1, LEAST(90, p_days));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH
  totals AS (
    SELECT
      count(*) FILTER (WHERE created_at >= v_since)               AS orders_window,
      count(*) FILTER (WHERE status = 'delivered' AND created_at >= v_since) AS delivered_window,
      count(*) FILTER (WHERE status = 'cancelled' AND created_at >= v_since) AS cancelled_window,
      count(*) FILTER (WHERE created_at::date = current_date)     AS orders_today,
      count(*) FILTER (WHERE delivery_type = 'emergency' AND created_at >= v_since) AS emergency_window
    FROM public.orders
  ),
  by_status AS (
    SELECT jsonb_object_agg(status, n) AS data FROM (
      SELECT status, count(*) AS n
        FROM public.orders WHERE created_at >= v_since
      GROUP BY status
    ) s
  ),
  daily AS (
    SELECT jsonb_agg(jsonb_build_object('day', day, 'count', n) ORDER BY day) AS data FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*) AS n
        FROM public.orders WHERE created_at >= v_since
      GROUP BY 1
      ORDER BY 1
    ) d
  ),
  top_riders AS (
    SELECT jsonb_agg(jsonb_build_object('rider_id', rider_id, 'name', name, 'delivered', n) ORDER BY n DESC) AS data FROM (
      SELECT o.rider_id, r.name, count(*) AS n
        FROM public.orders o JOIN public.riders r ON r.id = o.rider_id
       WHERE o.status = 'delivered' AND o.delivered_at >= v_since
       GROUP BY o.rider_id, r.name
       ORDER BY n DESC
       LIMIT 10
    ) t
  ),
  rider_counts AS (
    SELECT
      count(*) FILTER (WHERE status = 'pending')  AS pending_riders,
      count(*) FILTER (WHERE status = 'approved') AS approved_riders,
      count(*) FILTER (WHERE status = 'rejected') AS rejected_riders
    FROM public.riders
  ),
  avg_dur AS (
    SELECT EXTRACT(EPOCH FROM avg(delivered_at - created_at))::int AS avg_seconds
      FROM public.orders WHERE status = 'delivered' AND delivered_at >= v_since
  )
  SELECT jsonb_build_object(
    'window_days', v_days,
    'totals', to_jsonb(totals.*),
    'revenue_estimate', (totals.delivered_window * 60 + totals.emergency_window * 40),
    'by_status', coalesce((SELECT data FROM by_status), '{}'::jsonb),
    'daily', coalesce((SELECT data FROM daily), '[]'::jsonb),
    'top_riders', coalesce((SELECT data FROM top_riders), '[]'::jsonb),
    'riders', to_jsonb(rider_counts.*),
    'avg_delivery_seconds', (SELECT avg_seconds FROM avg_dur)
  )
  INTO v_result
  FROM totals, rider_counts;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_notifications(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_notification_sent(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_notification_failed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_notifications(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_failed(uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics(int) TO authenticated;
