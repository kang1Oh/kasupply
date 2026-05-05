import type {
  DocumentVerificationStatus,
  ProfileVerificationStatus,
} from "@/lib/verification/types";

type ResolveBuyerVerificationStatusInput = {
  dtiDocumentStatus?: DocumentVerificationStatus | null;
};

type ResolveSupplierVerificationStatusInput = {
  requiredDocumentStatuses: Array<DocumentVerificationStatus | null>;
};

function hasStatus(
  statuses: Array<DocumentVerificationStatus | null>,
  target: DocumentVerificationStatus
) {
  return statuses.some((status) => status === target);
}

export function resolveBuyerVerificationStatus({
  dtiDocumentStatus,
}: ResolveBuyerVerificationStatusInput): ProfileVerificationStatus {
  if (!dtiDocumentStatus) {
    return "incomplete";
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
}: ResolveSupplierVerificationStatusInput): ProfileVerificationStatus {
  const documentStatuses = [...requiredDocumentStatuses];

  if (documentStatuses.length === 0 || documentStatuses.some((status) => !status)) {
    return "incomplete";
  }

  if (hasStatus(documentStatuses, "rejected")) {
    return "rejected";
  }

  if (hasStatus(documentStatuses, "processing") || hasStatus(documentStatuses, "pending")) {
    return "under_review";
  }

  if (documentStatuses.every((status) => status === "approved")) {
    return "approved";
  }

  return "submitted";
}
