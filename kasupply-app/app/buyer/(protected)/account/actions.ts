"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export async function updateBuyerAccount(formData: FormData) {
  const supabase = await createClient();

  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    throw new Error("You must be logged in.");
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  const business_name = String(formData.get("business_name") || "").trim();
  const business_type = String(formData.get("business_type") || "").trim();
  const contact_name = String(formData.get("contact_name") || "").trim();
  const contact_number = String(formData.get("contact_number") || "").trim();
  const business_location = String(formData.get("business_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const about = String(formData.get("about") || "").trim();

  const isVisibleToOthers = formData.get("is_visible_to_others") === "on";
  const documentIdValue = String(formData.get("document_id") || "").trim();
  const documentId = documentIdValue ? Number(documentIdValue) : null;

  if (
    !name ||
    !business_name ||
    !business_type ||
    !contact_name ||
    !business_location ||
    !city ||
    !province ||
    !region
  ) {
    throw new Error("Please fill in all required fields.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", user.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { error: userUpdateError } = await supabase
    .from("users")
    .update({
      name,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.user_id);

  if (userUpdateError) {
    throw new Error(userUpdateError.message || "Failed to update user.");
  }

  const { error: businessUpdateError } = await supabase
    .from("business_profiles")
    .update({
      business_name,
      business_type,
      contact_name,
      contact_number: contact_number || null,
      business_location,
      city,
      province,
      region,
      about: about || null,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", businessProfile.profile_id);

  if (businessUpdateError) {
    throw new Error(
      businessUpdateError.message || "Failed to update business profile."
    );
  }

  if (documentId) {
    const { error: documentUpdateError } = await supabase
      .from("business_documents")
      .update({
        is_visible_to_others: isVisibleToOthers,
      })
      .eq("doc_id", documentId);

    if (documentUpdateError) {
      throw new Error(
        documentUpdateError.message || "Failed to update document visibility."
      );
    }

    const { error: verifyDocumentError } = await supabase
      .from("business_documents")
      .select("doc_id, is_visible_to_others")
      .eq("doc_id", documentId)
      .maybeSingle();

    if (verifyDocumentError) {
      throw new Error(
        verifyDocumentError.message || "Failed to verify document visibility update."
      );
    }
  }

  revalidatePath("/buyer/account");

  return { success: true };
}

export async function logoutBuyerAccount() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Failed to log out.");
  }

  redirect("/buyer");
}