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
