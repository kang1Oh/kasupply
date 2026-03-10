"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RoleRow = {
  role_id: number;
  role_name: string;
};

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in to complete onboarding.");
  }

  // 1. Get current app user
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, role_id, name, email")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found in public.users.");
  }

  // 2. Check if business profile already exists
  const { data: existingBusinessProfile } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .maybeSingle();

  if (existingBusinessProfile) {
    redirect("/dashboard");
  }

  // 3. Get form values
  const business_name = String(formData.get("business_name") || "").trim();
  const business_type = String(formData.get("business_type") || "").trim();
  const business_location = String(formData.get("business_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const about = String(formData.get("about") || "").trim();
  const contact_number = String(formData.get("contact_number") || "").trim();

  if (
    !business_name ||
    !business_type ||
    !business_location ||
    !city ||
    !province ||
    !region
  ) {
    throw new Error("Please fill in all required fields.");
  }

  // 4. Create business profile
  const { data: newBusinessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .insert({
      user_id: appUser.user_id,
      business_name,
      business_type,
      business_location,
      city,
      province,
      region,
      about: about || null,
      contact_number: contact_number || null,
    })
    .select("profile_id")
    .single();

  if (businessProfileError || !newBusinessProfile) {
    throw new Error(
      businessProfileError?.message || "Failed to create business profile."
    );
  }

  // 5. Get role from roles table
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("role_id, role_name")
    .eq("role_id", appUser.role_id)
    .single<RoleRow>();

  if (roleError || !role) {
    throw new Error("Unable to determine user role.");
  }

  // 6. Create buyer or supplier profile
  if (role.role_name.toLowerCase() === "buyer") {
    const { error: buyerProfileError } = await supabase
      .from("buyer_profiles")
      .insert({
        user_id: appUser.user_id,
        profile_id: newBusinessProfile.profile_id,
      });

    if (buyerProfileError) {
      throw new Error(
        buyerProfileError.message || "Failed to create buyer profile."
      );
    }

    redirect("/dashboard");
  }

  if (role.role_name.toLowerCase() === "supplier") {
    const { error: supplierProfileError } = await supabase
      .from("supplier_profiles")
      .insert({
        profile_id: newBusinessProfile.profile_id,
        verified: false,
        verified_at: null,
        verified_badge: false,
      });

    if (supplierProfileError) {
      throw new Error(
        supplierProfileError.message || "Failed to create supplier profile."
      );
    }

    redirect("/onboarding/supplier-documents");
  }

  throw new Error(`Unsupported role: ${role.role_name}`);
}