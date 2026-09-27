-- ============================================================
-- 0001_core.sql
-- ============================================================
-- Core setup: extensions, business settings, leads, clients.

create extension if not exists "pgcrypto";

-- ============================================================
-- BUSINESS SETTINGS (one row per user)
-- ============================================================
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_name text,
  owner_name text,
  logo_path text,
  email text,
  phone text,
  address text,
  tin text,
  currency text not null default 'PHP',
  payment_instructions text,
  default_downpayment_percent numeric(5,2) not null default 50,
  invoice_prefix text not null default 'INV',
  quote_prefix text not null default 'QT',
  renewal_reminder_days integer not null default 30,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table business_settings enable row level security;

create policy "business_settings_select" on business_settings for select using (user_id = auth.uid());
create policy "business_settings_insert" on business_settings for insert with check (user_id = auth.uid());
create policy "business_settings_update" on business_settings for update using (user_id = auth.uid());
create policy "business_settings_delete" on business_settings for delete using (user_id = auth.uid());

-- ============================================================
-- LEADS
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  company text,
  business_type text,
  email text,
  phone text,
  preferred_contact text check (preferred_contact in ('Messenger','Viber','WhatsApp','Email','Phone','Other')),
  social_link text,
  source text check (source in ('Referral','Facebook','Instagram','LinkedIn','Cold outreach','Walk-in','Website','Other')),
  service_interested_in text check (service_interested_in in ('Website','Website redesign','Web app/System','E-commerce','Maintenance','Other')),
  estimated_value numeric(12,2),
  stage text not null default 'New' check (stage in ('New','Contacted','Interested','Proposal Sent','Negotiating','Won','Lost')),
  next_follow_up_date date,
  lost_reason text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

create policy "leads_select" on leads for select using (user_id = auth.uid());
create policy "leads_insert" on leads for insert with check (user_id = auth.uid());
create policy "leads_update" on leads for update using (user_id = auth.uid());
create policy "leads_delete" on leads for delete using (user_id = auth.uid());

create index leads_user_stage_idx on leads (user_id, stage);
create index leads_user_followup_idx on leads (user_id, next_follow_up_date);

-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  company text,
  business_type text,
  email text,
  phone text,
  preferred_contact text check (preferred_contact in ('Messenger','Viber','WhatsApp','Email','Phone','Other')),
  social_link text,
  address text,
  source text check (source in ('Referral','Facebook','Instagram','LinkedIn','Cold outreach','Walk-in','Website','Other')),
  lead_id uuid references leads(id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

create policy "clients_select" on clients for select using (user_id = auth.uid());
create policy "clients_insert" on clients for insert with check (user_id = auth.uid());
create policy "clients_update" on clients for update using (user_id = auth.uid());
create policy "clients_delete" on clients for delete using (user_id = auth.uid());

create index clients_user_idx on clients (user_id);
create index clients_lead_idx on clients (lead_id);


-- ============================================================
-- 0002_sales.sql
-- ============================================================
-- Quotations and their line items.

create table quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number text,
  client_id uuid references clients(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  discount_type text check (discount_type in ('amount','percent')),
  discount_value numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  issue_date date not null default current_date,
  valid_until_date date,
  terms text,
  status text not null default 'Draft' check (status in ('Draft','Sent','Accepted','Declined','Expired')),
  project_id uuid, -- set once converted to a project (FK added in projects migration)
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  constraint quotations_client_or_lead check (client_id is not null or lead_id is not null),
  unique (user_id, number)
);

alter table quotations enable row level security;

create policy "quotations_select" on quotations for select using (user_id = auth.uid());
create policy "quotations_insert" on quotations for insert with check (user_id = auth.uid());
create policy "quotations_update" on quotations for update using (user_id = auth.uid());
create policy "quotations_delete" on quotations for delete using (user_id = auth.uid());

create index quotations_user_status_idx on quotations (user_id, status);
create index quotations_client_idx on quotations (client_id);
create index quotations_lead_idx on quotations (lead_id);

create table quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quotation_id uuid not null references quotations(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table quotation_line_items enable row level security;

create policy "quotation_line_items_select" on quotation_line_items for select using (user_id = auth.uid());
create policy "quotation_line_items_insert" on quotation_line_items for insert with check (user_id = auth.uid());
create policy "quotation_line_items_update" on quotation_line_items for update using (user_id = auth.uid());
create policy "quotation_line_items_delete" on quotation_line_items for delete using (user_id = auth.uid());

create index quotation_line_items_quotation_idx on quotation_line_items (quotation_id);


-- ============================================================
-- 0003_projects.sql
-- ============================================================
-- Projects and everything nested under a project.

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  project_type text check (project_type in ('Website','Website redesign','Web app/System','E-commerce','Mobile app','Maintenance','Other')),
  pricing_model text not null default 'Fixed price' check (pricing_model in ('Fixed price','Hourly','Retainer')),
  base_price numeric(12,2) not null default 0,
  hourly_rate numeric(12,2),
  estimated_hours numeric(8,2),
  status text not null default 'Planning' check (status in ('Planning','In Progress','On Hold','For Review','Completed','Cancelled')),
  start_date date,
  deadline date,
  completion_date date,
  warranty_end_date date,
  tech_stack text[] not null default '{}',
  live_url text,
  staging_url text,
  repository_url text,
  hosting_provider text,
  domain_registrar text,
  quotation_id uuid references quotations(id) on delete set null,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "projects_select" on projects for select using (user_id = auth.uid());
create policy "projects_insert" on projects for insert with check (user_id = auth.uid());
create policy "projects_update" on projects for update using (user_id = auth.uid());
create policy "projects_delete" on projects for delete using (user_id = auth.uid());

create index projects_user_status_idx on projects (user_id, status);
create index projects_client_idx on projects (client_id);

alter table quotations
  add constraint quotations_project_fkey foreign key (project_id) references projects(id) on delete set null;

-- ============================================================
-- PROJECT ACCESS INFO
-- ============================================================
create table project_access_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  url text,
  username text,
  credential_location text,
  created_at timestamptz not null default now()
);

alter table project_access_info enable row level security;

create policy "project_access_info_select" on project_access_info for select using (user_id = auth.uid());
create policy "project_access_info_insert" on project_access_info for insert with check (user_id = auth.uid());
create policy "project_access_info_update" on project_access_info for update using (user_id = auth.uid());
create policy "project_access_info_delete" on project_access_info for delete using (user_id = auth.uid());

create index project_access_info_project_idx on project_access_info (project_id);

-- ============================================================
-- MILESTONES
-- ============================================================
create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'Pending' check (status in ('Pending','Invoiced','Paid')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;

create policy "milestones_select" on milestones for select using (user_id = auth.uid());
create policy "milestones_insert" on milestones for insert with check (user_id = auth.uid());
create policy "milestones_update" on milestones for update using (user_id = auth.uid());
create policy "milestones_delete" on milestones for delete using (user_id = auth.uid());

create index milestones_project_idx on milestones (project_id);

-- ============================================================
-- CHANGE REQUESTS
-- ============================================================
create table change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  date_requested date not null default current_date,
  requested_via text check (requested_via in ('Messenger','Viber','Email','Call','Meeting','Other')),
  extra_charge numeric(12,2) not null default 0,
  estimated_hours numeric(8,2),
  status text not null default 'Requested' check (status in ('Requested','Approved','In Progress','Done','Declined')),
  date_completed date,
  created_at timestamptz not null default now()
);

alter table change_requests enable row level security;

create policy "change_requests_select" on change_requests for select using (user_id = auth.uid());
create policy "change_requests_insert" on change_requests for insert with check (user_id = auth.uid());
create policy "change_requests_update" on change_requests for update using (user_id = auth.uid());
create policy "change_requests_delete" on change_requests for delete using (user_id = auth.uid());

create index change_requests_project_idx on change_requests (project_id);

-- ============================================================
-- TIME LOGS
-- ============================================================
create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  change_request_id uuid references change_requests(id) on delete set null,
  date date not null default current_date,
  hours numeric(6,2) not null default 0,
  description text,
  created_at timestamptz not null default now()
);

