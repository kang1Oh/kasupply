"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

const ALLOWED_BUSINESS_TYPES = new Set([
  "manufacturer",
  "distributor",
  "trader",
  "retailer",
  "processor",
  "wholesaler",
  "food service",
]);

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

function normalizeBusinessType(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "restaurant") return "retailer";
  if (normalized === "food_service") return "retailer";

  return normalized;
}

export async function updateBuyerAccount(formData: FormData) {
  const supabase = await createClient();

  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    throw new Error("You must be logged in.");
  }

  const name = String(formData.get("name") || "").trim();
  const nextPath = String(formData.get("next_path") || "").trim();
  const requiredFlow = String(formData.get("required_flow") || "").trim();
  const returnPath = String(formData.get("return_path") || "").trim();

  const business_name = String(formData.get("business_name") || "").trim();
  const business_type = normalizeBusinessType(
    String(formData.get("business_type") || ""),
  );
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
  const avatarFile = formData.get("avatar_file") as File | null;

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

  if (!ALLOWED_BUSINESS_TYPES.has(business_type)) {
    throw new Error("Please select a valid business type.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError) {
    throw new Error("Failed to load business profile.");
  }

  let nextAvatarUrl = user.avatar_url ?? null;
  let uploadedAvatarPath: string | null = null;

  if (avatarFile && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      throw new Error("Profile picture must be a JPG or PNG image.");
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (avatarFile.size > maxSizeInBytes) {
      throw new Error("Profile picture is too large. Maximum size is 5 MB.");
    }

    const fileExtension = avatarFile.name.split(".").pop() || "png";
    const avatarPath = `${user.auth_user_id}/avatar-${Date.now()}.${fileExtension}`;

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

  const { error: userUpdateError } = await supabase
    .from("users")
    .update({
      name,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.user_id);

  if (userUpdateError) {
    if (uploadedAvatarPath) {
      await supabase.storage.from("avatars").remove([uploadedAvatarPath]);
    }
    throw new Error(userUpdateError.message || "Failed to update user.");
  }

  let profileId = businessProfile?.profile_id ?? null;

  if (!profileId) {
    const { data: insertedProfile, error: businessInsertError } = await supabase
      .from("business_profiles")
      .insert({
        user_id: user.user_id,
        business_name,
        business_type,
        contact_name,
        contact_number: contact_number || null,
        business_location,
        city,
        province,
        region,
        about: about || null,
      })
      .select("profile_id")
      .single();

    if (businessInsertError || !insertedProfile) {
      throw new Error(
        businessInsertError?.message || "Failed to create business profile."
      );
    }

    profileId = insertedProfile.profile_id;

    const { data: existingBuyerProfile, error: buyerProfileLookupError } = await supabase
      .from("buyer_profiles")
      .select("buyer_id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (buyerProfileLookupError) {
      throw new Error(
        buyerProfileLookupError.message || "Failed to verify buyer profile."
      );
    }

    if (!existingBuyerProfile) {
      const { error: buyerProfileInsertError } = await supabase
        .from("buyer_profiles")
        .insert({
          profile_id: profileId,
        });

      if (buyerProfileInsertError) {
        throw new Error(
          buyerProfileInsertError.message || "Failed to create buyer profile."
        );
      }
    }
  } else {
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
      .eq("profile_id", profileId);

    if (businessUpdateError) {
      throw new Error(
        businessUpdateError.message || "Failed to update business profile."
      );
    }
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

  if (uploadedAvatarPath && isAvatarFromBucket(user.avatar_url)) {
    const oldAvatarPath = extractAvatarPath(user.avatar_url);
    if (oldAvatarPath && oldAvatarPath !== uploadedAvatarPath) {
      await supabase.storage.from("avatars").remove([oldAvatarPath]);
    }
  }

  revalidatePath("/buyer/account");
  revalidatePath("/buyer/account/edit");

  const redirectParams = new URLSearchParams();

  if (nextPath) {
    redirectParams.set("next", nextPath);
  }

  if (requiredFlow) {
    redirectParams.set("required", requiredFlow);
  }

  if (returnPath) {
    redirect(returnPath);
  }

  redirect(
    `/onboarding/buyer/categories${
      redirectParams.toString() ? `?${redirectParams.toString()}` : ""
    }`,
  );
}

export async function logoutBuyerAccount() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Failed to log out.");
  }

  redirect("/buyer");
}
