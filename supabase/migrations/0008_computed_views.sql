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
