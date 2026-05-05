-- Semantic search phase 2 SQL helpers.
-- Keep the vector dimension aligned with semantic_search_phase_1.sql.

create or replace function public.match_supplier_search_documents(
  query_embedding_text text,
  match_count integer default 20,
  filter_category_id bigint default null,
  filter_city text default null,
  filter_province text default null,
  filter_region text default null,
  filter_source_types text[] default null
)
returns table (
  search_document_id bigint,
  supplier_id bigint,
  profile_id bigint,
  source_type text,
  source_id bigint,
  title text,
  content text,
  category_id bigint,
  moq numeric,
  max_capacity numeric,
  unit text,
  city text,
  province text,
  region text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    document.search_document_id,
    document.supplier_id,
    document.profile_id,
    document.source_type,
    document.source_id,
    document.title,
    document.content,
    document.category_id,
    document.moq,
    document.max_capacity,
    document.unit,
    document.city,
    document.province,
    document.region,
    document.metadata,
    1 - (document.embedding <=> cast(query_embedding_text as vector(1536))) as similarity
  from public.supplier_search_documents as document
  where document.is_active = true
    and document.embedding is not null
    and (
      filter_source_types is null
      or cardinality(filter_source_types) = 0
      or document.source_type = any (filter_source_types)
    )
    and (
      filter_category_id is null
      or document.category_id = filter_category_id
    )
    and (
      filter_city is null
      or lower(coalesce(document.city, '')) = lower(filter_city)
    )
    and (
      filter_province is null
      or lower(coalesce(document.province, '')) = lower(filter_province)
    )
    and (
      filter_region is null
      or lower(coalesce(document.region, '')) = lower(filter_region)
    )
  order by document.embedding <=> cast(query_embedding_text as vector(1536))
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_supplier_search_documents(
  text,
  integer,
  bigint,
  text,
  text,
  text,
  text[]
) to authenticated, service_role;
