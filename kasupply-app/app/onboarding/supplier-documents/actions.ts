"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getDocumentVerificationBlueprint,
  isBuyerDtiDocumentTypeName,
} from "@/lib/verification/document-rules";
import {
  safeQueueDocumentVerification,
  safeSyncSupplierVerificationProfile,
} from "@/lib/verification/onboarding";
import { getSupplierDocumentRequirements } from "@/lib/supplier-requirements";

type ExistingDocumentRow = {
  doc_id: number;
  file_url: string;
  status?: string | null;
  review_notes?: string | null;
};

type SupplierDocumentTypeRow = {
  doc_type_id: number;
  document_type_name: string;
};

type SupplierVerificationDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  file_url: string;
  status: string | null;
  review_notes: string | null;
  document_types:
    | {
        document_type_name: string;
      }
    | Array<{
        document_type_name: string;
      }>
    | null;
};

type SavedSupplierDocumentRow = {
  doc_id: number;
  file_url: string;
  status: string | null;
  review_notes: string | null;
};

export type SupplierDocumentActionResult = {
  ok: boolean;
  docTypeId: number;
  docId: number | null;
  status: string | null;
  reviewNotes: string | null;
  fileUrl: string | null;
  message: string;
};

export type SupplierBulkVerificationResult = {
  ok: boolean;
  message: string;
  pendingCount: number;
  processedCount: number;
  approvedCount: number;
  rejectedCount: number;
  blockedByDti: boolean;
  documentResults: Array<{
    docTypeId: number;
    status: string | null;
    reviewNotes: string | null;
  }>;
};

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ALLOWED_DTI_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

async function loadAuthenticatedSupplierContext() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  return {
    supabase,
    businessProfile,
  };
}

function revalidateSupplierDocumentPaths() {
  revalidatePath("/onboarding/supplier-documents");
  revalidatePath("/dashboard");
  revalidatePath("/supplier/dashboard");
}

function readDocumentTypeName(
  documentTypes: SupplierVerificationDocumentRow["document_types"] | SupplierDocumentTypeRow | null
) {
  if (!documentTypes) {
    return "";
  }

  if (Array.isArray(documentTypes)) {
    return documentTypes[0]?.document_type_name ?? "";
  }

  return documentTypes.document_type_name ?? "";
}

function getSupplierVerificationPriority(documentTypeName: string) {
  const code = getDocumentVerificationBlueprint(documentTypeName)?.code;

  if (code === "dti") {
    return 0;
  }

  if (code === "mayors_permit") {
    return 1;
  }

  if (code === "bir_certificate") {
    return 2;
  }

  if (code === "fda_lto") {
    return 3;
  }

  return 10;
}

