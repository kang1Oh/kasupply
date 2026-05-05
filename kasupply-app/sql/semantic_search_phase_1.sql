-- Semantic search phase 1 foundation.
-- This migration assumes a 1536-dimension embedding model
-- such as OpenAI text-embedding-3-small.
-- If you choose a different model, update vector(1536) below first.

create extension if not exists vector with schema extensions;

create or replace function public.set_supplier_search_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.supplier_search_documents (
  search_document_id bigint generated always as identity not null,
  supplier_id bigint not null,
  profile_id bigint not null,
  source_type text not null,
  source_id bigint not null,
  title text not null,
  content text not null,
  category_id bigint null,
  moq numeric(12, 2) null,
  max_capacity numeric(12, 2) null,
  unit text null,
  city text null,
  province text null,
  region text null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  embedding_model text null,
  embedding vector(1536) null,
  search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(content, '')
    )
  ) stored,
  last_indexed_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint supplier_search_documents_pkey primary key (search_document_id),
  constraint supplier_search_documents_supplier_id_fkey
    foreign key (supplier_id) references public.supplier_profiles (supplier_id) on delete cascade,
  constraint supplier_search_documents_profile_id_fkey
    foreign key (profile_id) references public.business_profiles (profile_id) on delete cascade,
  constraint supplier_search_documents_category_id_fkey
    foreign key (category_id) references public.product_categories (category_id) on delete set null,
  constraint supplier_search_documents_source_type_check
    check (source_type = any (array['profile'::text, 'product'::text])),
  constraint supplier_search_documents_moq_check
    check (moq is null or moq >= 0),
  constraint supplier_search_documents_max_capacity_check
    check (max_capacity is null or max_capacity >= 0)
);

create unique index if not exists idx_supplier_search_documents_source_unique
  on public.supplier_search_documents using btree (source_type, source_id);

create index if not exists idx_supplier_search_documents_supplier_id
  on public.supplier_search_documents using btree (supplier_id);

create index if not exists idx_supplier_search_documents_profile_id
  on public.supplier_search_documents using btree (profile_id);

create index if not exists idx_supplier_search_documents_active_source_type
  on public.supplier_search_documents using btree (is_active, source_type);

create index if not exists idx_supplier_search_documents_category_id
  on public.supplier_search_documents using btree (category_id)
  where is_active = true;

create index if not exists idx_supplier_search_documents_location
  on public.supplier_search_documents using btree (region, province, city)
  where is_active = true;

create index if not exists idx_supplier_search_documents_search_tsv
  on public.supplier_search_documents using gin (search_tsv);

create index if not exists idx_supplier_search_documents_embedding
  on public.supplier_search_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100)
  where embedding is not null and is_active = true;

drop trigger if exists trg_supplier_search_documents_updated_at
  on public.supplier_search_documents;

create trigger trg_supplier_search_documents_updated_at
before update on public.supplier_search_documents
for each row
execute function public.set_supplier_search_documents_updated_at();

alter table public.supplier_search_documents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_search_documents'
      and policyname = 'supplier_search_documents_select_authenticated'
  ) then
    create policy supplier_search_documents_select_authenticated
      on public.supplier_search_documents
      for select
      to authenticated
      using (is_active = true);
  end if;
end;
$$;
