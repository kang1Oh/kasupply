drop policy if exists "Authenticated users can view purchase order receipts" on storage.objects;
drop policy if exists "Authenticated users can upload their own purchase order receipts" on storage.objects;
drop policy if exists "Authenticated users can update their own purchase order receipts" on storage.objects;
drop policy if exists "Authenticated users can delete their own purchase order receipts" on storage.objects;

create policy "Authenticated users can view purchase order receipts"
on storage.objects
for select
to authenticated
using (bucket_id = 'purchase-order-receipts');

create policy "Authenticated users can upload their own purchase order receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'purchase-order-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update their own purchase order receipts"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'purchase-order-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'purchase-order-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete their own purchase order receipts"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'purchase-order-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
