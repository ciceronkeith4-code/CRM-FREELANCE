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
