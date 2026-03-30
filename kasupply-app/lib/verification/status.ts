import type {
  DocumentVerificationStatus,
  ProfileVerificationStatus,
} from "@/lib/verification/types";

type ResolveBuyerVerificationStatusInput = {
  dtiDocumentStatus?: DocumentVerificationStatus | null;
  manualReviewRequired?: boolean;
};

type ResolveSupplierVerificationStatusInput = {
  requiredDocumentStatuses: Array<DocumentVerificationStatus | null>;
  siteVerificationStatus?: DocumentVerificationStatus | null;
  manualReviewRequired?: boolean;
};

function hasStatus(
  statuses: Array<DocumentVerificationStatus | null>,
  target: DocumentVerificationStatus
) {
  return statuses.some((status) => status === target);
}

export function resolveBuyerVerificationStatus({
  dtiDocumentStatus,
  manualReviewRequired = false,
}: ResolveBuyerVerificationStatusInput): ProfileVerificationStatus {
  if (!dtiDocumentStatus) {
    return "incomplete";
  }

  if (manualReviewRequired || dtiDocumentStatus === "review_required") {
    return "review_required";
  }

  if (dtiDocumentStatus === "approved") {
    return "approved";
  }

  if (dtiDocumentStatus === "rejected") {
    return "rejected";
  }

  if (dtiDocumentStatus === "pending" || dtiDocumentStatus === "processing") {
    return "under_review";
  }

  return "submitted";
}

export function resolveSupplierVerificationStatus({
  requiredDocumentStatuses,
  siteVerificationStatus,
  manualReviewRequired = false,
}: ResolveSupplierVerificationStatusInput): ProfileVerificationStatus {
  const statuses = [...requiredDocumentStatuses, siteVerificationStatus ?? null];

  if (
    requiredDocumentStatuses.length === 0 ||
    requiredDocumentStatuses.some((status) => !status) ||
    !siteVerificationStatus
  ) {
    return "incomplete";
  }

  if (manualReviewRequired || hasStatus(statuses, "review_required")) {
    return "review_required";
  }

  if (hasStatus(statuses, "rejected")) {
    return "rejected";
  }

  if (statuses.every((status) => status === "approved")) {
    return "approved";
  }

  if (hasStatus(statuses, "processing") || hasStatus(statuses, "pending")) {
    return "under_review";
  }

  return "submitted";
}
