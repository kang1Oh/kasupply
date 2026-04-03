alter table public.purchase_orders enable row level security;

drop policy if exists "Buyers can view their purchase orders" on public.purchase_orders;
create policy "Buyers can view their purchase orders"
on public.purchase_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.buyer_profiles b on b.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and b.buyer_id = purchase_orders.buyer_id
  )
);

drop policy if exists "Buyers can create their purchase orders" on public.purchase_orders;
create policy "Buyers can create their purchase orders"
on public.purchase_orders
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.buyer_profiles b on b.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and b.buyer_id = purchase_orders.buyer_id
  )
);

drop policy if exists "Buyers can update their purchase orders" on public.purchase_orders;
create policy "Buyers can update their purchase orders"
on public.purchase_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.buyer_profiles b on b.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and b.buyer_id = purchase_orders.buyer_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.buyer_profiles b on b.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and b.buyer_id = purchase_orders.buyer_id
  )
);

drop policy if exists "Suppliers can view their purchase orders" on public.purchase_orders;
create policy "Suppliers can view their purchase orders"
on public.purchase_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.supplier_profiles s on s.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and s.supplier_id = purchase_orders.supplier_id
  )
);

drop policy if exists "Suppliers can update their purchase orders" on public.purchase_orders;
create policy "Suppliers can update their purchase orders"
on public.purchase_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.supplier_profiles s on s.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and s.supplier_id = purchase_orders.supplier_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.business_profiles bp on bp.user_id = u.user_id
    join public.supplier_profiles s on s.profile_id = bp.profile_id
    where u.auth_user_id = auth.uid()
      and s.supplier_id = purchase_orders.supplier_id
  )
);
