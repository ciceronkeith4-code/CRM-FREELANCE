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
