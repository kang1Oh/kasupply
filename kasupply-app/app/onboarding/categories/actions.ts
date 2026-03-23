"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseCategoryIds(formData: FormData) {
  return formData
    .getAll("category_ids")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseCustomCategories(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveBusinessProfileCategories(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const nextPath = String(formData.get("next_path") ?? "").trim();
  const requiredFlow = String(formData.get("required_flow") ?? "").trim();
  const categoryIds = parseCategoryIds(formData);
  const customCategoryInput = String(formData.get("other_categories") ?? "").trim();
  const customCategories = parseCustomCategories(customCategoryInput);

  if (categoryIds.length === 0 && customCategories.length === 0) {
    throw new Error("Select at least one category or enter a custom category.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, role_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("role_name")
    .eq("role_id", appUser.role_id)
    .single();

  if (roleError || !role) {
    throw new Error(roleError?.message || "Unable to determine user role.");
  }

  const roleName = role.role_name?.toLowerCase();

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const profileId = businessProfile.profile_id;

  const { error: deleteCategoriesError } = await supabase
    .from("business_profile_categories")
    .delete()
    .eq("profile_id", profileId);

  if (deleteCategoriesError) {
    throw new Error(deleteCategoriesError.message || "Failed to reset saved categories.");
  }

  const { error: deleteCustomCategoriesError } = await supabase
    .from("business_profile_custom_categories")
    .delete()
    .eq("profile_id", profileId);

  if (deleteCustomCategoriesError) {
    throw new Error(
      deleteCustomCategoriesError.message || "Failed to reset custom categories.",
    );
  }

  if (categoryIds.length > 0) {
    const { error: insertCategoriesError } = await supabase
      .from("business_profile_categories")
      .insert(
        categoryIds.map((categoryId) => ({
          profile_id: profileId,
          category_id: categoryId,
        })),
      );

    if (insertCategoriesError) {
      throw new Error(insertCategoriesError.message || "Failed to save categories.");
    }
  }

  if (customCategories.length > 0) {
    const { error: insertCustomCategoriesError } = await supabase
      .from("business_profile_custom_categories")
      .insert(
        customCategories.map((categoryName) => ({
          profile_id: profileId,
          category_name: categoryName,
        })),
      );

    if (insertCustomCategoriesError) {
      throw new Error(
        insertCustomCategoriesError.message || "Failed to save custom categories.",
      );
    }
  }

  if (roleName === "buyer") {
    const params = new URLSearchParams();

    if (requiredFlow) {
      params.set("required", requiredFlow);
    }

    if (nextPath) {
      params.set("next", nextPath);
    }

    redirect(
      `/onboarding/buyer-documents${
        params.toString() ? `?${params.toString()}` : ""
      }`,
    );
  }

  redirect("/onboarding/supplier-documents");
}
