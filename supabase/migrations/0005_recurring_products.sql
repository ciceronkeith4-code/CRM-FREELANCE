-- Recurring services, products, and licenses.

create table recurring_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  service_type text not null check (service_type in ('Hosting','Domain','SSL','Email hosting','Maintenance retainer','Software subscription','Other')),
  provider text,
  description text,
  amount_charged numeric(12,2) not null default 0,
  my_cost numeric(12,2) not null default 0,
  billing_cycle text not null default 'Monthly' check (billing_cycle in ('Monthly','Quarterly','Yearly')),
  next_renewal_date date,
  auto_renew_on_provider boolean not null default false,
  status text not null default 'Active' check (status in ('Active','Paused','Cancelled')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table recurring_services enable row level security;

create policy "recurring_services_select" on recurring_services for select using (user_id = auth.uid());
create policy "recurring_services_insert" on recurring_services for insert with check (user_id = auth.uid());
create policy "recurring_services_update" on recurring_services for update using (user_id = auth.uid());
create policy "recurring_services_delete" on recurring_services for delete using (user_id = auth.uid());

create index recurring_services_user_renewal_idx on recurring_services (user_id, next_renewal_date);
create index recurring_services_client_idx on recurring_services (client_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  current_version text,
  standard_price numeric(12,2) not null default 0,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "products_select" on products for select using (user_id = auth.uid());
create policy "products_insert" on products for insert with check (user_id = auth.uid());
create policy "products_update" on products for update using (user_id = auth.uid());
create policy "products_delete" on products for delete using (user_id = auth.uid());

create index products_user_idx on products (user_id);

-- ============================================================
-- LICENSES
-- ============================================================
create table licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  purchase_date date not null default current_date,
  amount_paid numeric(12,2) not null default 0,
  deployment_url text,
  version_installed text,
  license_key text,
  support_until_date date,
  status text not null default 'Active' check (status in ('Active','Support Expired','Revoked')),
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table licenses enable row level security;

create policy "licenses_select" on licenses for select using (user_id = auth.uid());
create policy "licenses_insert" on licenses for insert with check (user_id = auth.uid());
create policy "licenses_update" on licenses for update using (user_id = auth.uid());
create policy "licenses_delete" on licenses for delete using (user_id = auth.uid());

create index licenses_product_idx on licenses (product_id);
create index licenses_client_idx on licenses (client_id);
