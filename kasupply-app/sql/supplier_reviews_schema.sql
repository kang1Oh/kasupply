create table if not exists public.supplier_reviews (
  review_id bigserial primary key,
  purchase_order_id bigint not null references public.purchase_orders(po_id) on delete cascade,
  supplier_id bigint not null,
  buyer_id bigint not null,
  overall_rating integer not null check (overall_rating between 1 and 5),
  product_quality_rating integer null check (product_quality_rating between 1 and 5),
  delivery_rating integer null check (delivery_rating between 1 and 5),
  communication_rating integer null check (communication_rating between 1 and 5),
  value_for_money_rating integer null check (value_for_money_rating between 1 and 5),
  review_text text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint supplier_reviews_purchase_order_buyer_key unique (purchase_order_id, buyer_id)
);

alter table if exists public.supplier_reviews
  add column if not exists review_id bigserial,
  add column if not exists purchase_order_id bigint,
  add column if not exists supplier_id bigint,
  add column if not exists buyer_id bigint,
  add column if not exists overall_rating integer,
  add column if not exists product_quality_rating integer null,
  add column if not exists delivery_rating integer null,
  add column if not exists communication_rating integer null,
  add column if not exists value_for_money_rating integer null,
  add column if not exists review_text text null,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table if exists public.supplier_reviews
  alter column purchase_order_id set not null,
  alter column supplier_id set not null,
  alter column buyer_id set not null,
  alter column overall_rating set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_reviews_pkey'
      and conrelid = 'public.supplier_reviews'::regclass
  ) then
    alter table public.supplier_reviews
      add constraint supplier_reviews_pkey primary key (review_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_reviews_purchase_order_id_fkey'
      and conrelid = 'public.supplier_reviews'::regclass
  ) then
    alter table public.supplier_reviews
      add constraint supplier_reviews_purchase_order_id_fkey
      foreign key (purchase_order_id) references public.purchase_orders(po_id) on delete cascade;
  end if;
end $$;

alter table if exists public.supplier_reviews
  drop constraint if exists supplier_reviews_overall_rating_check,
  drop constraint if exists supplier_reviews_product_quality_rating_check,
  drop constraint if exists supplier_reviews_delivery_rating_check,
  drop constraint if exists supplier_reviews_communication_rating_check,
  drop constraint if exists supplier_reviews_value_for_money_rating_check,
  drop constraint if exists supplier_reviews_purchase_order_buyer_key;

alter table if exists public.supplier_reviews
  add constraint supplier_reviews_overall_rating_check
    check (overall_rating between 1 and 5),
  add constraint supplier_reviews_product_quality_rating_check
    check (product_quality_rating is null or product_quality_rating between 1 and 5),
  add constraint supplier_reviews_delivery_rating_check
    check (delivery_rating is null or delivery_rating between 1 and 5),
  add constraint supplier_reviews_communication_rating_check
    check (communication_rating is null or communication_rating between 1 and 5),
  add constraint supplier_reviews_value_for_money_rating_check
    check (value_for_money_rating is null or value_for_money_rating between 1 and 5);

create unique index if not exists supplier_reviews_purchase_order_buyer_key
  on public.supplier_reviews (purchase_order_id, buyer_id);

create index if not exists supplier_reviews_supplier_id_idx
  on public.supplier_reviews (supplier_id);

create index if not exists supplier_reviews_buyer_id_idx
  on public.supplier_reviews (buyer_id);

alter table public.supplier_reviews enable row level security;

drop policy if exists "Buyers can read own supplier reviews" on public.supplier_reviews;
create policy "Buyers can read own supplier reviews"
  on public.supplier_reviews
  for select
  using (auth.uid() is not null);

drop policy if exists "Buyers can insert own supplier reviews" on public.supplier_reviews;
create policy "Buyers can insert own supplier reviews"
  on public.supplier_reviews
  for insert
  with check (auth.uid() is not null);

drop policy if exists "Buyers can update own supplier reviews" on public.supplier_reviews;
create policy "Buyers can update own supplier reviews"
  on public.supplier_reviews
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
