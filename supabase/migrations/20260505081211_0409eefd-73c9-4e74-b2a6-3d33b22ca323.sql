-- Ensure pgcrypto is available and use a search_path that finds gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_secure_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
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

    rand_bytes := extensions.gen_random_bytes(6);
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