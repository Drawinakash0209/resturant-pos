-- ============================================================
-- Street Bites — Supabase Setup Script
-- Run this in your Supabase project's SQL editor
-- ============================================================

-- 1. Profiles table (extends auth.users with role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('admin', 'cashier')),
  created_at timestamptz default now()
);

-- Auto-create profile row on new signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'cashier'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Menu items table
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_items_updated_at on public.menu_items;
create trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute procedure public.set_updated_at();

-- 3. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;

-- Profiles: users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Menu items: authenticated users can read
create policy "Authenticated users can read menu items"
  on public.menu_items for select
  to authenticated
  using (true);

-- Menu items: only admins can insert/update/delete
create policy "Admins can insert menu items"
  on public.menu_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update menu items"
  on public.menu_items for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete menu items"
  on public.menu_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Sample data (optional — remove if you want a clean start)
insert into public.menu_items (name, category, price, stock) values
  ('Samosa',         'Snacks',   15.00,  80),
  ('Vada Pav',       'Snacks',   20.00,  60),
  ('Chai',           'Drinks',   10.00, 200),
  ('Cold Drink',     'Drinks',   30.00,  40),
  ('Biryani',        'Mains',   120.00,  25),
  ('Paneer Roll',    'Mains',    60.00,  30),
  ('Gulab Jamun',    'Desserts', 25.00,   4),
  ('French Fries',   'Sides',    45.00,  18)
on conflict do nothing;

-- ============================================================
-- After running this script:
-- 1. Create users via Supabase Auth (Authentication → Users → Invite)
-- 2. Set role in profiles table manually for the first admin:
--    UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
-- ============================================================

-- 5. Orders and Order Items
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid references auth.users(id),
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null,
  total numeric(10,2) not null,
  token_number integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'closed')),
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity integer not null check (quantity > 0),
  price_at_time numeric(10,2) not null,
  created_at timestamptz default now()
);

-- RLS for orders
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Cashiers can insert and read their own orders (and admins can read all)
create policy "Authenticated users can insert orders"
  on public.orders for insert to authenticated with check (true);
create policy "Users can read orders"
  on public.orders for select to authenticated using (true);
create policy "Authenticated users can update orders"
  on public.orders for update to authenticated using (true);

create policy "Authenticated users can insert order items"
  on public.order_items for insert to authenticated with check (true);
create policy "Users can read order items"
  on public.order_items for select to authenticated using (true);

-- 6. RPC function to process checkout securely
create or replace function public.process_checkout(
  p_subtotal numeric,
  p_tax numeric,
  p_total numeric,
  p_items jsonb
) returns jsonb language plpgsql security definer as $$
declare
  v_order_id uuid;
  v_token_number integer;
  v_item record;
begin
  -- Generate daily sequential token number
  select coalesce(max(token_number), 0) + 1
  into v_token_number
  from public.orders
  where created_at::date = current_date;

  -- Insert order
  insert into public.orders (cashier_id, subtotal, tax, total, token_number, status)
  values (auth.uid(), p_subtotal, p_tax, p_total, v_token_number, 'pending')
  returning id into v_order_id;

  -- Loop through items and record them (no stock deduction)
  for v_item in select * from jsonb_to_recordset(p_items) as x(id uuid, qty int, price numeric) loop
    insert into public.order_items (order_id, menu_item_id, quantity, price_at_time)
    values (v_order_id, v_item.id, v_item.qty, v_item.price);
  end loop;

  return jsonb_build_object('order_id', v_order_id, 'token_number', v_token_number);
end;
$$;

-- ============================================================
-- Run the following to migrate existing orders table if already created:
-- alter table public.orders add column if not exists token_number integer not null default 0;
-- alter table public.orders add column if not exists status text not null default 'pending' check (status in ('pending', 'closed'));
-- create policy "Authenticated users can update orders" on public.orders for update to authenticated using (true);
-- ============================================================

-- 7. RPC function to update an existing order
create or replace function public.update_order(
  p_order_id uuid,
  p_subtotal numeric,
  p_tax numeric,
  p_total numeric,
  p_items jsonb
) returns jsonb language plpgsql security definer as $$
declare
  v_item record;
begin
  -- Update orders table
  update public.orders
  set subtotal = p_subtotal,
      tax = p_tax,
      total = p_total
  where id = p_order_id;

  -- Delete old items
  delete from public.order_items where order_id = p_order_id;

  -- Insert new items
  for v_item in select * from jsonb_to_recordset(p_items) as x(id uuid, qty int, price numeric) loop
    insert into public.order_items (order_id, menu_item_id, quantity, price_at_time)
    values (p_order_id, v_item.id, v_item.qty, v_item.price);
  end loop;

  return jsonb_build_object('order_id', p_order_id);
end;
$$;
