import { createClient } from "@/lib/supabase/server";
import {
  resolveBuyerVerificationStatus,
  resolveSupplierVerificationStatus,
} from "@/lib/verification/status";
import type { DocumentVerificationStatus } from "@/lib/verification/types";

const BUYER_DTI_DOCUMENT_NAMES = [
  "DTI Business Registration Certificate",
  "DTI Certificate",
];

const REQUIRED_SUPPLIER_DOCUMENT_NAMES = [
  "DTI Business Registration Certificate",
  "Mayor's Permit",
  "BIR Certificate",
];

type BuyerDocumentRow = {
  status: string | null;
  manual_review_required: boolean | null;
  document_types:
    | {
        document_type_name: string;
      }
    | Array<{
        document_type_name: string;
      }>
    | null;
};

type SupplierDocumentRow = BuyerDocumentRow;

type SiteVerificationCheckRow = {
  status: string;
  manual_review_required: boolean;
  created_at: string;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function readDocumentTypeName(
  row: BuyerDocumentRow | SupplierDocumentRow
) {
  if (Array.isArray(row.document_types)) {
    return row.document_types[0]?.document_type_name ?? "";
  }

  return row.document_types?.document_type_name ?? "";
}

function toDocumentVerificationStatus(
  value: string | null | undefined
): DocumentVerificationStatus | null {
  if (
    value === "pending" ||
    value === "processing" ||
    value === "approved" ||
    value === "rejected" ||
    value === "review_required"
  ) {
    return value;
  }

  return null;
}

function mapSiteCheckStatusToDocumentStatus(
  value: string | null | undefined
): DocumentVerificationStatus | null {
  if (
    value === "pending" ||
    value === "processing" ||
    value === "approved" ||
    value === "rejected" ||
    value === "review_required"
  ) {
    return value;
  }

  if (value === "error") {
    return "review_required";
  }

  return null;
}

export async function syncBuyerVerificationProfileFromDocuments(profileId: number) {
  const supabase = await createClient();

  const { data: buyerDocuments, error: buyerDocumentsError } = await supabase
    .from("business_documents")
    .select(
      `
        status,
        manual_review_required,
        document_types!business_documents_doc_type_id_fkey (
          document_type_name
        )
      `
    )
    .eq("profile_id", profileId);

  if (buyerDocumentsError) {
    throw new Error(
      buyerDocumentsError.message || "Failed to load buyer verification documents."
    );
  }

  const safeBuyerDocuments = (buyerDocuments as BuyerDocumentRow[] | null) ?? [];

  const dtiDocument = safeBuyerDocuments.find((row) =>
    BUYER_DTI_DOCUMENT_NAMES.some(
      (name) => normalizeName(name) === normalizeName(readDocumentTypeName(row))
    )
  );

  const verificationStatus = resolveBuyerVerificationStatus({
    dtiDocumentStatus: toDocumentVerificationStatus(dtiDocument?.status),
    manualReviewRequired: Boolean(dtiDocument?.manual_review_required),
  });

  const { error } = await supabase
    .from("buyer_profiles")
    .update({
      verification_status: verificationStatus,
      verification_last_evaluated_at: new Date().toISOString(),
      verification_submitted_at: dtiDocument ? new Date().toISOString() : null,
    })
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message || "Failed to update buyer verification status.");
  }

  return verificationStatus;
}

export async function syncSupplierVerificationProfileFromArtifacts(profileId: number) {
  const supabase = await createClient();

  const [
    { data: supplierDocuments, error: supplierDocumentsError },
    { data: latestSiteCheck, error: latestSiteCheckError },
  ] = await Promise.all([
    supabase
      .from("business_documents")
      .select(
        `
          status,
          manual_review_required,
          document_types!business_documents_doc_type_id_fkey (
            document_type_name
          )
        `
      )
      .eq("profile_id", profileId),
    supabase
      .from("site_verification_checks")
      .select("status, manual_review_required, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SiteVerificationCheckRow>(),
  ]);

  if (supplierDocumentsError) {
    throw new Error(
      supplierDocumentsError.message || "Failed to load supplier verification documents."
    );
  }

  if (latestSiteCheckError) {
    throw new Error(
      latestSiteCheckError.message || "Failed to load site verification status."
    );
  }

  const safeDocuments = (supplierDocuments as SupplierDocumentRow[] | null) ?? [];

  const requiredDocumentStatuses = REQUIRED_SUPPLIER_DOCUMENT_NAMES.map((documentName) => {
    const matchedDocument = safeDocuments.find(
      (row) =>
        normalizeName(readDocumentTypeName(row)) === normalizeName(documentName)
    );

    return toDocumentVerificationStatus(matchedDocument?.status);
  });

  const manualReviewRequired =
    safeDocuments.some((row) => Boolean(row.manual_review_required)) ||
    Boolean(latestSiteCheck?.manual_review_required);

  const verificationStatus = resolveSupplierVerificationStatus({
    requiredDocumentStatuses,
    siteVerificationStatus: mapSiteCheckStatusToDocumentStatus(latestSiteCheck?.status),
    manualReviewRequired,
  });

  const isApproved = verificationStatus === "approved";

  const { error } = await supabase
    .from("supplier_profiles")
    .update({
      verification_status: verificationStatus,
      verification_last_evaluated_at: new Date().toISOString(),
      verification_submitted_at:
        verificationStatus === "incomplete" ? null : new Date().toISOString(),
      verified: isApproved,
      verified_badge: isApproved,
      verified_at: isApproved ? new Date().toISOString() : null,
    })
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message || "Failed to update supplier verification status.");
  }

  return verificationStatus;
}
