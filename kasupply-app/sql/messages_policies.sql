alter table public.messages enable row level security;

drop policy if exists "Conversation participants can view messages" on public.messages;
create policy "Conversation participants can view messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.conversation_id = messages.conversation_id
      and (
        c.buyer_id in (
          select b.buyer_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.buyer_profiles b on b.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
        or c.supplier_id in (
          select s.supplier_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.supplier_profiles s on s.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages"
on public.messages
for insert
to authenticated
with check (
  messages.sender_id in (
    select u.user_id
    from public.users u
    where u.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.conversations c
    where c.conversation_id = messages.conversation_id
      and (
        c.buyer_id in (
          select b.buyer_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.buyer_profiles b on b.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
        or c.supplier_id in (
          select s.supplier_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.supplier_profiles s on s.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Conversation participants can update messages" on public.messages;
create policy "Conversation participants can update messages"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.conversation_id = messages.conversation_id
      and (
        c.buyer_id in (
          select b.buyer_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.buyer_profiles b on b.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
        or c.supplier_id in (
          select s.supplier_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.supplier_profiles s on s.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.conversation_id = messages.conversation_id
      and (
        c.buyer_id in (
          select b.buyer_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.buyer_profiles b on b.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
        or c.supplier_id in (
          select s.supplier_id
          from public.users u
          join public.business_profiles bp on bp.user_id = u.user_id
          join public.supplier_profiles s on s.profile_id = bp.profile_id
          where u.auth_user_id = auth.uid()
        )
      )
  )
);
