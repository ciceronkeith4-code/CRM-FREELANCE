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
