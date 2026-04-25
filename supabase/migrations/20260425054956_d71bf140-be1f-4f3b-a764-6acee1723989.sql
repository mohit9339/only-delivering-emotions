-- 1. Roles enum + user_roles table
create type public.app_role as enum ('admin', 'rider', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can view all roles"
on public.user_roles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 2. Riders table (auth via phone OTP - user_id links to auth.users)
create table public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  name text not null,
  phone text not null unique,
  email text,
  vehicle_type text not null,
  city text not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.riders enable row level security;

create policy "Riders can view own profile"
on public.riders for select
to authenticated
using (auth.uid() = user_id);

create policy "Riders can update own profile"
on public.riders for update
to authenticated
using (auth.uid() = user_id);

create policy "Riders can insert own profile"
on public.riders for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins manage all riders"
on public.riders for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 3. Orders table - guest-friendly bookings
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  pickup_location text not null,
  drop_location text not null,
  item_type text not null,
  delivery_type text not null check (delivery_type in ('emergency','sameday')),
  status text not null default 'pending' check (status in ('pending','assigned','picked','in_transit','delivered','cancelled')),
  rider_id uuid references public.riders(id) on delete set null,
  notes text,
  estimated_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Anyone (including anon) can create an order
create policy "Anyone can create an order"
on public.orders for insert
to anon, authenticated
with check (true);

-- Anyone can read orders (needed for /track/:code lookup by guests)
-- App layer will filter by order_code; status info is non-sensitive
create policy "Anyone can read orders"
on public.orders for select
to anon, authenticated
using (true);

-- Riders can update orders assigned to them or unassigned (to accept)
create policy "Riders update assignable orders"
on public.orders for update
to authenticated
using (
  public.has_role(auth.uid(), 'rider') and (
    rider_id is null
    or rider_id in (select id from public.riders where user_id = auth.uid())
  )
);

create policy "Admins manage all orders"
on public.orders for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 4. Order code generator: ON- + 6 chars
create or replace function public.generate_order_code()
returns text
language plpgsql
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
as $$
begin
  if new.order_code is null or new.order_code = '' then
    new.order_code := public.generate_order_code();
  end if;
  return new;
end;
$$;

create trigger orders_set_code
before insert on public.orders
for each row execute function public.set_order_code();

-- 5. updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger orders_touch_updated before update on public.orders
for each row execute function public.touch_updated_at();
create trigger riders_touch_updated before update on public.riders
for each row execute function public.touch_updated_at();