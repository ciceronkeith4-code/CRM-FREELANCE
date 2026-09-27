-- Private storage bucket for logos, payment proofs, receipts, and client/project files.
-- Path convention: {user_id}/{category}/{filename}, enforced by the policies below.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_select_own"
on storage.objects for select
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_insert_own"
on storage.objects for insert
with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_update_own"
on storage.objects for update
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_delete_own"
on storage.objects for delete
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
