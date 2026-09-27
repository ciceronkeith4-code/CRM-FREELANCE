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
