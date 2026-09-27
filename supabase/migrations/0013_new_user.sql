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