alter table time_logs enable row level security;

create policy "time_logs_select" on time_logs for select using (user_id = auth.uid());
create policy "time_logs_insert" on time_logs for insert with check (user_id = auth.uid());
create policy "time_logs_update" on time_logs for update using (user_id = auth.uid());
create policy "time_logs_delete" on time_logs for delete using (user_id = auth.uid());

create index time_logs_project_idx on time_logs (project_id);


-- ============================================================
-- 0004_money.sql
-- ============================================================
-- Invoices, invoice line items, and payments.

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number text,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  discount_type text check (discount_type in ('amount','percent')),
  discount_value numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  status text not null default 'Draft' check (status in ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

alter table invoices enable row level security;

create policy "invoices_select" on invoices for select using (user_id = auth.uid());
create policy "invoices_insert" on invoices for insert with check (user_id = auth.uid());
create policy "invoices_update" on invoices for update using (user_id = auth.uid());
create policy "invoices_delete" on invoices for delete using (user_id = auth.uid());

create index invoices_user_status_idx on invoices (user_id, status);
create index invoices_client_idx on invoices (client_id);
create index invoices_project_idx on invoices (project_id);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  source_milestone_id uuid references milestones(id) on delete set null,
  source_change_request_id uuid references change_requests(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table invoice_line_items enable row level security;

create policy "invoice_line_items_select" on invoice_line_items for select using (user_id = auth.uid());
create policy "invoice_line_items_insert" on invoice_line_items for insert with check (user_id = auth.uid());
create policy "invoice_line_items_update" on invoice_line_items for update using (user_id = auth.uid());
create policy "invoice_line_items_delete" on invoice_line_items for delete using (user_id = auth.uid());

create index invoice_line_items_invoice_idx on invoice_line_items (invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  date_paid date not null default current_date,
  method text check (method in ('GCash','Maya','Bank transfer','PayPal','Wise','Cash','Other')),
  payment_type text check (payment_type in ('Downpayment','Milestone','Full payment','Change request','Recurring service','License','Other')),
  reference_number text,
  proof_path text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy "payments_select" on payments for select using (user_id = auth.uid());
create policy "payments_insert" on payments for insert with check (user_id = auth.uid());
create policy "payments_update" on payments for update using (user_id = auth.uid());
create policy "payments_delete" on payments for delete using (user_id = auth.uid());

create index payments_user_date_idx on payments (user_id, date_paid);
create index payments_invoice_idx on payments (invoice_id);
create index payments_project_idx on payments (project_id);
create index payments_client_idx on payments (client_id);

-- Keep invoice.status in sync with the payments recorded against it.
create or replace function sync_invoice_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_due date;
  v_status text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  if v_invoice_id is null then
    return new;
  end if;

  select total, due_date, status into v_total, v_due, v_status
  from invoices where id = v_invoice_id;

  if v_status is null or v_status in ('Draft','Cancelled') then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from payments where invoice_id = v_invoice_id;

  if v_paid >= v_total and v_total > 0 then
    v_status := 'Paid';
  elsif v_paid > 0 then
    v_status := 'Partially Paid';
  elsif v_due is not null and v_due < current_date then
    v_status := 'Overdue';
  else
    v_status := 'Sent';
  end if;

  update invoices set status = v_status where id = v_invoice_id;
  return new;
end;
$$;

create trigger payments_sync_invoice_status
after insert or update or delete on payments
for each row execute function sync_invoice_status();


-- ============================================================
-- 0005_recurring_products.sql
-- ============================================================
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


-- ============================================================
-- 0006_expenses_shared.sql
-- ============================================================
-- Expenses, plus the shared polymorphic tables: activities, tasks, files.

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  category text not null check (category in ('Hosting','Domain','Software/Subscription','Hardware','Internet','Transportation','Outsourcing','Other')),
  amount numeric(12,2) not null default 0,
  vendor text,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  receipt_path text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

create policy "expenses_select" on expenses for select using (user_id = auth.uid());
create policy "expenses_insert" on expenses for insert with check (user_id = auth.uid());
create policy "expenses_update" on expenses for update using (user_id = auth.uid());
create policy "expenses_delete" on expenses for delete using (user_id = auth.uid());

create index expenses_user_date_idx on expenses (user_id, date);
create index expenses_project_idx on expenses (project_id);
create index expenses_client_idx on expenses (client_id);

-- ============================================================
-- ACTIVITY TIMELINE (polymorphic: lead, client, or project)
-- ============================================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead','client','project')),
  entity_id uuid not null,
  type text not null check (type in ('Call','Meeting','Message','Email','Note','Agreement')),
  date date not null default current_date,
  content text,
  created_at timestamptz not null default now()
);

alter table activities enable row level security;

create policy "activities_select" on activities for select using (user_id = auth.uid());
create policy "activities_insert" on activities for insert with check (user_id = auth.uid());
create policy "activities_update" on activities for update using (user_id = auth.uid());
create policy "activities_delete" on activities for delete using (user_id = auth.uid());

create index activities_entity_idx on activities (entity_type, entity_id);

-- ============================================================
-- TASKS / REMINDERS
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  entity_type text check (entity_type in ('lead','client','project')),
  entity_id uuid,
  done boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "tasks_select" on tasks for select using (user_id = auth.uid());
create policy "tasks_insert" on tasks for insert with check (user_id = auth.uid());
create policy "tasks_update" on tasks for update using (user_id = auth.uid());
create policy "tasks_delete" on tasks for delete using (user_id = auth.uid());

create index tasks_user_due_idx on tasks (user_id, due_date);
create index tasks_entity_idx on tasks (entity_type, entity_id);

-- ============================================================
-- FILES (attached to a client or project)
-- ============================================================
create table files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('client','project')),
  entity_id uuid not null,
  name text not null,
  storage_path text not null,
  upload_date timestamptz not null default now()
);

