import {
  SEARCH_BACKFILL_DEFAULT_BATCH_SIZE,
  SEARCH_DEFAULT_MATCH_COUNT,
  SEARCH_EMBEDDING_MODEL,
} from "@/lib/search/constants";
import { buildSupplierSearchDocumentsForSupplier } from "@/lib/search/documents";
import {
  generateSearchEmbedding,
  isSearchEmbeddingConfigured,
  toVectorLiteral,
} from "@/lib/search/gemini";
import type {
  SupplierSearchIndexBatchResult,
  SupplierSearchIndexOverview,
  SupplierSearchIndexQueueItem,
  SupplierSearchDocumentInput,
  SupplierSearchDocumentMatch,
  SupplierSearchIndexSyncResult,
} from "@/lib/search/types";
import { createAdminClient } from "@/lib/supabase/admin";

type MatchSupplierSearchDocumentsRow = {
  search_document_id: number;
  supplier_id: number;
  profile_id: number;
  source_type: "profile" | "product";
  source_id: number;
  title: string;
  content: string;
  category_id: number | null;
  moq: number | null;
  max_capacity: number | null;
  unit: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  metadata: Record<string, unknown> | null;
  similarity: number | null;
};

type SearchIndexSupplierRow = {
  supplier_id: number;
  profile_id: number;
  verified_badge: boolean;
  business_profiles:
    | {
        business_name: string | null;
        city: string | null;
        province: string | null;
      }
    | {
        business_name: string | null;
        city: string | null;
        province: string | null;
      }[]
    | null;
};

type SearchIndexProductRow = {
  supplier_id: number;
  product_id: number;
};

type SearchIndexDocumentRow = {
  supplier_id: number;
  is_active: boolean;
  embedding_model: string | null;
  last_indexed_at: string | null;
};

function getSearchAdminClient() {
  const supabase = createAdminClient();

  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return supabase;
}

function isSearchIndexSyncConfigured() {
  return isSearchEmbeddingConfigured() && createAdminClient() !== null;
}

function getSingleRelationRow<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function loadSupplierSearchIndexQueueData() {
  const supabase = getSearchAdminClient();
  const { data: supplierRows, error: supplierError } = await supabase
    .from("supplier_profiles")
    .select(
      `
      supplier_id,
      profile_id,
      verified_badge,
      business_profiles (
        business_name,
        city,
        province
      )
    `
    )
    .order("supplier_id", { ascending: true });

  if (supplierError) {
    throw new Error(supplierError.message || "Failed to load supplier search index queue.");
  }

  const safeSupplierRows = (supplierRows as SearchIndexSupplierRow[] | null) ?? [];
  const supplierIds = safeSupplierRows.map((row) => row.supplier_id);

  const [productsResult, documentsResult] = await Promise.all([
    supplierIds.length > 0
      ? supabase
          .from("products")
          .select("supplier_id, product_id")
          .in("supplier_id", supplierIds)
          .eq("is_published", true)
          .returns<SearchIndexProductRow[]>()
      : Promise.resolve({ data: [] as SearchIndexProductRow[], error: null }),
    supplierIds.length > 0
      ? supabase
          .from("supplier_search_documents")
          .select("supplier_id, is_active, embedding_model, last_indexed_at")
          .in("supplier_id", supplierIds)
          .returns<SearchIndexDocumentRow[]>()
      : Promise.resolve({ data: [] as SearchIndexDocumentRow[], error: null }),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Failed to load published products for search index.");
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message || "Failed to load search index documents.");
  }

  const publishedProductsBySupplierId = new Map<number, number>();
  for (const product of productsResult.data ?? []) {
    publishedProductsBySupplierId.set(
      product.supplier_id,
      (publishedProductsBySupplierId.get(product.supplier_id) ?? 0) + 1
    );
  }

  const documentStatsBySupplierId = new Map<
    number,
    {
      totalDocuments: number;
      activeDocuments: number;
      embeddedDocuments: number;
      lastIndexedAt: string | null;
    }
  >();

  for (const row of documentsResult.data ?? []) {
    const current = documentStatsBySupplierId.get(row.supplier_id) ?? {
      totalDocuments: 0,
      activeDocuments: 0,
      embeddedDocuments: 0,
      lastIndexedAt: null,
    };

    current.totalDocuments += 1;
    if (row.is_active) {
      current.activeDocuments += 1;
    }
    if (row.embedding_model) {
      current.embeddedDocuments += 1;
    }
    if (
      row.last_indexed_at &&
      (current.lastIndexedAt == null ||
        new Date(row.last_indexed_at).getTime() > new Date(current.lastIndexedAt).getTime())
    ) {
      current.lastIndexedAt = row.last_indexed_at;
    }

    documentStatsBySupplierId.set(row.supplier_id, current);
  }

  const queue = safeSupplierRows.map((row) => {
    const profile = getSingleRelationRow(row.business_profiles);
    const documentStats = documentStatsBySupplierId.get(row.supplier_id) ?? {
      totalDocuments: 0,
      activeDocuments: 0,
      embeddedDocuments: 0,
      lastIndexedAt: null,
    };

    let status: SupplierSearchIndexQueueItem["status"] = "pending";

    if (
      documentStats.activeDocuments > 0 &&
      documentStats.embeddedDocuments >= documentStats.activeDocuments
    ) {
      status = "indexed";
    } else if (documentStats.totalDocuments > 0 || documentStats.embeddedDocuments > 0) {
      status = "partial";
    }

    return {
      supplierId: row.supplier_id,
      profileId: row.profile_id,
      businessName: profile?.business_name?.trim() || `Supplier #${row.supplier_id}`,
      city: profile?.city ?? null,
      province: profile?.province ?? null,
      verifiedBadge: row.verified_badge,
      publishedProductCount: publishedProductsBySupplierId.get(row.supplier_id) ?? 0,
      activeDocumentCount: documentStats.activeDocuments,
      embeddedDocumentCount: documentStats.embeddedDocuments,
      lastIndexedAt: documentStats.lastIndexedAt,
      status,
    } satisfies SupplierSearchIndexQueueItem;
  });

  return queue;
}

