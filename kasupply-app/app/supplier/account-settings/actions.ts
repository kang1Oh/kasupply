"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

async function getCurrentSupplierContext() {
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
    .select(`
      profile_id,
      user_id,
      business_name,
      business_type,
      business_location,
      city,
      province,
      region,
      about,
      contact_number
    `)
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return {
    supabase,
    authUser,
    appUser,
    businessProfile,
    supplierProfile,
  };
}

export async function updateSupplierAccountSettings(formData: FormData) {
  const { supabase, businessProfile } = await getCurrentSupplierContext();

  const business_name = String(formData.get("business_name") || "").trim();
  const business_type = String(formData.get("business_type") || "").trim();
  const business_location = String(formData.get("business_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const about = String(formData.get("about") || "").trim();
  const contact_number = String(formData.get("contact_number") || "").trim();

  if (!business_name) throw new Error("Business name is required.");
  if (!business_type) throw new Error("Business type is required.");
  if (!business_location) throw new Error("Business location is required.");
  if (!city) throw new Error("City is required.");
  if (!province) throw new Error("Province is required.");
  if (!region) throw new Error("Region is required.");
  if (!contact_number) throw new Error("Contact number is required.");

  const { error } = await supabase
    .from("business_profiles")
    .update({
      business_name,
      business_type,
      business_location,
      city,
      province,
      region,
      about: about || null,
      contact_number,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", businessProfile.profile_id);

  if (error) {
    throw new Error(error.message || "Failed to update account settings.");
  }

  revalidatePath("/dashboard/supplier/account-settings");
  revalidatePath("/dashboard");
}

export async function uploadSupplierCertification(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();

  const cert_type_id = Number(formData.get("cert_type_id"));
  const issued_at = String(formData.get("issued_at") || "").trim();
  const expires_at = String(formData.get("expires_at") || "").trim();
  const file = formData.get("certification_file") as File | null;

  if (!cert_type_id || Number.isNaN(cert_type_id)) {
    throw new Error("Certification type is required.");
  }

  if (!file || file.size === 0) {
    throw new Error("Certification file is required.");
  }

  const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSizeInBytes) {
    throw new Error("Certification file is too large. Maximum size is 10 MB.");
  }

  const { data: certType, error: certTypeError } = await supabase
    .from("certification_types")
    .select("cert_type_id, certification_type_name")
    .eq("cert_type_id", cert_type_id)
    .single();

  if (certTypeError || !certType) {
    throw new Error("Invalid certification type.");
  }

  const fileExt = file.name.split(".").pop() || "pdf";
  const safeTypeName = String(certType.certification_type_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  const fileName = `${safeTypeName}-${Date.now()}.${fileExt}`;
  const filePath = `${supplierProfile.supplier_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("supplier-certifications")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload certification file.");
  }

  const { error: insertError } = await supabase
    .from("supplier_certifications")
    .insert({
      supplier_id: supplierProfile.supplier_id,
      cert_type_id,
      file_url: filePath,
      status: "pending",
      issued_at: issued_at || null,
      expires_at: expires_at || null,
      verified_at: null,
    });

  if (insertError) {
    await supabase.storage.from("supplier-certifications").remove([filePath]);
    throw new Error(insertError.message || "Failed to save certification.");
  }

  revalidatePath("/dashboard/supplier/account-settings");
  revalidatePath("/dashboard");
}

export async function deleteSupplierCertification(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();

  const certification_id = Number(formData.get("certification_id"));

  if (!certification_id || Number.isNaN(certification_id)) {
    throw new Error("Invalid certification.");
  }

  const { data: certification, error: certificationError } = await supabase
    .from("supplier_certifications")
    .select("certification_id, supplier_id, file_url")
    .eq("certification_id", certification_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .single();

  if (certificationError || !certification) {
    throw new Error("Certification not found.");
  }

  const { error: deleteError } = await supabase
    .from("supplier_certifications")
    .delete()
    .eq("certification_id", certification_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete certification.");
  }

  if (certification.file_url) {
    await supabase.storage
      .from("supplier-certifications")
      .remove([certification.file_url]);
  }

  revalidatePath("/dashboard/supplier/account-settings");
  revalidatePath("/dashboard");
}