alter table files enable row level security;

create policy "files_select" on files for select using (user_id = auth.uid());
create policy "files_insert" on files for insert with check (user_id = auth.uid());
create policy "files_update" on files for update using (user_id = auth.uid());
create policy "files_delete" on files for delete using (user_id = auth.uid());

create index files_entity_idx on files (entity_type, entity_id);


-- ============================================================
-- 0007_numbering.sql
-- ============================================================
-- Auto-generated, gapless document numbers per user/year (e.g. QT-2026-0001, INV-2026-0001).

create table document_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('quotation','invoice')),
  year integer not null,
  last_number integer not null default 0,
  primary key (user_id, doc_type, year)
);

alter table document_counters enable row level security;

create policy "document_counters_select" on document_counters for select using (user_id = auth.uid());

create or replace function next_document_number(p_doc_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date);
  v_next integer;
begin
  insert into document_counters (user_id, doc_type, year, last_number)
  values (auth.uid(), p_doc_type, v_year, 1)
  on conflict (user_id, doc_type, year)
  do update set last_number = document_counters.last_number + 1
  returning last_number into v_next;

  return p_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function quotations_set_number()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prefix text;
begin
  if new.number is null then
    select quote_prefix into v_prefix from business_settings where user_id = new.user_id;
    new.number := next_document_number('quotation', coalesce(v_prefix, 'QT'));
  end if;
  return new;
end;
$$;

create trigger quotations_before_insert_number
before insert on quotations
for each row execute function quotations_set_number();

create or replace function invoices_set_number()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prefix text;
begin
  if new.number is null then
    select invoice_prefix into v_prefix from business_settings where user_id = new.user_id;
    new.number := next_document_number('invoice', coalesce(v_prefix, 'INV'));
  end if;
  return new;
end;
$$;

create trigger invoices_before_insert_number
before insert on invoices
for each row execute function invoices_set_number();


-- ============================================================
-- 0008_computed_views.sql
-- ============================================================
-- Computed values, centralized in views so the frontend never re-implements this math.
-- security_invoker views inherit the RLS of their underlying tables.

create view view_project_totals with (security_invoker = true) as
select
  p.id as project_id,
  p.user_id,
  p.base_price
    + coalesce((
        select sum(cr.extra_charge) from change_requests cr
        where cr.project_id = p.id and cr.status in ('Approved','In Progress','Done')
      ), 0) as contract_value,
  coalesce((select sum(pay.amount) from payments pay where pay.project_id = p.id), 0) as total_paid,
  coalesce((select sum(e.amount) from expenses e where e.project_id = p.id), 0) as direct_costs,
  coalesce((select sum(t.hours) from time_logs t where t.project_id = p.id), 0) as hours_logged,
  case
    when p.deadline is null or p.status in ('Completed','Cancelled') then 'On track'
    when p.deadline < current_date then 'Overdue'
    when p.deadline <= current_date + interval '7 days' then 'Due soon'
    else 'On track'
  end as deadline_status
from projects p;

create view view_project_computed with (security_invoker = true) as
select
  v.*,
  (v.contract_value - v.total_paid) as balance,
  (v.total_paid - v.direct_costs) as profit,
  case
    when v.total_paid <= 0 then 'Unpaid'
    when v.total_paid >= v.contract_value then 'Fully Paid'
    else 'Partially Paid'
  end as payment_status,
  case
    when v.hours_logged > 0 then round(v.total_paid / v.hours_logged, 2)
    else null
  end as effective_hourly_rate
from view_project_totals v;

create view view_client_totals with (security_invoker = true) as
select
  c.id as client_id,
  c.user_id,
  coalesce((select sum(pay.amount) from payments pay where pay.client_id = c.id), 0) as lifetime_value,
  coalesce((
    select sum(greatest(vp.contract_value - vp.total_paid, 0))
    from projects pr
    join view_project_totals vp on vp.project_id = pr.id
    where pr.client_id = c.id
  ), 0) as outstanding_balance,
  (select count(*) from projects pr where pr.client_id = c.id) as project_count,
  (select count(*) from recurring_services rs where rs.client_id = c.id and rs.status = 'Active') as active_recurring_services
from clients c;

-- Invoices with a live-computed status (accounts for "Overdue" even when no
-- payment event has fired since the due date passed) alongside the stored status.
create view view_invoices_computed with (security_invoker = true) as
select
  i.*,
  coalesce((select sum(pay.amount) from payments pay where pay.invoice_id = i.id), 0) as amount_paid,
  case
    when i.status in ('Draft','Cancelled') then i.status
    when coalesce((select sum(pay.amount) from payments pay where pay.invoice_id = i.id), 0) >= i.total and i.total > 0 then 'Paid'
    when coalesce((select sum(pay.amount) from payments pay where pay.invoice_id = i.id), 0) > 0
      and i.due_date is not null and i.due_date < current_date then 'Overdue'
    when coalesce((select sum(pay.amount) from payments pay where pay.invoice_id = i.id), 0) > 0 then 'Partially Paid'
    when i.due_date is not null and i.due_date < current_date then 'Overdue'
    else 'Sent'
  end as computed_status
