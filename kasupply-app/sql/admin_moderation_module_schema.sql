create table if not exists public.admin_action_logs (
  action_id bigint generated always as identity not null,
  admin_user_id text not null,
  action_type text not null,
  target_type text not null,
  target_id text not null,
  reason text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint admin_action_logs_pkey primary key (action_id),
  constraint admin_action_logs_target_type_check check (
    target_type = any (
      array[
        'user'::text,
        'product'::text,
        'verification_run'::text,
        'profile'::text,
        'queue'::text
      ]
    )
  )
);

create index if not exists idx_admin_action_logs_created_at
  on public.admin_action_logs using btree (created_at desc);

create index if not exists idx_admin_action_logs_target
  on public.admin_action_logs using btree (target_type, target_id);
