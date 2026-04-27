insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Authenticated users can view message attachments" on storage.objects;
drop policy if exists "Authenticated users can upload their own message attachments" on storage.objects;
drop policy if exists "Authenticated users can update their own message attachments" on storage.objects;
drop policy if exists "Authenticated users can delete their own message attachments" on storage.objects;

create policy "Authenticated users can view message attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'message-attachments');

create policy "Authenticated users can upload their own message attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update their own message attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete their own message attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