from invoices i;


-- ============================================================
-- 0009_dashboard.sql
-- ============================================================
-- Dashboard aggregation RPCs. security invoker: scoped by the caller's own auth.uid()
-- through the RLS of the underlying tables, same as any other query.

create view view_payment_income_category with (security_invoker = true) as
select
  p.*,
  case
    when pr.project_type is not null then pr.project_type
    when p.payment_type in ('Recurring service','License') then p.payment_type
    else coalesce(p.payment_type, 'Other')
  end as income_category
from payments p
left join projects pr on pr.id = p.project_id;

create or replace function dashboard_stats()
returns table (
  income_this_month numeric,
  income_this_year numeric,
  outstanding_balance numeric,
  overdue_invoice_total numeric,
  net_profit_this_year numeric,
  active_projects integer,
  open_pipeline_value numeric
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    coalesce((select sum(amount) from payments
      where date_paid >= date_trunc('month', current_date)
        and date_paid < date_trunc('month', current_date) + interval '1 month'), 0),
    coalesce((select sum(amount) from payments
      where date_paid >= date_trunc('year', current_date)
        and date_paid < date_trunc('year', current_date) + interval '1 year'), 0),
    coalesce((select sum(greatest(total - amount_paid, 0)) from view_invoices_computed
      where computed_status not in ('Paid','Cancelled','Draft')), 0),
    coalesce((select sum(greatest(total - amount_paid, 0)) from view_invoices_computed
      where computed_status = 'Overdue'), 0),
    coalesce((select sum(amount) from payments
      where date_paid >= date_trunc('year', current_date)
        and date_paid < date_trunc('year', current_date) + interval '1 year'), 0)
    - coalesce((select sum(amount) from expenses
      where date >= date_trunc('year', current_date)
        and date < date_trunc('year', current_date) + interval '1 year'), 0),
    (select count(*)::integer from projects where status not in ('Completed','Cancelled')),
    coalesce((select sum(estimated_value) from leads where stage not in ('Won','Lost')), 0);
$$;

create or replace function dashboard_monthly_income_expense(p_year integer)
returns table (month integer, income numeric, expenses numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select
    m.month,
    coalesce((select sum(amount) from payments
      where extract(year from date_paid) = p_year and extract(month from date_paid) = m.month), 0),
    coalesce((select sum(amount) from expenses
      where extract(year from date) = p_year and extract(month from date) = m.month), 0)
  from generate_series(1, 12) as m(month)
  order by m.month;
$$;

create or replace function dashboard_income_by_category(p_year integer)
returns table (category text, amount numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select income_category, sum(amount)
  from view_payment_income_category
  where extract(year from date_paid) = p_year
  group by income_category
  order by sum(amount) desc;
$$;


-- ============================================================
-- 0010_reports.sql
-- ============================================================
-- Reports RPCs. Every report takes an explicit date range so the frontend's
-- date-range picker maps directly onto these calls.

create or replace function report_income_by_month(p_start date, p_end date)
returns table (month_start date, income numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select date_trunc('month', date_paid)::date, sum(amount)
  from payments
  where date_paid between p_start and p_end
  group by 1
  order by 1;
$$;

create or replace function report_income_by_client(p_start date, p_end date)
returns table (client_id uuid, client_name text, income numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select c.id, c.name, sum(p.amount)
  from payments p
  join clients c on c.id = p.client_id
  where p.date_paid between p_start and p_end
  group by c.id, c.name
  order by sum(p.amount) desc;
$$;

create or replace function report_income_by_service_type(p_start date, p_end date)
returns table (category text, income numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select income_category, sum(amount)
  from view_payment_income_category
  where date_paid between p_start and p_end
  group by income_category
  order by sum(amount) desc;
$$;

create or replace function report_expenses_by_category(p_start date, p_end date)
returns table (category text, amount numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select category, sum(amount)
  from expenses
  where date between p_start and p_end
  group by category
  order by sum(amount) desc;
$$;

create or replace function report_profit(p_start date, p_end date)
returns table (income numeric, expenses numeric, profit numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select
    coalesce((select sum(amount) from payments where date_paid between p_start and p_end), 0),
    coalesce((select sum(amount) from expenses where date between p_start and p_end), 0),
    coalesce((select sum(amount) from payments where date_paid between p_start and p_end), 0)
    - coalesce((select sum(amount) from expenses where date between p_start and p_end), 0);
$$;

create or replace function report_lead_conversion(p_start date, p_end date)
returns table (total_leads integer, won integer, lost integer, conversion_rate numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select
    count(*)::integer,
    count(*) filter (where stage = 'Won')::integer,
    count(*) filter (where stage = 'Lost')::integer,
    case when count(*) > 0
      then round(100.0 * count(*) filter (where stage = 'Won') / count(*), 1)
      else 0
    end
  from leads
  where created_at::date between p_start and p_end;
$$;

create or replace function report_lead_sources(p_start date, p_end date)
returns table (source text, lead_count integer)
language sql
security invoker
set search_path = public
stable
as $$
  select coalesce(source, 'Unspecified'), count(*)::integer
  from leads
  where created_at::date between p_start and p_end
  group by coalesce(source, 'Unspecified')
  order by count(*) desc;
$$;

create or replace function report_top_clients(p_start date, p_end date, p_limit integer default 10)
returns table (client_id uuid, client_name text, total_received numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select c.id, c.name, sum(p.amount)
  from payments p
  join clients c on c.id = p.client_id
  where p.date_paid between p_start and p_end
  group by c.id, c.name
  order by sum(p.amount) desc
  limit p_limit;
$$;

create or replace function report_effective_hourly_rate_by_project(p_start date, p_end date)
returns table (project_id uuid, project_title text, total_paid numeric, hours_logged numeric, effective_hourly_rate numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select
    pr.id,
    pr.title,
    coalesce((select sum(amount) from payments where project_id = pr.id and date_paid between p_start and p_end), 0),
    coalesce((select sum(hours) from time_logs where project_id = pr.id and date between p_start and p_end), 0),
    case when coalesce((select sum(hours) from time_logs where project_id = pr.id and date between p_start and p_end), 0) > 0
      then round(
        coalesce((select sum(amount) from payments where project_id = pr.id and date_paid between p_start and p_end), 0)
        / (select sum(hours) from time_logs where project_id = pr.id and date between p_start and p_end), 2)
      else null
    end
  from projects pr
  where exists (select 1 from time_logs t where t.project_id = pr.id and t.date between p_start and p_end)
  order by pr.title;
$$;


-- ============================================================
-- 0011_sample_data.sql
-- ============================================================
-- "Load sample data" / "Clear sample data" (Settings page). Every row created here
-- is tagged is_sample = true so clearing can never touch the user's real records.

create or replace function seed_sample_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_open uuid;
  v_lead_contacted uuid;
  v_lead_negotiating uuid;
  v_lead_lost uuid;
  v_client_bakery uuid;
  v_client_gym uuid;
  v_client_clinic uuid;
  v_project_bakery uuid;
  v_project_gym uuid;
  v_dp_milestone uuid;
  v_mid_milestone uuid;
  v_final_milestone uuid;
  v_cr uuid;
  v_quotation uuid;
  v_invoice_dp uuid;
  v_invoice_mid uuid;
  v_invoice_gym uuid;
  v_product uuid;
begin
  -- Leads
  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Maria Santos', 'Santos Pastries', 'restaurant', 'maria@santospastries.example', '+63 917 000 0001', 'Messenger', 'Referral', 'Website', 45000, 'New', current_date + 3, 'Wants a simple menu site with online ordering.', true)
  returning id into v_lead_open;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Jun Reyes', 'Reyes Portfolio', 'other', 'jun@example.com', '+63 917 000 0002', 'Email', 'LinkedIn', 'Website', 15000, 'Contacted', current_date - 1, 'Freelance photographer, wants a portfolio site.', true)
  returning id into v_lead_contacted;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Ana Cruz', 'Cruz Realty', 'real estate', 'ana@cruzrealty.example', '+63 917 000 0003', 'Viber', 'Facebook', 'Web app/System', 120000, 'Negotiating', current_date + 5, 'Needs a listings management system.', true)
  returning id into v_lead_negotiating;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, lost_reason, notes, is_sample)
  values ('Paolo Tan', 'Tan Retail', 'retail', 'paolo@example.com', '+63 917 000 0004', 'Phone', 'Cold outreach', 'E-commerce', 80000, 'Lost', 'Went with a cheaper offshore agency.', 'Followed up twice, price was the deciding factor.', true)
  returning id into v_lead_lost;

  -- Clients
  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Liza Bakery', 'Sunrise Bakery', 'restaurant', 'liza@sunrisebakery.example', '+63 917 100 0001', 'Messenger', 'Quezon City, Philippines', 'Referral', array['bakery','ecommerce'], 'Great communicator, pays on time.', true)
  returning id into v_client_bakery;

  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Carlo Mendoza', 'Metro Fitness Gym', 'gym', 'carlo@metrofitness.example', '+63 917 100 0002', 'Viber', 'Makati City, Philippines', 'Walk-in', array['gym','retainer'], 'Long-term maintenance client.', true)
  returning id into v_client_gym;

  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Dr. Ramon Santos', 'Santos Clinic', 'clinic', 'ramon@santosclinic.example', '+63 917 100 0003', 'Email', 'Cebu City, Philippines', 'Referral', array['clinic','license'], 'Bought the appointment system outright.', true)
  returning id into v_client_clinic;

  -- Quotation (for a lead, still open)
  insert into quotations (client_id, lead_id, title, subtotal, total, issue_date, valid_until_date, terms, status, is_sample)
  values (null, v_lead_contacted, 'Portfolio Website Proposal', 15000, 15000, current_date - 5, current_date + 25, '50% downpayment, balance on delivery. Valid for 30 days.', 'Sent', true)
  returning id into v_quotation;

  insert into quotation_line_items (quotation_id, description, quantity, unit_price, line_total, sort_order)
  values
    (v_quotation, 'Portfolio website (up to 5 pages)', 1, 12000, 12000, 0),
    (v_quotation, 'Contact form integration', 1, 3000, 3000, 1);

  -- Project 1: Sunrise Bakery e-commerce site (in progress)
  insert into projects (client_id, title, description, project_type, pricing_model, base_price, status, start_date, deadline, tech_stack, live_url, hosting_provider, domain_registrar, notes, is_sample)
  values (v_client_bakery, 'Bakery E-commerce Website', 'Online ordering site with delivery scheduling.', 'E-commerce', 'Fixed price', 60000, 'In Progress', current_date - 30, current_date + 10, array['React','Supabase','Tailwind'], 'https://sunrisebakery.example', 'Vercel', 'Namecheap', 'Client prefers Messenger updates.', true)
  returning id into v_project_bakery;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Downpayment', 30000, current_date - 30, 'Paid', 0)
  returning id into v_dp_milestone;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Midpoint', 15000, current_date - 5, 'Paid', 1)
  returning id into v_mid_milestone;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Final Turnover', 15000, current_date + 10, 'Pending', 2)
  returning id into v_final_milestone;

  insert into change_requests (project_id, title, description, date_requested, requested_via, extra_charge, estimated_hours, status, date_completed)
  values (v_project_bakery, 'Add gift-wrapping option at checkout', 'Client asked for an extra checkbox and fee at checkout.', current_date - 8, 'Messenger', 3000, 4, 'Done', current_date - 6)
  returning id into v_cr;

  insert into time_logs (project_id, date, hours, description)
  values
    (v_project_bakery, current_date - 28, 8, 'Project setup and scaffolding'),
    (v_project_bakery, current_date - 20, 12, 'Storefront and product pages'),
    (v_project_bakery, current_date - 10, 10, 'Checkout and payments integration'),
    (v_project_bakery, current_date - 6, 4, 'Gift-wrapping change request');

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_bakery, v_project_bakery, 30000, 30000, current_date - 30, current_date - 16, 'Paid', true)
  returning id into v_invoice_dp;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, source_milestone_id, sort_order)
  values (v_invoice_dp, 'Downpayment - Bakery E-commerce Website', 1, 30000, 30000, v_dp_milestone, 0);

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_bakery, v_project_bakery, 15000, 15000, current_date - 5, current_date + 9, 'Paid', true)
  returning id into v_invoice_mid;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, source_milestone_id, sort_order)
  values (v_invoice_mid, 'Midpoint - Bakery E-commerce Website', 1, 15000, 15000, v_mid_milestone, 0);

  insert into payments (invoice_id, project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values
    (v_invoice_dp, v_project_bakery, v_client_bakery, 30000, current_date - 29, 'GCash', 'Downpayment', 'GC-10021', true),
    (v_invoice_mid, v_project_bakery, v_client_bakery, 15000, current_date - 4, 'Bank transfer', 'Milestone', 'BT-88231', true);

  -- Project 2: Metro Fitness Gym membership system (completed)
  insert into projects (client_id, title, description, project_type, pricing_model, base_price, status, start_date, deadline, completion_date, warranty_end_date, tech_stack, live_url, hosting_provider, domain_registrar, notes, is_sample)
  values (v_client_gym, 'Membership Management System', 'Member check-in, billing, and class scheduling.', 'Web app/System', 'Fixed price', 90000, 'Completed', current_date - 120, current_date - 60, current_date - 58, current_date + 120, array['React','Supabase'], 'https://app.metrofitness.example', 'Hostinger', 'Hostinger', 'Now on a monthly maintenance retainer.', true)
  returning id into v_project_gym;

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_gym, v_project_gym, 90000, 90000, current_date - 90, current_date - 76, 'Paid', true)
  returning id into v_invoice_gym;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_invoice_gym, 'Membership Management System - full payment', 1, 90000, 90000, 0);

  insert into payments (invoice_id, project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values (v_invoice_gym, v_project_gym, v_client_gym, 90000, current_date - 89, 'Bank transfer', 'Full payment', 'BT-77120', true);

  -- Recurring service for the gym
  insert into recurring_services (client_id, project_id, service_type, provider, description, amount_charged, my_cost, billing_cycle, next_renewal_date, auto_renew_on_provider, status, is_sample)
  values (v_client_gym, v_project_gym, 'Maintenance retainer', 'Self', 'Monthly maintenance and support retainer', 3500, 0, 'Monthly', current_date + 12, false, 'Active', true);

  insert into recurring_services (client_id, project_id, service_type, provider, description, amount_charged, my_cost, billing_cycle, next_renewal_date, auto_renew_on_provider, status, is_sample)
  values (v_client_bakery, v_project_bakery, 'Hosting', 'Vercel', 'sunrisebakery.example hosting', 800, 300, 'Monthly', current_date + 4, true, 'Active', true);

  -- Product + license for the clinic
  insert into products (name, description, current_version, standard_price, notes, is_sample)
  values ('Clinic Appointment System', 'Appointment booking and patient records for small clinics.', '2.3.0', 25000, 'Sold as a one-time license plus optional support.', true)
  returning id into v_product;

  insert into licenses (product_id, client_id, purchase_date, amount_paid, deployment_url, version_installed, support_until_date, status, notes, is_sample)
  values (v_product, v_client_clinic, current_date - 40, 25000, 'https://clinic.santosclinic.example', '2.3.0', current_date + 20, 'Active', 'Standard 60-day support window.', true);

  insert into payments (project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values (null, v_client_clinic, 25000, current_date - 40, 'Maya', 'License', 'MY-55210', true);

  -- Expenses
  insert into expenses (date, category, amount, vendor, client_id, project_id, notes, is_sample)
  values
    (current_date - 25, 'Hosting', 800, 'Vercel', v_client_bakery, v_project_bakery, 'Monthly hosting for bakery site', true),
    (current_date - 60, 'Domain', 700, 'Namecheap', v_client_bakery, v_project_bakery, 'Annual domain renewal', true),
    (current_date - 15, 'Software/Subscription', 1200, 'Figma', null, null, 'Design tool subscription', true),
    (current_date - 5, 'Internet', 1500, 'PLDT', null, null, 'Monthly internet bill', true);
end;
$$;

create or replace function clear_sample_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from payments where is_sample = true;
  delete from invoices where is_sample = true;
  delete from recurring_services where is_sample = true;
  delete from licenses where is_sample = true;
  delete from products where is_sample = true;
  delete from expenses where is_sample = true;
  delete from projects where is_sample = true;
  delete from quotations where is_sample = true;
  delete from clients where is_sample = true;
  delete from leads where is_sample = true;
end;
$$;


-- ============================================================
-- 0012_storage.sql
-- ============================================================
-- Private storage bucket for logos, payment proofs, receipts, and client/project files.
-- Path convention: {user_id}/{category}/{filename}, enforced by the policies below.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_select_own"
on storage.objects for select
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_insert_own"
on storage.objects for insert
with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_update_own"
on storage.objects for update
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_delete_own"
on storage.objects for delete
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- 0013_new_user.sql
-- ============================================================
-- Bootstrap a default business_settings row the moment someone signs up.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into business_settings (user_id, owner_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();


-- ============================================================
-- 0014_recurring_renewal.sql
-- ============================================================
-- "Mark as Renewed" action: records the client payment, records the cost as an
-- expense, and advances the next renewal date by one billing cycle, atomically.

create or replace function mark_recurring_service_renewed(p_id uuid)
returns recurring_services
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_service recurring_services;
  v_expense_category text;
  v_interval interval;
begin
  select * into v_service from recurring_services where id = p_id;
  if v_service.id is null then
    raise exception 'Recurring service not found';
  end if;

  insert into payments (client_id, project_id, amount, date_paid, payment_type, notes)
  values (v_service.client_id, v_service.project_id, v_service.amount_charged, current_date, 'Recurring service',
          v_service.service_type || ' renewal');

  if v_service.my_cost > 0 then
    v_expense_category := case v_service.service_type
      when 'Hosting' then 'Hosting'
      when 'Domain' then 'Domain'
      when 'Software subscription' then 'Software/Subscription'
      else 'Other'
    end;

    insert into expenses (date, category, amount, vendor, client_id, project_id, notes)
    values (current_date, v_expense_category, v_service.my_cost, v_service.provider, v_service.client_id, v_service.project_id,
            v_service.service_type || ' renewal cost');
  end if;

  v_interval := case v_service.billing_cycle
    when 'Monthly' then interval '1 month'
    when 'Quarterly' then interval '3 months'
    else interval '1 year'
  end;

  update recurring_services
  set next_renewal_date = coalesce(next_renewal_date, current_date) + v_interval
  where id = p_id
  returning * into v_service;

  return v_service;
end;
$$;


-- ============================================================
-- 0015_qa_fixes.sql
-- ============================================================
-- QA audit fixes. Additive only: no tables/columns dropped or renamed.
-- CHECK constraints are NOT VALID so existing rows never block this migration;
-- they are enforced on every new insert/update.

-- ============================================================
-- H3: dates follow Asia/Manila (current_date, "today", overdue logic)
-- ============================================================
do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'Asia/Manila');
end $$;

-- ============================================================
-- C3 / M1: invoice status recalculation
-- ============================================================
create or replace function recalc_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total numeric(12,2);
  v_due date;
  v_status text;
  v_paid numeric(12,2);
  v_new text;
begin
  if p_invoice_id is null then
    return;
  end if;

  select total, due_date, status into v_total, v_due, v_status
  from invoices where id = p_invoice_id;
  if not found or v_status = 'Cancelled' then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = p_invoice_id;

  if v_paid > 0 and v_paid >= v_total then
    v_new := 'Paid';
  elsif v_paid > 0 then
    v_new := 'Partially Paid';
  elsif v_status = 'Draft' then
    return; -- an unpaid draft stays a draft
  elsif v_due is not null and v_due < current_date then
    v_new := 'Overdue';
  else
    v_new := 'Sent';
  end if;

  if v_new is distinct from v_status then
    update invoices set status = v_new where id = p_invoice_id;
  end if;
end;
$$;

-- Recalculates BOTH the old and the new invoice when a payment moves between invoices.
create or replace function sync_invoice_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform recalc_invoice_status(old.invoice_id);
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id) then
    perform recalc_invoice_status(new.invoice_id);
  end if;
  return null;
end;
$$;

create or replace view view_invoices_computed with (security_invoker = true) as
select
  i.*,
  coalesce(p.paid, 0) as amount_paid,
  case
    when i.status = 'Cancelled' then 'Cancelled'
    when coalesce(p.paid, 0) > 0 and coalesce(p.paid, 0) >= i.total then 'Paid'
    when coalesce(p.paid, 0) = 0 and i.status = 'Draft' then 'Draft'
    when i.due_date is not null and i.due_date < current_date then 'Overdue'
    when coalesce(p.paid, 0) > 0 then 'Partially Paid'
    else 'Sent'
  end as computed_status
from invoices i
left join lateral (select sum(amount) as paid from payments where invoice_id = i.id) p on true;

-- ============================================================
-- M2: zero-price projects count as fully paid, not unpaid
-- ============================================================
create or replace view view_project_computed with (security_invoker = true) as
select
  v.*,
  (v.contract_value - v.total_paid) as balance,
  (v.total_paid - v.direct_costs) as profit,
  case
    when v.total_paid >= v.contract_value then 'Fully Paid'
    when v.total_paid <= 0 then 'Unpaid'
    else 'Partially Paid'
  end as payment_status,
  case
    when v.hours_logged > 0 then round(v.total_paid / v.hours_logged, 2)
    else null
  end as effective_hourly_rate
from view_project_totals v;

-- ============================================================
-- H4: milestone status follows invoice line items (bill once; free again on delete)
-- ============================================================
create or replace function sync_milestone_billing()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.source_milestone_id is not null then
    update milestones set status = 'Invoiced'
    where id = new.source_milestone_id and status = 'Pending';
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.source_milestone_id is not null
     and (tg_op = 'DELETE' or new.source_milestone_id is distinct from old.source_milestone_id) then
    update milestones set status = 'Pending'
    where id = old.source_milestone_id
      and status = 'Invoiced'
      and not exists (
        select 1 from invoice_line_items
        where source_milestone_id = old.source_milestone_id and id <> old.id
      );
  end if;
  return null;
end;
$$;

drop trigger if exists invoice_line_items_sync_milestone on invoice_line_items;
create trigger invoice_line_items_sync_milestone
after insert or update or delete on invoice_line_items
for each row execute function sync_milestone_billing();

-- One milestone / change request can appear on at most one invoice line.
-- Only created when existing data is already clean, so this never fails.
do $$
begin
  if not exists (
    select source_milestone_id from invoice_line_items
    where source_milestone_id is not null group by 1 having count(*) > 1
  ) then
    create unique index if not exists invoice_line_items_milestone_once
      on invoice_line_items (source_milestone_id) where source_milestone_id is not null;
  end if;
  if not exists (
    select source_change_request_id from invoice_line_items
    where source_change_request_id is not null group by 1 having count(*) > 1
  ) then
    create unique index if not exists invoice_line_items_change_request_once
      on invoice_line_items (source_change_request_id) where source_change_request_id is not null;
  end if;
end $$;

-- ============================================================
-- M11: replace line items atomically (old lines are never lost on a failed save)
-- ============================================================
create or replace function replace_invoice_line_items(p_invoice_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from invoices where id = p_invoice_id) then
    raise exception 'Invoice not found';
  end if;

  delete from invoice_line_items where invoice_id = p_invoice_id;

  insert into invoice_line_items
    (invoice_id, description, quantity, unit_price, line_total, source_milestone_id, source_change_request_id, sort_order)
  select p_invoice_id,
         e.item->>'description',
         coalesce((e.item->>'quantity')::numeric, 0),
         coalesce((e.item->>'unit_price')::numeric, 0),
         coalesce((e.item->>'line_total')::numeric, 0),
         nullif(e.item->>'source_milestone_id', '')::uuid,
         nullif(e.item->>'source_change_request_id', '')::uuid,
         (e.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as e(item, ord);
end;
$$;

create or replace function replace_quotation_line_items(p_quotation_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from quotations where id = p_quotation_id) then
    raise exception 'Quotation not found';
  end if;

  delete from quotation_line_items where quotation_id = p_quotation_id;

  insert into quotation_line_items (quotation_id, description, quantity, unit_price, line_total, sort_order)
  select p_quotation_id,
         e.item->>'description',
         coalesce((e.item->>'quantity')::numeric, 0),
         coalesce((e.item->>'unit_price')::numeric, 0),
         coalesce((e.item->>'line_total')::numeric, 0),
         (e.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as e(item, ord);
end;
$$;

-- ============================================================
-- H7: reject negative amounts, out-of-range percentages, and out-of-order dates
-- ============================================================
alter table business_settings add constraint business_settings_downpayment_range
  check (default_downpayment_percent between 0 and 100) not valid;
alter table business_settings add constraint business_settings_reminder_days_nonneg
  check (renewal_reminder_days >= 0) not valid;

alter table leads add constraint leads_estimated_value_nonneg check (estimated_value >= 0) not valid;

alter table quotations add constraint quotations_amounts_nonneg
  check (discount_value >= 0 and subtotal >= 0 and total >= 0) not valid;
alter table quotations add constraint quotations_discount_percent_max
  check (discount_type is distinct from 'percent' or discount_value <= 100) not valid;
alter table quotations add constraint quotations_valid_until_after_issue
  check (valid_until_date is null or valid_until_date >= issue_date) not valid;
alter table quotation_line_items add constraint quotation_line_items_nonneg
  check (quantity >= 0 and unit_price >= 0 and line_total >= 0) not valid;

alter table projects add constraint projects_amounts_nonneg
  check (base_price >= 0 and coalesce(hourly_rate, 0) >= 0 and coalesce(estimated_hours, 0) >= 0) not valid;
alter table projects add constraint projects_deadline_after_start
  check (deadline is null or start_date is null or deadline >= start_date) not valid;
alter table projects add constraint projects_completion_after_start
  check (completion_date is null or start_date is null or completion_date >= start_date) not valid;

alter table milestones add constraint milestones_amount_nonneg check (amount >= 0) not valid;
alter table change_requests add constraint change_requests_nonneg
  check (extra_charge >= 0 and coalesce(estimated_hours, 0) >= 0) not valid;
alter table time_logs add constraint time_logs_hours_range check (hours > 0 and hours <= 24) not valid;

alter table invoices add constraint invoices_amounts_nonneg
  check (discount_value >= 0 and subtotal >= 0 and total >= 0) not valid;
alter table invoices add constraint invoices_discount_percent_max
  check (discount_type is distinct from 'percent' or discount_value <= 100) not valid;
alter table invoices add constraint invoices_due_after_issue
  check (due_date is null or due_date >= issue_date) not valid;
alter table invoice_line_items add constraint invoice_line_items_nonneg
  check (quantity >= 0 and unit_price >= 0 and line_total >= 0) not valid;

alter table payments add constraint payments_amount_positive check (amount > 0) not valid;
alter table recurring_services add constraint recurring_services_amounts_nonneg
  check (amount_charged >= 0 and my_cost >= 0) not valid;
alter table products add constraint products_price_nonneg check (standard_price >= 0) not valid;
alter table licenses add constraint licenses_amount_nonneg check (amount_paid >= 0) not valid;
alter table expenses add constraint expenses_amount_nonneg check (amount >= 0) not valid;

-- ============================================================
-- H5: renewal only for active services; skip zero-value payment/expense rows
-- ============================================================
create or replace function mark_recurring_service_renewed(p_id uuid)
returns recurring_services
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_service recurring_services;
  v_expense_category text;
  v_interval interval;
begin
  select * into v_service from recurring_services where id = p_id for update;
  if v_service.id is null then
    raise exception 'Recurring service not found';
  end if;
  if v_service.status <> 'Active' then
    raise exception 'Only active services can be renewed';
  end if;

  if v_service.amount_charged > 0 then
    insert into payments (client_id, project_id, amount, date_paid, payment_type, notes)
    values (v_service.client_id, v_service.project_id, v_service.amount_charged, current_date,
            'Recurring service', v_service.service_type || ' renewal');
  end if;

  if v_service.my_cost > 0 then
    v_expense_category := case v_service.service_type
      when 'Hosting' then 'Hosting'
      when 'Domain' then 'Domain'
      when 'Software subscription' then 'Software/Subscription'
      else 'Other'
    end;
    insert into expenses (date, category, amount, vendor, client_id, project_id, notes)
    values (current_date, v_expense_category, v_service.my_cost, v_service.provider,
            v_service.client_id, v_service.project_id, v_service.service_type || ' renewal cost');
  end if;

  v_interval := case v_service.billing_cycle
    when 'Monthly' then interval '1 month'
    when 'Quarterly' then interval '3 months'
    else interval '1 year'
  end;

  -- date + interval clamps month-ends (Jan 31 + 1 month = Feb 28/29).
  update recurring_services
  set next_renewal_date = (coalesce(next_renewal_date, current_date) + v_interval)::date
  where id = p_id
  returning * into v_service;

  return v_service;
end;
$$;

-- ============================================================
-- H9: loading sample data twice no longer duplicates everything
-- ============================================================
alter function seed_sample_data() rename to seed_sample_data_unguarded;

create or replace function seed_sample_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (select 1 from clients where is_sample)
     or exists (select 1 from leads where is_sample)
     or exists (select 1 from products where is_sample) then
    raise exception 'Sample data is already loaded. Clear it first to reload.';
  end if;
  perform seed_sample_data_unguarded();
end;
$$;

-- ============================================================
-- H10: no orphaned activities / tasks / file rows after deleting a parent
-- ============================================================
create or replace function cleanup_entity_children()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from activities where entity_type = tg_argv[0] and entity_id = old.id;
  delete from tasks where entity_type = tg_argv[0] and entity_id = old.id;
  if tg_argv[0] in ('client', 'project') then
    delete from files where entity_type = tg_argv[0] and entity_id = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists leads_cleanup_children on leads;
create trigger leads_cleanup_children after delete on leads
for each row execute function cleanup_entity_children('lead');

drop trigger if exists clients_cleanup_children on clients;
create trigger clients_cleanup_children after delete on clients
for each row execute function cleanup_entity_children('client');

drop trigger if exists projects_cleanup_children on projects;
create trigger projects_cleanup_children after delete on projects
for each row execute function cleanup_entity_children('project');

-- ============================================================
-- L8: the numbering helper is not callable anonymously
-- ============================================================
revoke execute on function next_document_number(text, text) from public, anon;
grant execute on function next_document_number(text, text) to authenticated;


