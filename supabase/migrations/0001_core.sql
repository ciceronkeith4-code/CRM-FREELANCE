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
