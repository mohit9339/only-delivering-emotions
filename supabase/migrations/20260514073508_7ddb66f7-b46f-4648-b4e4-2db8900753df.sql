
REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_notification(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
