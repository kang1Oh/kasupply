import { createClient } from "@/lib/supabase/server";
import { getSupplierDocumentRequirements } from "@/lib/supplier-requirements";
import { isBuyerDtiDocumentTypeName } from "@/lib/verification/document-rules";
import {
  resolveBuyerVerificationStatus,
  resolveSupplierVerificationStatus,
} from "@/lib/verification/status";
import type { DocumentVerificationStatus } from "@/lib/verification/types";

type BuyerDocumentRow = {
  status: string | null;
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

type SupplierProfileRow = {
  verified: boolean;
  verified_at: string | null;
  verified_badge: boolean;
  verification_status: string | null;
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
    value === "rejected"
  ) {
    return value;
  }

  return null;
}

export async function syncBuyerVerificationProfileFromDocuments(profileId: number) {
  const supabase = await createClient();

  const [{ data: buyerDocuments, error: buyerDocumentsError }, { data: buyerProfile, error: buyerProfileError }] =
    await Promise.all([
      supabase
        .from("business_documents")
        .select(
          `
            status,
            document_types!business_documents_doc_type_id_fkey (
              document_type_name
            )
          `
        )
        .eq("profile_id", profileId),
      supabase
        .from("buyer_profiles")
        .select("verification_status")
        .eq("profile_id", profileId)
        .maybeSingle<{ verification_status: string | null }>(),
    ]);

  if (buyerDocumentsError) {
    throw new Error(
      buyerDocumentsError.message || "Failed to load buyer verification documents."
    );
  }

  if (buyerProfileError) {
    throw new Error(
      buyerProfileError.message || "Failed to load buyer verification profile."
    );
  }

  const safeBuyerDocuments = (buyerDocuments as BuyerDocumentRow[] | null) ?? [];

  const dtiDocument = safeBuyerDocuments.find((row) =>
    isBuyerDtiDocumentTypeName(readDocumentTypeName(row))
  );

  const alreadyApproved = buyerProfile?.verification_status === "approved";
  const currentDocumentStatus = toDocumentVerificationStatus(dtiDocument?.status);

  if (alreadyApproved) {
    const { error } = await supabase
      .from("buyer_profiles")
      .update({
        verification_status: "approved",
        verification_last_evaluated_at: new Date().toISOString(),
        verification_submitted_at: dtiDocument ? new Date().toISOString() : null,
      })
      .eq("profile_id", profileId);

    if (error) {
      throw new Error(error.message || "Failed to preserve buyer approval status.");
    }

    return "approved";
  }

  const verificationStatus = resolveBuyerVerificationStatus({
    dtiDocumentStatus: currentDocumentStatus,
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
  const requiredSupplierDocumentNames = (
    await getSupplierDocumentRequirements(supabase)
  )
    .filter((requirement) => requirement.isActive && requirement.showInOnboarding && requirement.isRequired)
    .map((requirement) => requirement.label);

  const [
    { data: supplierDocuments, error: supplierDocumentsError },
    { data: supplierProfile, error: supplierProfileError },
  ] = await Promise.all([
    supabase
      .from("business_documents")
      .select(
        `
          status,
          document_types!business_documents_doc_type_id_fkey (
            document_type_name
          )
        `
      )
      .eq("profile_id", profileId),
    supabase
      .from("supplier_profiles")
      .select("verified, verified_at, verified_badge, verification_status")
      .eq("profile_id", profileId)
      .maybeSingle<SupplierProfileRow>(),
  ]);

  if (supplierDocumentsError) {
    throw new Error(
      supplierDocumentsError.message || "Failed to load supplier verification documents."
    );
  }

  if (supplierProfileError) {
    throw new Error(
      supplierProfileError.message || "Failed to load supplier verification profile."
    );
  }

  const safeDocuments = (supplierDocuments as SupplierDocumentRow[] | null) ?? [];

  const requiredDocumentStatuses = requiredSupplierDocumentNames.map((documentName) => {
    const matchedDocument = safeDocuments.find(
      (row) =>
        normalizeName(readDocumentTypeName(row)) === normalizeName(documentName)
    );

    return toDocumentVerificationStatus(matchedDocument?.status);
  });

  const alreadyApproved =
    Boolean(supplierProfile?.verified) || supplierProfile?.verification_status === "approved";
  const hasFreshBlockingArtifact =
    requiredDocumentStatuses.some(
      (status) =>
        status === "pending" ||
        status === "processing" ||
        status === "rejected"
    );

  if (alreadyApproved && !hasFreshBlockingArtifact) {
    const { error } = await supabase
      .from("supplier_profiles")
      .update({
        verification_status: "approved",
        verification_last_evaluated_at: new Date().toISOString(),
        verified: true,
        verified_badge: true,
        verified_at: supplierProfile?.verified_at ?? new Date().toISOString(),
      })
      .eq("profile_id", profileId);

    if (error) {
      throw new Error(error.message || "Failed to preserve supplier approval status.");
    }

    return "approved";
  }

  const verificationStatus = resolveSupplierVerificationStatus({
    requiredDocumentStatuses,
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
