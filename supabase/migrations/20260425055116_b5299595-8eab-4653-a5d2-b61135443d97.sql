-- Pin search_path on remaining functions
create or replace function public.generate_order_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  exists_check int;
begin
  loop
    code := 'ON-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    select count(*) into exists_check from public.orders where order_code = code;
    exit when exists_check = 0;
  end loop;
  return code;
end;
$$;

create or replace function public.set_order_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_code is null or new.order_code = '' then
    new.order_code := public.generate_order_code();
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at := now(); return new; end;
$$;