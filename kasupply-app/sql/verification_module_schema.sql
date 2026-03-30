create table if not exists public.verification_runs (
  run_id bigint generated always as identity not null,
  profile_id bigint not null,
  target_type text not null,
  target_id bigint null,
  kind text not null,
  status text not null default 'queued',
  triggered_by text not null default 'system',
  input_snapshot jsonb not null default '{}'::jsonb,
  provider_status jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text null,
  created_at timestamp with time zone not null default now(),
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  constraint verification_runs_pkey primary key (run_id),
  constraint verification_runs_profile_id_fkey foreign key (profile_id) references public.business_profiles (profile_id) on delete cascade,
  constraint verification_runs_target_type_check check (
    target_type = any (
      array[
        'business_document'::text,
        'site_verification'::text,
        'buyer_profile'::text,
        'supplier_profile'::text
      ]
    )
  ),
  constraint verification_runs_kind_check check (
    kind = any (
      array[
        'buyer_document'::text,
        'supplier_document'::text,
        'site_verification'::text,
        'buyer_onboarding'::text,
        'supplier_onboarding'::text
      ]
    )
  ),
  constraint verification_runs_status_check check (
    status = any (
      array[
        'queued'::text,
        'processing'::text,
        'completed'::text,
        'failed'::text,
        'review_required'::text,
        'cancelled'::text
      ]
    )
  ),
  constraint verification_runs_triggered_by_check check (
    triggered_by = any (
      array[
        'system'::text,
        'user'::text,
        'admin'::text,
        'retry'::text
      ]
    )
  )
);

create index if not exists idx_verification_runs_profile_id
  on public.verification_runs using btree (profile_id);

create index if not exists idx_verification_runs_status
  on public.verification_runs using btree (status);

create index if not exists idx_verification_runs_kind_status
  on public.verification_runs using btree (kind, status);

create table if not exists public.site_verification_checks (
  site_verification_id bigint generated always as identity not null,
  profile_id bigint not null,
  submitted_address text not null,
  normalized_address text null,
  geocode_payload jsonb not null default '{}'::jsonb,
  street_view_metadata jsonb not null default '{}'::jsonb,
  street_view_image_url text null,
  comparison_payload jsonb not null default '{}'::jsonb,
  similarity_score numeric(5, 2) null,
  threshold_score numeric(5, 2) not null default 70.00,
  deliverability_status text not null default 'pending',
  street_view_status text not null default 'pending',
  status text not null default 'pending',
  manual_review_required boolean not null default false,
  review_notes text null,
  verified_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint site_verification_checks_pkey primary key (site_verification_id),
  constraint site_verification_checks_profile_id_fkey foreign key (profile_id) references public.business_profiles (profile_id) on delete cascade,
  constraint site_verification_checks_deliverability_status_check check (
    deliverability_status = any (
      array[
        'pending'::text,
        'deliverable'::text,
        'undeliverable'::text,
        'unknown'::text
      ]
    )
  ),
  constraint site_verification_checks_street_view_status_check check (
    street_view_status = any (
      array[
        'pending'::text,
        'available'::text,
        'unavailable'::text,
        'unknown'::text
      ]
    )
  ),
  constraint site_verification_checks_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text,
        'review_required'::text,
        'error'::text
      ]
    )
  )
);

create index if not exists idx_site_verification_checks_profile_id
  on public.site_verification_checks using btree (profile_id);

create index if not exists idx_site_verification_checks_status
  on public.site_verification_checks using btree (status);

alter table if exists public.business_documents
  add column if not exists ocr_raw_text text null,
  add column if not exists ocr_extracted_fields jsonb not null default '{}'::jsonb,
  add column if not exists metadata_analysis jsonb not null default '{}'::jsonb,
  add column if not exists verification_analysis jsonb not null default '{}'::jsonb,
  add column if not exists verification_score numeric(5, 2) null,
  add column if not exists manual_review_required boolean not null default false,
  add column if not exists review_notes text null,
  add column if not exists last_verification_run_id bigint null;

alter table if exists public.business_documents
  drop constraint if exists business_documents_status_check;

alter table if exists public.business_documents
  add constraint business_documents_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text,
        'review_required'::text
      ]
    )
  );

alter table if exists public.business_documents
  drop constraint if exists business_documents_last_verification_run_id_fkey;

alter table if exists public.business_documents
  add constraint business_documents_last_verification_run_id_fkey
    foreign key (last_verification_run_id) references public.verification_runs (run_id) on delete set null;

create index if not exists idx_business_documents_profile_status
  on public.business_documents using btree (profile_id, status);

alter table if exists public.site_showcase_images
  add column if not exists manual_review_required boolean not null default false,
  add column if not exists review_notes text null,
  add column if not exists last_verification_run_id bigint null;

alter table if exists public.site_showcase_images
  drop constraint if exists site_showcase_images_status_check;

alter table if exists public.site_showcase_images
  add constraint site_showcase_images_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text,
        'review_required'::text
      ]
    )
  );

alter table if exists public.site_showcase_images
  drop constraint if exists site_showcase_images_last_verification_run_id_fkey;

alter table if exists public.site_showcase_images
  add constraint site_showcase_images_last_verification_run_id_fkey
    foreign key (last_verification_run_id) references public.verification_runs (run_id) on delete set null;

create index if not exists idx_site_showcase_images_profile_status
  on public.site_showcase_images using btree (profile_id, status);

alter table if exists public.supplier_profiles
  add column if not exists verification_status text not null default 'incomplete',
  add column if not exists verification_submitted_at timestamp with time zone null,
  add column if not exists verification_last_evaluated_at timestamp with time zone null,
  add column if not exists verification_notes text null;

alter table if exists public.supplier_profiles
  drop constraint if exists supplier_profiles_verification_status_check;

alter table if exists public.supplier_profiles
  add constraint supplier_profiles_verification_status_check check (
    verification_status = any (
      array[
        'incomplete'::text,
        'submitted'::text,
        'under_review'::text,
        'approved'::text,
        'rejected'::text,
        'review_required'::text
      ]
    )
  );

create index if not exists idx_supplier_profiles_verification_status
  on public.supplier_profiles using btree (verification_status);

alter table if exists public.buyer_profiles
  add column if not exists verification_status text not null default 'incomplete',
  add column if not exists verification_submitted_at timestamp with time zone null,
  add column if not exists verification_last_evaluated_at timestamp with time zone null,
  add column if not exists verification_notes text null;

alter table if exists public.buyer_profiles
  drop constraint if exists buyer_profiles_verification_status_check;

alter table if exists public.buyer_profiles
  add constraint buyer_profiles_verification_status_check check (
    verification_status = any (
      array[
        'incomplete'::text,
        'submitted'::text,
        'under_review'::text,
        'approved'::text,
        'rejected'::text,
        'review_required'::text
      ]
    )
  );

create index if not exists idx_buyer_profiles_verification_status
  on public.buyer_profiles using btree (verification_status);
