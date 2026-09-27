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
