alter table public.purchase_orders
  add column if not exists payment_method text null,
  add column if not exists terms_and_conditions text null,
  add column if not exists additional_notes text null,
  add column if not exists delivery_fee numeric(12, 2) null default 0,
  add column if not exists receipt_file_url text null,
  add column if not exists receipt_status text not null default 'not_uploaded',
  add column if not exists receipt_review_notes text null;

update public.purchase_orders
set receipt_status = case
  when receipt_file_url is not null then 'pending_review'
  else 'not_uploaded'
end
where receipt_status is null
   or receipt_status not in ('not_uploaded', 'pending_review', 'approved', 'rejected');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_orders_delivery_fee_check'
  ) then
    alter table public.purchase_orders
      add constraint purchase_orders_delivery_fee_check
      check (delivery_fee is null or delivery_fee >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_orders_receipt_status_check'
  ) then
    alter table public.purchase_orders
      add constraint purchase_orders_receipt_status_check
      check (
        receipt_status = any (
          array[
            'not_uploaded'::text,
            'pending_review'::text,
            'approved'::text,
            'rejected'::text
          ]
        )
      );
  end if;
end $$;
