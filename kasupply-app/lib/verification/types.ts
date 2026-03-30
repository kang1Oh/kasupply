export const DOCUMENT_VERIFICATION_STATUSES = [
  "pending",
  "processing",
  "approved",
  "rejected",
  "review_required",
] as const;

export const PROFILE_VERIFICATION_STATUSES = [
  "incomplete",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "review_required",
] as const;

export const VERIFICATION_RUN_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "review_required",
  "cancelled",
] as const;

export const VERIFICATION_RUN_KINDS = [
  "buyer_document",
  "supplier_document",
  "site_verification",
  "buyer_onboarding",
  "supplier_onboarding",
] as const;

export const VERIFICATION_TARGET_TYPES = [
  "business_document",
  "site_verification",
  "buyer_profile",
  "supplier_profile",
] as const;

export type DocumentVerificationStatus =
  (typeof DOCUMENT_VERIFICATION_STATUSES)[number];

export type ProfileVerificationStatus =
  (typeof PROFILE_VERIFICATION_STATUSES)[number];

export type VerificationRunStatus = (typeof VERIFICATION_RUN_STATUSES)[number];
export type VerificationRunKind = (typeof VERIFICATION_RUN_KINDS)[number];
export type VerificationTargetType = (typeof VERIFICATION_TARGET_TYPES)[number];

export type VerificationProviderSnapshot = {
  gemini: boolean;
  maps: boolean;
  vision: boolean;
};

export type DocumentFieldRequirement = {
  key: string;
  label: string;
  required: boolean;
};

export type DocumentCheckDefinition = {
  key: string;
  label: string;
  description: string;
};

export type DocumentVerificationBlueprint = {
  code: "dti" | "mayors_permit" | "bir_certificate";
  label: string;
  requiredFields: DocumentFieldRequirement[];
  checks: DocumentCheckDefinition[];
};

export type DocumentVerificationSummary = {
  status: DocumentVerificationStatus;
  score: number | null;
  manualReviewRequired: boolean;
  extractedFields: Record<string, unknown>;
  failedChecks: string[];
  passedChecks: string[];
  notes: string[];
};

export type SiteVerificationSummary = {
  status: DocumentVerificationStatus;
  similarityScore: number | null;
  deliverabilityStatus: "pending" | "deliverable" | "undeliverable" | "unknown";
  streetViewStatus: "pending" | "available" | "unavailable" | "unknown";
  manualReviewRequired: boolean;
  notes: string[];
};

export type QueueVerificationRunInput = {
  profileId: number;
  targetType: VerificationTargetType;
  targetId?: number | null;
  kind: VerificationRunKind;
  triggeredBy?: "system" | "user" | "admin" | "retry";
  inputSnapshot?: Record<string, unknown>;
  providerStatus?: Partial<VerificationProviderSnapshot>;
};
