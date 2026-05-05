export type SearchEmbeddingTaskType =
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY";

export type SupplierSearchDocumentSourceType = "profile" | "product";

export type SupplierSearchDocumentRecord = {
  search_document_id: number;
  supplier_id: number;
  profile_id: number;
  source_type: SupplierSearchDocumentSourceType;
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
  is_active: boolean;
  metadata: Record<string, unknown>;
  embedding_model: string | null;
  embedding: number[] | null;
  last_indexed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierSearchDocumentInput = {
  supplier_id: number;
  profile_id: number;
  source_type: SupplierSearchDocumentSourceType;
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
  is_active: boolean;
  metadata: Record<string, unknown>;
};

export type SupplierSearchDocumentMatch = {
  search_document_id: number;
  supplier_id: number;
  profile_id: number;
  source_type: SupplierSearchDocumentSourceType;
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
  metadata: Record<string, unknown>;
  similarity: number;
};

export type SupplierSearchIndexSyncResult = {
  supplierId: number;
  profileId: number;
  documentsIndexed: number;
  profileDocumentsIndexed: number;
  productDocumentsIndexed: number;
};

export type SupplierSearchIndexQueueStatus =
  | "pending"
  | "partial"
  | "indexed";

export type SupplierSearchIndexQueueItem = {
  supplierId: number;
  profileId: number;
  businessName: string;
  city: string | null;
  province: string | null;
  verifiedBadge: boolean;
  publishedProductCount: number;
  activeDocumentCount: number;
  embeddedDocumentCount: number;
  lastIndexedAt: string | null;
  status: SupplierSearchIndexQueueStatus;
};

export type SupplierSearchIndexOverview = {
  totalSuppliers: number;
  suppliersWithPublishedProducts: number;
  indexedSuppliers: number;
  partialSuppliers: number;
  pendingSuppliers: number;
  totalDocuments: number;
  activeDocuments: number;
  embeddedDocuments: number;
};

export type SupplierSearchIndexBatchItemResult = {
  supplierId: number;
  businessName: string;
  status: "indexed" | "failed";
  documentsIndexed: number;
  errorMessage: string | null;
};

export type SupplierSearchIndexBatchResult = {
  attemptedSuppliers: number;
  indexedSuppliers: number;
  failedSuppliers: number;
  results: SupplierSearchIndexBatchItemResult[];
};
