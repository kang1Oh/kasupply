"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // 3. Use fixed DTI doc type id
  const dtiDocTypeId = 1;

  // 4. Upload file to storage
  const fileExt = file.name.split(".").pop();
  const fileName = `buyer-dti-${Date.now()}.${fileExt}`;
  const filePath = `${businessProfile.profile_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // 5. Save metadata to business_documents
  const { error: documentInsertError } = await supabase
    .from("business_documents")
    .insert({
      profile_id: businessProfile.profile_id,
      doc_type_id: dtiDocTypeId,
      file_url: filePath,
      ocr_extracted_data: null,
      status: "pending",
      uploaded_at: new Date().toISOString(),
      verified_at: null,
    });

  if (documentInsertError) {
    throw new Error(documentInsertError.message);
  }

  redirect("/buyer");
}