async function embedDocument(document: SupplierSearchDocumentInput) {
  const embedding = await generateSearchEmbedding({
    text: `${document.title}\n\n${document.content}`,
    taskType: "RETRIEVAL_DOCUMENT",
    title: document.title,
  });

  return {
    ...document,
    embedding_model: SEARCH_EMBEDDING_MODEL,
    embedding: toVectorLiteral(embedding),
    last_indexed_at: new Date().toISOString(),
  };
}

export async function syncSupplierSearchIndexForSupplier(
  supplierId: number
): Promise<SupplierSearchIndexSyncResult> {
  const supabase = getSearchAdminClient();
  const { supplierId: resolvedSupplierId, profileId, documents, profileDocuments, productDocuments } =
    await buildSupplierSearchDocumentsForSupplier(supplierId);

  const [deactivateProfileResult, deactivateProductResult] = await Promise.all([
    supabase
      .from("supplier_search_documents")
      .update({ is_active: false })
      .eq("supplier_id", resolvedSupplierId)
      .eq("source_type", "profile"),
    supabase
      .from("supplier_search_documents")
      .update({ is_active: false })
      .eq("supplier_id", resolvedSupplierId)
      .eq("source_type", "product"),
  ]);

  if (deactivateProfileResult.error) {
    throw new Error(
      deactivateProfileResult.error.message || "Failed to deactivate existing profile search documents."
    );
  }

  if (deactivateProductResult.error) {
    throw new Error(
      deactivateProductResult.error.message || "Failed to deactivate existing product search documents."
    );
  }

  if (documents.length === 0) {
    return {
      supplierId: resolvedSupplierId,
      profileId,
      documentsIndexed: 0,
      profileDocumentsIndexed: 0,
      productDocumentsIndexed: 0,
    };
  }

  const indexedDocuments = await Promise.all(documents.map((document) => embedDocument(document)));
  const { error: upsertError } = await supabase
    .from("supplier_search_documents")
    .upsert(indexedDocuments, {
      onConflict: "source_type,source_id",
    });

  if (upsertError) {
    throw new Error(upsertError.message || "Failed to upsert supplier search documents.");
  }

  return {
    supplierId: resolvedSupplierId,
    profileId,
    documentsIndexed: indexedDocuments.length,
    profileDocumentsIndexed: profileDocuments.length,
    productDocumentsIndexed: productDocuments.length,
  };
}

export async function getSupplierSearchIndexQueue() {
  return loadSupplierSearchIndexQueueData();
}

