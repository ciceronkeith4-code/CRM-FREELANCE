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
