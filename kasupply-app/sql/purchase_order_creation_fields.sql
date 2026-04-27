alter table public.purchase_orders
  add column if not exists unit_price numeric(12, 2) null,
  add column if not exists subtotal numeric(12, 2) null,
  add column if not exists expected_delivery_date date null,
  add column if not exists delivery_address text null;

update public.purchase_orders
set unit_price = coalesce(unit_price, nullif(total_amount, 0) / nullif(quantity, 0))
where unit_price is null
  and total_amount is not null
  and quantity is not null
  and quantity <> 0;

update public.purchase_orders
set subtotal = coalesce(subtotal, total_amount)
where subtotal is null
  and total_amount is not null;