export async function getSupplierSearchIndexOverview(): Promise<SupplierSearchIndexOverview> {
  const queue = await loadSupplierSearchIndexQueueData();
  const supabase = getSearchAdminClient();
  const { data: documentRows, error: documentError } = await supabase
    .from("supplier_search_documents")
    .select("is_active, embedding_model");

  if (documentError) {
    throw new Error(documentError.message || "Failed to load search index overview.");
  }

  let totalDocuments = 0;
  let activeDocuments = 0;
  let embeddedDocuments = 0;

  for (const row of documentRows ?? []) {
    totalDocuments += 1;
    if (row.is_active) {
      activeDocuments += 1;
    }
    if (row.embedding_model) {
      embeddedDocuments += 1;
    }
  }

  return {
    totalSuppliers: queue.length,
    suppliersWithPublishedProducts: queue.filter((item) => item.publishedProductCount > 0).length,
    indexedSuppliers: queue.filter((item) => item.status === "indexed").length,
    partialSuppliers: queue.filter((item) => item.status === "partial").length,
    pendingSuppliers: queue.filter((item) => item.status === "pending").length,
    totalDocuments,
    activeDocuments,
    embeddedDocuments,
  };
}

export async function backfillSupplierSearchIndexBatch(params?: {
  limit?: number;
  includeIndexed?: boolean;
}): Promise<SupplierSearchIndexBatchResult> {
  const queue = await loadSupplierSearchIndexQueueData();
  const limit = Math.max(1, params?.limit ?? SEARCH_BACKFILL_DEFAULT_BATCH_SIZE);
  const candidates = (params?.includeIndexed ? queue : queue.filter((item) => item.status !== "indexed"))
    .slice(0, limit);

  const results: SupplierSearchIndexBatchResult["results"] = [];

  for (const item of candidates) {
    try {
      const syncResult = await syncSupplierSearchIndexForSupplier(item.supplierId);
      results.push({
        supplierId: item.supplierId,
        businessName: item.businessName,
        status: "indexed",
        documentsIndexed: syncResult.documentsIndexed,
        errorMessage: null,
      });
    } catch (error) {
      results.push({
        supplierId: item.supplierId,
        businessName: item.businessName,
        status: "failed",
        documentsIndexed: 0,
        errorMessage: error instanceof Error ? error.message : "Unknown indexing error.",
      });
    }
  }

  return {
    attemptedSuppliers: candidates.length,
    indexedSuppliers: results.filter((item) => item.status === "indexed").length,
    failedSuppliers: results.filter((item) => item.status === "failed").length,
    results,
  };
}

export async function safeAutoSyncSupplierSearchIndexForSupplier(params: {
  supplierId: number;
  reason: string;
}) {
  if (!params.supplierId || !Number.isFinite(params.supplierId)) {
    return;
  }

  if (!isSearchIndexSyncConfigured()) {
    return;
  }

  try {
    await syncSupplierSearchIndexForSupplier(params.supplierId);
  } catch (error) {
    console.error(
      `Search index auto-sync failed for supplier ${params.supplierId} during ${params.reason}.`,
      error
    );
  }
}

export async function findSupplierSearchDocuments(params: {
  query: string;
  matchCount?: number;
  categoryId?: number | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  sourceTypes?: Array<"profile" | "product">;
}): Promise<SupplierSearchDocumentMatch[]> {
  const supabase = getSearchAdminClient();
  const query = params.query.trim();

  if (!query) {
    return [];
  }

  const embedding = await generateSearchEmbedding({
    text: query,
    taskType: "RETRIEVAL_QUERY",
  });

  const { data, error } = await supabase.rpc("match_supplier_search_documents", {
    query_embedding_text: toVectorLiteral(embedding),
    match_count: params.matchCount ?? SEARCH_DEFAULT_MATCH_COUNT,
    filter_category_id: params.categoryId ?? null,
    filter_city: params.city?.trim() || null,
    filter_province: params.province?.trim() || null,
    filter_region: params.region?.trim() || null,
    filter_source_types: params.sourceTypes ?? null,
  });

  if (error) {
    throw new Error(error.message || "Failed to run supplier search.");
  }

  return ((data as MatchSupplierSearchDocumentsRow[] | null) ?? []).map((row) => ({
    search_document_id: row.search_document_id,
    supplier_id: row.supplier_id,
    profile_id: row.profile_id,
    source_type: row.source_type,
    source_id: row.source_id,
    title: row.title,
    content: row.content,
    category_id: row.category_id,
    moq: row.moq == null ? null : Number(row.moq),
    max_capacity: row.max_capacity == null ? null : Number(row.max_capacity),
    unit: row.unit,
    city: row.city,
    province: row.province,
    region: row.region,
    metadata: row.metadata ?? {},
    similarity: row.similarity == null ? 0 : Number(row.similarity),
  }));
}
