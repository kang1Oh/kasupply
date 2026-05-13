"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBuyerDtiDocumentTypeMatchScore } from "@/lib/verification/document-rules";
import {
  safeQueueDocumentVerification,
  safeSyncBuyerVerificationProfile,
} from "@/lib/verification/onboarding";
import { buildVerificationFailureUserMessage } from "@/lib/verification/user-facing-errors";

const ALLOWED_BUYER_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

type SavedDocumentRow = {
  doc_id: number;
  file_url: string;
  status: string | null;
  review_notes: string | null;
};

type BuyerDocumentActionResult = {
  ok: boolean;
  fileUrl: string | null;
  status: string | null;
  reviewNotes: string | null;
  message: string;
};

type VerificationRunOutcomeRow = {
  status: string;
  error_message: string | null;
};

async function loadAuthenticatedBuyerContext() {
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

  const { data: documentTypes, error: dtiDocumentTypeError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .order("document_type_name", { ascending: true });

  const dtiDocumentType =
    ((documentTypes as
      | Array<{ doc_type_id: number; document_type_name: string }>
      | null) ?? [])
      .map((documentType) => ({
        ...documentType,
        matchScore: getBuyerDtiDocumentTypeMatchScore(documentType.document_type_name),
      }))
      .filter((documentType) => documentType.matchScore > 0)
      .sort((left, right) => right.matchScore - left.matchScore)[0] ?? null;

  if (dtiDocumentTypeError || !dtiDocumentType) {
    throw new Error(
      dtiDocumentTypeError?.message ||
        "DTI document type is not configured. Add a DTI document type in Admin Requirements first."
    );
  }

  return {
    supabase,
    businessProfile,
    dtiDocumentType,
  };
}

function revalidateBuyerDocumentPaths() {
  revalidatePath("/onboarding/buyer-documents");
  revalidatePath("/buyer");
  revalidatePath("/dashboard");
  revalidatePath("/buyer/account/edit");
  revalidatePath("/buyer/account");
}

async function assertVerificationRunSucceeded(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  runId: number;
  documentLabel: string;
}) {
  const { data: verificationRun, error: verificationRunError } = await params.supabase
    .from("verification_runs")
    .select("status, error_message")
    .eq("run_id", params.runId)
    .maybeSingle<VerificationRunOutcomeRow>();

  if (verificationRunError) {
    throw new Error(
      verificationRunError.message || "Failed to load the verification run result."
    );
  }

  if (verificationRun?.status === "failed") {
    throw new Error(
      buildVerificationFailureUserMessage({
        documentLabel: params.documentLabel,
        rawErrorMessage: verificationRun.error_message,
      })
    );
  }
}

export async function uploadBuyerDocument(
  formData: FormData
): Promise<BuyerDocumentActionResult> {
  const { supabase, businessProfile, dtiDocumentType } =
    await loadAuthenticatedBuyerContext();

  const file = formData.get("document") as File | null;

  if (!file) {
    throw new Error("DTI document is required.");
  }

  if (!ALLOWED_BUYER_DOCUMENT_MIME_TYPES.has(file.type)) {
    throw new Error("Please upload the DTI certificate as JPG, JPEG, or PNG.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The file must be 10MB or smaller.");
  }

  const fileExt = file.name.split(".").pop() || "pdf";
  const fileName = `buyer-dti-${Date.now()}.${fileExt}`;
  const filePath = `${businessProfile.profile_id}/${fileName}`;

  const { data: existingDocument } = await supabase
    .from("business_documents")
    .select("doc_id, file_url")
    .eq("profile_id", businessProfile.profile_id)
    .eq("doc_type_id", dtiDocumentType.doc_type_id)
    .maybeSingle();

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const documentPayload = {
    profile_id: businessProfile.profile_id,
    doc_type_id: dtiDocumentType.doc_type_id,
    file_url: filePath,
    ocr_extracted_data: null,
    ocr_raw_text: null,
    ocr_extracted_fields: {},
    metadata_analysis: {},
    verification_analysis: {},
    verification_score: null,
    manual_review_required: false,
    review_notes: null,
    status: "pending",
    uploaded_at: new Date().toISOString(),
    verified_at: null,
    last_verification_run_id: null,
  };

  const { data: savedDocument, error: documentSaveError } = existingDocument?.doc_id
    ? await supabase
      .from("business_documents")
      .update(documentPayload)
      .eq("doc_id", existingDocument.doc_id)
      .select("doc_id, file_url, status, review_notes")
      .single<SavedDocumentRow>()
    : await supabase
        .from("business_documents")
        .insert(documentPayload)
        .select("doc_id, file_url, status, review_notes")
        .single<SavedDocumentRow>();

  if (documentSaveError || !savedDocument) {
    throw new Error(documentSaveError?.message || "Failed to save document.");
  }

  if (existingDocument?.file_url && existingDocument.file_url !== filePath) {
    await supabase.storage.from("business-documents").remove([existingDocument.file_url]);
  }

  await safeSyncBuyerVerificationProfile(businessProfile.profile_id);
  revalidateBuyerDocumentPaths();

  return {
    ok: true,
    fileUrl: savedDocument.file_url,
    status: savedDocument.status,
    reviewNotes: savedDocument.review_notes,
    message: "Document uploaded. Click Verify Document when you are ready to process it.",
  };
}

export async function processBuyerDocumentVerification(): Promise<BuyerDocumentActionResult> {
  const { supabase, businessProfile, dtiDocumentType } =
    await loadAuthenticatedBuyerContext();

  const { data: savedDocument, error: savedDocumentError } = await supabase
    .from("business_documents")
    .select("doc_id, file_url, status, review_notes")
    .eq("profile_id", businessProfile.profile_id)
    .eq("doc_type_id", dtiDocumentType.doc_type_id)
    .maybeSingle<SavedDocumentRow>();

  if (savedDocumentError) {
    throw new Error(savedDocumentError.message || "Failed to load uploaded document.");
  }

  if (!savedDocument) {
    throw new Error("Upload a DTI document first before starting verification.");
  }

  const queuedRun = await safeQueueDocumentVerification({
    profileId: businessProfile.profile_id,
    docId: savedDocument.doc_id,
    kind: "buyer_document",
    documentTypeName: dtiDocumentType.document_type_name,
  });

  if (!queuedRun) {
    throw new Error("Buyer document verification could not be started. Please try again.");
  }

  await assertVerificationRunSucceeded({
    supabase,
    runId: queuedRun.run_id,
    documentLabel: dtiDocumentType.document_type_name,
  });

  await safeSyncBuyerVerificationProfile(businessProfile.profile_id);

  const { data: verifiedDocument, error: verifiedDocumentError } = await supabase
    .from("business_documents")
    .select("doc_id, file_url, status, review_notes")
    .eq("doc_id", savedDocument.doc_id)
    .maybeSingle<SavedDocumentRow>();

  if (verifiedDocumentError) {
    throw new Error(
      verifiedDocumentError.message || "Failed to load the verification result."
    );
  }

  revalidateBuyerDocumentPaths();

  return {
    ok: true,
    fileUrl: verifiedDocument?.file_url ?? savedDocument.file_url,
    status: verifiedDocument?.status ?? null,
    reviewNotes: verifiedDocument?.review_notes ?? null,
    message:
      verifiedDocument?.status === "approved"
        ? "Your DTI document was approved."
        : "Your DTI document was rejected. Review the feedback and upload a corrected file.",
  };
}
