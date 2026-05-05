begin;

update public.business_documents
set
  status = 'approved',
  manual_review_required = false,
  review_notes = null,
  verified_at = coalesce(verified_at, now())
where status = 'review_required';

update public.site_showcase_images
set
  status = 'approved',
  manual_review_required = false,
  review_notes = null,
  verified_at = coalesce(verified_at, now())
where status = 'review_required';

delete from public.site_showcase_images
where image_type not in ('exterior', 'signage');

update public.site_verification_checks
set
  status = 'approved',
  manual_review_required = false,
  review_notes = null,
  verified_at = coalesce(verified_at, now()),
  updated_at = now()
where status = 'review_required';

update public.buyer_profiles
set
  verification_status = 'approved',
  verification_notes = null,
  verification_submitted_at = coalesce(verification_submitted_at, now()),
  verification_last_evaluated_at = coalesce(verification_last_evaluated_at, now()),
  updated_at = now()
where verification_status = 'review_required';

update public.supplier_profiles
set
  verification_status = 'approved',
  verification_notes = null,
  verification_submitted_at = coalesce(verification_submitted_at, now()),
  verification_last_evaluated_at = coalesce(verification_last_evaluated_at, now()),
  verified = true,
  verified_badge = true,
  verified_at = coalesce(verified_at, now()),
  updated_at = now()
where verification_status = 'review_required';

alter table if exists public.business_documents
  drop constraint if exists business_documents_status_check;

alter table if exists public.business_documents
  add constraint business_documents_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text
      ]
    )
  );

alter table if exists public.site_showcase_images
  drop constraint if exists site_showcase_images_status_check;

alter table if exists public.site_showcase_images
  add constraint site_showcase_images_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text
      ]
    )
  );

alter table if exists public.site_showcase_images
  drop constraint if exists site_showcase_images_type_check;

alter table if exists public.site_showcase_images
  add constraint site_showcase_images_type_check check (
    image_type = any (
      array[
        'exterior'::text,
        'signage'::text
      ]
    )
  );

alter table if exists public.site_verification_checks
  drop constraint if exists site_verification_checks_status_check;

alter table if exists public.site_verification_checks
  add constraint site_verification_checks_status_check check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'approved'::text,
        'rejected'::text,
        'error'::text
      ]
    )
  );

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
        'rejected'::text
      ]
    )
  );

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
        'rejected'::text
      ]
    )
  );

commit;
