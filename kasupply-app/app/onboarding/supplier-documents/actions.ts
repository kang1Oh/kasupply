"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ExistingDocumentRow = {
  doc_id: number;
  file_url: string;
};

export async function uploadSupplierDocument(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const doc_type_id = Number(formData.get("doc_type_id"));
  const file = formData.get("document") as File | null;

  if (!doc_type_id || Number.isNaN(doc_type_id)) {
    throw new Error("Document type is required.");
  }

  if (!file || file.size === 0) {
    throw new Error("Document file is required.");
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

  const { data: existingDocumentType, error: docTypeError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .eq("doc_type_id", doc_type_id)
    .single();

  if (docTypeError || !existingDocumentType) {
    throw new Error("Invalid document type.");
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
      })
      .eq("doc_id", existingDocument.doc_id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase
      .from("business_documents")
      .insert({
        profile_id: businessProfile.profile_id,
        doc_type_id,
        file_url: filePath,
        ocr_extracted_data: null,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        verified_at: null,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/onboarding/supplier-documents");
  revalidatePath("/dashboard");

  redirect("/onboarding/supplier-documents");
}
