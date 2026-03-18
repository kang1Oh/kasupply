"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    .select("profile_id")
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
    supplierProfile,
  };
}

export async function engageWithRfq(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();

  const rfq_id = Number(formData.get("rfq_id"));

  if (!rfq_id || Number.isNaN(rfq_id)) {
    throw new Error("Invalid RFQ.");
  }

  const { data: matchRow, error: matchError } = await supabase
    .from("request_matches")
    .select("match_id, rfq_id, supplier_id, is_visible")
    .eq("rfq_id", rfq_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .eq("is_visible", true)
    .maybeSingle();

  if (matchError) {
    throw new Error(matchError.message || "Failed to validate RFQ match.");
  }

  if (!matchRow) {
    throw new Error("You do not have access to engage with this RFQ.");
  }

  const { data: existingEngagement, error: existingError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, rfq_id, supplier_id, status")
    .eq("rfq_id", rfq_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to check RFQ engagement.");
  }

  if (existingEngagement) {
    revalidatePath("/dashboard/supplier/bulletin-board");
    revalidatePath("/dashboard/supplier/rfq");
    redirect(`/dashboard/supplier/rfq?engagement=${existingEngagement.engagement_id}`);
  }

  const now = new Date().toISOString();

  const { data: insertedEngagement, error: insertError } = await supabase
    .from("rfq_engagements")
    .insert({
      rfq_id,
      supplier_id: supplierProfile.supplier_id,
      status: "new",
      viewed_at: null,
      initiated_at: now,
      final_quote_id: null,
      created_at: now,
    })
    .select("engagement_id")
    .single();

  if (insertError || !insertedEngagement) {
    throw new Error(insertError?.message || "Failed to engage with RFQ.");
  }

  revalidatePath("/dashboard/supplier/bulletin-board");
  revalidatePath("/dashboard/supplier/rfq");
  revalidatePath("/dashboard");

  redirect(`/dashboard/supplier/rfq?engagement=${insertedEngagement.engagement_id}`);
}