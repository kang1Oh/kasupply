"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type AppUserRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

function isAvatarFromBucket(avatarUrl: string | null) {
  return Boolean(avatarUrl && avatarUrl.includes("/storage/v1/object/public/avatars/"));
}

function extractAvatarPath(avatarUrl: string | null) {
  if (!avatarUrl) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const index = avatarUrl.indexOf(marker);
  if (index === -1) return null;
  return avatarUrl.slice(index + marker.length);
}

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
    .select("user_id, name, avatar_url")
    .eq("auth_user_id", authUser.id)
    .single<AppUserRow>();

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
  const { supabase, authUser, appUser, businessProfile } =
    await getCurrentSupplierContext();

  const contact_name = String(formData.get("contact_name") || "").trim();
  const business_name = String(formData.get("business_name") || "").trim();
  const business_type = String(formData.get("business_type") || "").trim();
  const business_location = String(formData.get("business_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const about = String(formData.get("about") || "").trim();
  const contact_number = String(formData.get("contact_number") || "").trim();
  const avatarFile = formData.get("avatar_file") as File | null;

  if (!contact_name) throw new Error("Contact name is required.");
  if (!business_name) throw new Error("Business name is required.");
  if (!business_type) throw new Error("Business type is required.");
  if (!business_location) throw new Error("Business location is required.");
  if (!city) throw new Error("City is required.");
  if (!province) throw new Error("Province is required.");
  if (!region) throw new Error("Region is required.");
  if (!contact_number) throw new Error("Contact number is required.");

  let nextAvatarUrl = appUser.avatar_url ?? null;
  let uploadedAvatarPath: string | null = null;

  if (avatarFile && avatarFile.size > 0) {
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (avatarFile.size > maxSizeInBytes) {
      throw new Error("Profile picture is too large. Maximum size is 5 MB.");
    }

    const fileExtension = avatarFile.name.split(".").pop() || "png";
    const avatarPath = `${authUser.id}/avatar-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, avatarFile, {
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload profile picture.");
    }

    uploadedAvatarPath = avatarPath;
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(avatarPath);

    nextAvatarUrl = publicUrlData.publicUrl;
  }

  const { error: updateUserError } = await supabase
    .from("users")
    .update({
      name: contact_name,
      avatar_url: nextAvatarUrl,
    })
    .eq("user_id", appUser.user_id);

  if (updateUserError) {
    if (uploadedAvatarPath) {
      await supabase.storage.from("avatars").remove([uploadedAvatarPath]);
    }
    throw new Error(updateUserError.message || "Failed to update account details.");
  }

  const { error: updateBusinessError } = await supabase
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
      contact_name,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", businessProfile.profile_id);

  if (updateBusinessError) {
    throw new Error(updateBusinessError.message || "Failed to update business profile.");
  }

  if (uploadedAvatarPath && isAvatarFromBucket(appUser.avatar_url)) {
    const oldAvatarPath = extractAvatarPath(appUser.avatar_url);
    if (oldAvatarPath && oldAvatarPath !== uploadedAvatarPath) {
      await supabase.storage.from("avatars").remove([oldAvatarPath]);
    }
  }

  revalidatePath("/supplier/account-settings");
  redirect("/supplier/account-settings");
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

  const maxSizeInBytes = 10 * 1024 * 1024;
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

  revalidatePath("/supplier/account-settings");
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
    await supabase.storage.from("supplier-certifications").remove([certification.file_url]);
  }

  revalidatePath("/supplier/account-settings");
}
