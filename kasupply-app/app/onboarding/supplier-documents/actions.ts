"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (!doc_type_id || !file) {
    throw new Error("Document type and file are required.");
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

  // 3. Upload file to storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${businessProfile.profile_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // 4. Save metadata to business_documents
  const { error: documentInsertError } = await supabase
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

  if (documentInsertError) {
    throw new Error(documentInsertError.message);
  }

  redirect("/dashboard");
}