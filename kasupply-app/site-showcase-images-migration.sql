create table if not exists public.site_showcase_images (
  image_id bigserial primary key,
  profile_id bigint not null references public.business_profiles(profile_id) on delete cascade,
  image_type text not null check (
    image_type in ('exterior', 'interior', 'signage', 'operational_setup', 'location_map')
  ),
  image_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, image_type)
);
