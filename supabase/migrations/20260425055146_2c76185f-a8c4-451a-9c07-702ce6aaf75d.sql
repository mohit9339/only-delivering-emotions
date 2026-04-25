-- Drop the permissive insert policy
drop policy if exists "Anyone can create an order" on public.orders;

-- Validated guest order creator (RPC)
create or replace function public.create_guest_order(
  p_customer_name text,
  p_customer_phone text,
  p_pickup_location text,
  p_drop_location text,
  p_item_type text,
  p_delivery_type text,
  p_notes text default null
)
returns table (id uuid, order_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
  v_eta timestamptz;
begin
  -- Validation
  if p_customer_name is null or length(trim(p_customer_name)) < 2 or length(p_customer_name) > 80 then
    raise exception 'Invalid name';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) < 7 or length(p_customer_phone) > 20 then
    raise exception 'Invalid phone';
  end if;
  if p_pickup_location is null or length(trim(p_pickup_location)) < 3 or length(p_pickup_location) > 200 then
    raise exception 'Invalid pickup';
  end if;
  if p_drop_location is null or length(trim(p_drop_location)) < 3 or length(p_drop_location) > 200 then
    raise exception 'Invalid drop';
  end if;
  if p_item_type is null or length(p_item_type) > 40 then
    raise exception 'Invalid item type';
  end if;
  if p_delivery_type not in ('emergency','sameday') then
    raise exception 'Invalid delivery type';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes too long';
  end if;

  v_eta := case
    when p_delivery_type = 'emergency' then now() + interval '60 minutes'
    else now() + interval '8 hours'
  end;

  insert into public.orders (
    customer_name, customer_phone, pickup_location, drop_location,
    item_type, delivery_type, notes, estimated_delivery_at
  )
  values (
    trim(p_customer_name), trim(p_customer_phone), trim(p_pickup_location),
    trim(p_drop_location), p_item_type, p_delivery_type, p_notes, v_eta
  )
  returning orders.id, orders.order_code into v_id, v_code;

  return query select v_id, v_code;
end;
$$;

grant execute on function public.create_guest_order(text,text,text,text,text,text,text)
  to anon, authenticated;