export async function uploadSupplierDocument(
  formData: FormData
): Promise<SupplierDocumentActionResult> {
  const { supabase, businessProfile } = await loadAuthenticatedSupplierContext();

  const doc_type_id = Number(formData.get("doc_type_id"));
  const file = formData.get("document") as File | null;

  if (!doc_type_id || Number.isNaN(doc_type_id)) {
    throw new Error("Document type is required.");
  }

  if (!file || file.size === 0) {
    throw new Error("Document file is required.");
  }

  const { data: existingDocumentType, error: docTypeError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .eq("doc_type_id", doc_type_id)
    .single<SupplierDocumentTypeRow>();

  if (docTypeError || !existingDocumentType) {
    throw new Error("Invalid document type.");
  }

  const documentRequirements = await getSupplierDocumentRequirements(supabase);
  const allowedDocumentIds = new Set(
    documentRequirements
      .filter((requirement) => requirement.isActive && requirement.showInOnboarding)
      .map((requirement) => requirement.docTypeId),
  );

  if (!allowedDocumentIds.has(doc_type_id)) {
    throw new Error("This document type is not currently available for supplier onboarding.");
  }

  const isDtiDocument = isBuyerDtiDocumentTypeName(
    existingDocumentType.document_type_name
  );

  if (isDtiDocument) {
    if (!ALLOWED_DTI_IMAGE_MIME_TYPES.has(file.type)) {
      throw new Error(
        "DTI Business Name Registration Certificate must be uploaded as JPG, JPEG, or PNG so its QR code can be verified."
      );
    }
  } else if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    throw new Error("Supplier documents must be uploaded as PDF, JPG, or PNG.");
  }

  const { data: existingDocument } = await supabase
    .from("business_documents")
    .select("doc_id, file_url")
    .eq("profile_id", businessProfile.profile_id)
    .eq("doc_type_id", doc_type_id)
    .maybeSingle<ExistingDocumentRow>();

  const fileExt = file.name.split(".").pop() || "pdf";
  const safeDocName = existingDocumentType.document_type_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const fileName = `${safeDocName}-${Date.now()}.${fileExt}`;
  const filePath = `${businessProfile.profile_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  let savedDocumentId: number | null = existingDocument?.doc_id ?? null;

  if (existingDocument) {
    if (existingDocument.file_url && existingDocument.file_url !== filePath) {
      await supabase.storage
        .from("business-documents")
        .remove([existingDocument.file_url]);
    }

    const { error: updateError } = await supabase
      .from("business_documents")
      .update({
        file_url: filePath,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        verified_at: null,
        ocr_extracted_data: null,
        ocr_raw_text: null,
        ocr_extracted_fields: {},
        metadata_analysis: {},
        verification_analysis: {},
        verification_score: null,
        manual_review_required: false,
        review_notes: null,
      })
      .eq("doc_id", existingDocument.doc_id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: insertedDocument, error: insertError } = await supabase
      .from("business_documents")
      .insert({
        profile_id: businessProfile.profile_id,
        doc_type_id,
        file_url: filePath,
        ocr_extracted_data: null,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        verified_at: null,
        ocr_raw_text: null,
        ocr_extracted_fields: {},
        metadata_analysis: {},
        verification_analysis: {},
        verification_score: null,
        manual_review_required: false,
        review_notes: null,
      })
      .select("doc_id")
      .single();

    if (insertError || !insertedDocument) {
      throw new Error(insertError?.message || "Failed to save uploaded document.");
    }

    savedDocumentId = insertedDocument.doc_id;
  }

  if (savedDocumentId) {
    await safeSyncSupplierVerificationProfile(businessProfile.profile_id);
  }

  revalidateSupplierDocumentPaths();

  return {
    ok: true,
    docTypeId: doc_type_id,
    docId: savedDocumentId,
    status: "pending",
    reviewNotes: null,
    fileUrl: filePath,
    message: "Document uploaded. Click Verify All Documents when you are ready to process it.",
  };
}

export async function processSupplierDocumentVerification(
  formData: FormData
): Promise<SupplierDocumentActionResult> {
  const { supabase, businessProfile } = await loadAuthenticatedSupplierContext();
  const doc_type_id = Number(formData.get("doc_type_id"));

  if (!doc_type_id || Number.isNaN(doc_type_id)) {
    throw new Error("Document type is required.");
  }

  const { data: existingDocumentType, error: docTypeError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .eq("doc_type_id", doc_type_id)
    .single<SupplierDocumentTypeRow>();

  if (docTypeError || !existingDocumentType) {
    throw new Error("Invalid document type.");
  }

  const { data: uploadedDocument, error: uploadedDocumentError } = await supabase
    .from("business_documents")
    .select("doc_id, file_url, status, review_notes")
    .eq("profile_id", businessProfile.profile_id)
    .eq("doc_type_id", doc_type_id)
    .maybeSingle<ExistingDocumentRow>();

  if (uploadedDocumentError) {
    throw new Error(uploadedDocumentError.message || "Failed to load uploaded document.");
  }

  if (!uploadedDocument?.doc_id) {
    throw new Error("Upload this supplier document first before starting verification.");
  }

  const queuedRun = await safeQueueDocumentVerification({
    profileId: businessProfile.profile_id,
    docId: uploadedDocument.doc_id,
    kind: "supplier_document",
    documentTypeName: existingDocumentType.document_type_name,
  });

  if (!queuedRun) {
    throw new Error("Supplier document verification could not be started. Please try again.");
  }

  await safeSyncSupplierVerificationProfile(businessProfile.profile_id);

  const { data: verifiedDocument, error: verifiedDocumentError } = await supabase
    .from("business_documents")
    .select("doc_id, file_url, status, review_notes")
    .eq("doc_id", uploadedDocument.doc_id)
    .maybeSingle<SavedSupplierDocumentRow>();

  if (verifiedDocumentError) {
    throw new Error(
      verifiedDocumentError.message || "Failed to load the verification result."
    );
  }

  revalidateSupplierDocumentPaths();

  return {
    ok: true,
    docTypeId: doc_type_id,
    docId: verifiedDocument?.doc_id ?? uploadedDocument.doc_id,
    status: verifiedDocument?.status ?? null,
    reviewNotes: verifiedDocument?.review_notes ?? null,
    fileUrl: verifiedDocument?.file_url ?? uploadedDocument.file_url,
    message:
      verifiedDocument?.status === "approved"
        ? `${existingDocumentType.document_type_name} was approved.`
        : `${existingDocumentType.document_type_name} was rejected. Review the feedback and upload a corrected file.`,
  };
}

export async function processAllSupplierDocumentVerifications(): Promise<SupplierBulkVerificationResult> {
  const { supabase, businessProfile } = await loadAuthenticatedSupplierContext();
  const documentRequirements = await getSupplierDocumentRequirements(supabase);
  const onboardingRequirements = documentRequirements.filter(
    (requirement) => requirement.isActive && requirement.showInOnboarding
  );
  const requiredRequirements = onboardingRequirements.filter(
    (requirement) => requirement.isRequired
  );
  const onboardingDocIds = onboardingRequirements.map((requirement) => requirement.docTypeId);

  const { data: uploadedDocuments, error: uploadedDocumentsError } = await supabase
    .from("business_documents")
    .select(
      `
        doc_id,
        doc_type_id,
        file_url,
        status,
        review_notes,
        document_types!business_documents_doc_type_id_fkey (
          document_type_name
        )
      `
    )
    .eq("profile_id", businessProfile.profile_id)
    .in("doc_type_id", onboardingDocIds);

  if (uploadedDocumentsError) {
    throw new Error(
      uploadedDocumentsError.message || "Failed to load uploaded supplier documents."
    );
  }

  const supplierDocuments =
    (uploadedDocuments as SupplierVerificationDocumentRow[] | null) ?? [];
  const uploadedByDocTypeId = new Map<number, SupplierVerificationDocumentRow>();

  for (const document of supplierDocuments) {
    uploadedByDocTypeId.set(document.doc_type_id, document);
  }

  const missingRequiredLabels = requiredRequirements
    .filter((requirement) => !uploadedByDocTypeId.has(requirement.docTypeId))
    .map((requirement) => requirement.label);

  if (missingRequiredLabels.length > 0) {
    throw new Error(
      `Upload all required documents first: ${missingRequiredLabels.join(", ")}.`
    );
  }

  const eligibleDocuments = supplierDocuments
    .filter((document) => String(document.status ?? "").trim().toLowerCase() === "pending")
    .sort((left, right) => {
      const leftName = readDocumentTypeName(left.document_types);
      const rightName = readDocumentTypeName(right.document_types);
      const priorityDifference =
        getSupplierVerificationPriority(leftName) -
        getSupplierVerificationPriority(rightName);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return leftName.localeCompare(rightName);
    });

  if (eligibleDocuments.length === 0) {
    return {
      ok: true,
      message: "There are no pending supplier documents waiting for verification.",
      pendingCount: 0,
      processedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      blockedByDti: false,
      documentResults: supplierDocuments.map((document) => ({
        docTypeId: document.doc_type_id,
        status: document.status,
        reviewNotes: document.review_notes,
      })),
    };
  }

  let hasApprovedDti = supplierDocuments.some((document) => {
    const normalizedStatus = String(document.status ?? "").trim().toLowerCase();
    const documentTypeName = readDocumentTypeName(document.document_types);

    return (
      normalizedStatus === "approved" &&
      getDocumentVerificationBlueprint(documentTypeName)?.code === "dti"
    );
  });

  let blockedByDti = false;
  const documentResults: SupplierBulkVerificationResult["documentResults"] = [];

  for (const document of eligibleDocuments) {
    const documentTypeName = readDocumentTypeName(document.document_types);
    const documentCode = getDocumentVerificationBlueprint(documentTypeName)?.code;

    if (documentCode !== "dti" && !hasApprovedDti) {
      blockedByDti = true;
      break;
    }

    const queuedRun = await safeQueueDocumentVerification({
      profileId: businessProfile.profile_id,
      docId: document.doc_id,
      kind: "supplier_document",
      documentTypeName,
    });

    if (!queuedRun) {
      throw new Error(`Verification could not be started for ${documentTypeName}.`);
    }

    const { data: verifiedDocument, error: verifiedDocumentError } = await supabase
      .from("business_documents")
      .select("doc_type_id, status, review_notes")
      .eq("doc_id", document.doc_id)
      .maybeSingle<{
        doc_type_id: number;
        status: string | null;
        review_notes: string | null;
      }>();

    if (verifiedDocumentError || !verifiedDocument) {
      throw new Error(
        verifiedDocumentError?.message ||
          `Failed to load the verification result for ${documentTypeName}.`
      );
    }

    documentResults.push({
      docTypeId: verifiedDocument.doc_type_id,
      status: verifiedDocument.status,
      reviewNotes: verifiedDocument.review_notes,
    });

    if (documentCode === "dti") {
      hasApprovedDti = String(verifiedDocument.status ?? "").trim().toLowerCase() === "approved";

      if (!hasApprovedDti) {
        blockedByDti = true;
        break;
      }
    }
  }

  await safeSyncSupplierVerificationProfile(businessProfile.profile_id);
  revalidateSupplierDocumentPaths();

  const approvedCount = documentResults.filter(
    (document) => String(document.status ?? "").trim().toLowerCase() === "approved"
  ).length;
  const rejectedCount = documentResults.filter(
    (document) => String(document.status ?? "").trim().toLowerCase() === "rejected"
  ).length;

  return {
    ok: true,
    message: blockedByDti
      ? "DTI was not approved, so the remaining supplier documents were not verified yet. Please correct the DTI document and try again."
      : `Supplier verification finished for ${documentResults.length} document${documentResults.length === 1 ? "" : "s"}.`,
    pendingCount: eligibleDocuments.length,
    processedCount: documentResults.length,
    approvedCount,
    rejectedCount,
    blockedByDti,
    documentResults,
  };
}
