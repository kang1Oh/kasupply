"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBuyerDtiDocumentTypeMatchScore,
} from "@/lib/verification/document-rules";
import {
  safeQueueDocumentVerification,
  safeSyncBuyerVerificationProfile,
} from "@/lib/verification/onboarding";

export async function uploadBuyerDocument(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const file = formData.get("document") as File | null;

  if (!file) {
    throw new Error("DTI document is required.");
  }

  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  if (!allowedTypes.has(file.type)) {
    throw new Error("Please upload a PDF, JPG, JPEG, PNG, DOC, or DOCX file.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The file must be 10MB or smaller.");
  }

  // 1. Get app user
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  // 2. Get business profile
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
      | null)
      ?? [])
      .map((documentType) => ({
        ...documentType,
        matchScore: getBuyerDtiDocumentTypeMatchScore(
          documentType.document_type_name,
        ),
      }))
      .filter((documentType) => documentType.matchScore > 0)
      .sort((left, right) => right.matchScore - left.matchScore)[0] ?? null;

  if (dtiDocumentTypeError || !dtiDocumentType) {
    throw new Error(
      dtiDocumentTypeError?.message ||
        "DTI document type is not configured. Add a DTI document type in Admin Requirements first."
    );
  }

  // 4. Upload file to storage
  const fileExt = file.name.split(".").pop();
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

  // 5. Save metadata to business_documents
  const documentPayload = {
    profile_id: businessProfile.profile_id,
    doc_type_id: dtiDocumentType.doc_type_id,
    file_url: filePath,
    ocr_extracted_data: null,
    status: "pending",
    uploaded_at: new Date().toISOString(),
    verified_at: null,
  };

  const { data: savedDocument, error: documentSaveError } = existingDocument?.doc_id
    ? await supabase
        .from("business_documents")
        .update(documentPayload)
        .eq("doc_id", existingDocument.doc_id)
        .select("doc_id")
        .single()
    : await supabase
        .from("business_documents")
        .insert(documentPayload)
        .select("doc_id")
        .single();

  if (documentSaveError || !savedDocument) {
    throw new Error(documentSaveError.message);
  }

  if (existingDocument?.file_url && existingDocument.file_url !== filePath) {
    await supabase.storage.from("business-documents").remove([existingDocument.file_url]);
  }

  await safeQueueDocumentVerification({
    profileId: businessProfile.profile_id,
    docId: savedDocument.doc_id,
    kind: "buyer_document",
    documentTypeName: dtiDocumentType.document_type_name,
  });

  await safeSyncBuyerVerificationProfile(businessProfile.profile_id);

  redirect("/buyer?activated=1");
}
