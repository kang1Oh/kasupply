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
    appUserId: String(appUser.user_id),
    supplierProfile,
  };
}

function getReturnTo(formData: FormData, fallback = "/supplier/rfq") {
  const returnTo = String(formData.get("return_to") || "").trim();
  return returnTo || fallback;
}

function revalidateRfqPaths(returnTo: string) {
  revalidatePath("/supplier/rfq");
  revalidatePath("/supplier/dashboard");
  revalidatePath(returnTo);
}

export async function markEngagementViewed(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  const { error } = await supabase
    .from("rfq_engagements")
    .update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to mark RFQ as viewed.");
  }

  revalidateRfqPaths(returnTo);
  redirect(returnTo);
}

export async function markEngagementInterested(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  const { error } = await supabase
    .from("rfq_engagements")
    .update({
      status: "interested",
      viewed_at: new Date().toISOString(),
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to mark RFQ as interested.");
  }

  revalidateRfqPaths(returnTo);
  redirect(returnTo);
}

export async function declineEngagement(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  const { error } = await supabase
    .from("rfq_engagements")
    .update({
      status: "declined",
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to decline RFQ.");
  }

  revalidateRfqPaths(returnTo);
  redirect(returnTo);
}

export async function withdrawFromRfq(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  const { error } = await supabase
    .from("rfq_engagements")
    .update({
      status: "withdrawn",
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to withdraw from RFQ.");
  }

  revalidateRfqPaths(returnTo);
  redirect("/supplier/rfq");
}

export async function submitNegotiationOffer(formData: FormData) {
  const { supabase, supplierProfile, appUserId } =
    await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));
  const price_per_unit = Number(formData.get("price_per_unit"));
  const quantity = Number(formData.get("quantity"));
  const lead_time = String(formData.get("lead_time") || "").trim();
  const moq = Number(formData.get("moq"));
  const notes = String(formData.get("notes") || "").trim();

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  if (Number.isNaN(price_per_unit) || price_per_unit < 0) {
    throw new Error("Price per unit must be a valid number.");
  }

  if (Number.isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a valid number.");
  }

  if (!lead_time) {
    throw new Error("Lead time is required.");
  }

  if (Number.isNaN(moq) || moq < 0) {
    throw new Error("MOQ must be a valid number.");
  }

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, supplier_id")
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .single();

  if (engagementError || !engagement) {
    throw new Error("RFQ engagement not found.");
  }

  const { data: lastOffer } = await supabase
    .from("negotiation_offers")
    .select("offer_round")
    .eq("engagement_id", engagement_id)
    .order("offer_round", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRound = Number(lastOffer?.offer_round ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("negotiation_offers")
    .insert({
      engagement_id,
      offered_by: appUserId,
      offer_round: nextRound,
      price_per_unit,
      quantity,
      lead_time,
      moq,
      notes: notes || null,
      status: "pending",
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(insertError.message || "Failed to submit negotiation offer.");
  }

  const { error: updateEngagementError } = await supabase
    .from("rfq_engagements")
    .update({
      status: "negotiating",
      viewed_at: new Date().toISOString(),
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (updateEngagementError) {
    throw new Error(
      updateEngagementError.message || "Failed to update RFQ engagement."
    );
  }

  revalidateRfqPaths(returnTo);
  redirect(returnTo);
}

export async function submitFinalQuotation(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();
  const returnTo = getReturnTo(formData);

  const engagement_id = Number(formData.get("engagement_id"));
  const price_per_unit = Number(formData.get("price_per_unit"));
  const quantity = Number(formData.get("quantity"));
  const moq = Number(formData.get("moq"));
  const lead_time = String(formData.get("lead_time") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const valid_until = String(formData.get("valid_until") || "").trim();

  if (!engagement_id || Number.isNaN(engagement_id)) {
    throw new Error("Invalid engagement.");
  }

  if (Number.isNaN(price_per_unit) || price_per_unit < 0) {
    throw new Error("Price per unit must be a valid number.");
  }

  if (Number.isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a valid number.");
  }

  if (Number.isNaN(moq) || moq < 0) {
    throw new Error("MOQ must be a valid number.");
  }

  if (!lead_time) {
    throw new Error("Lead time is required.");
  }

  if (!valid_until) {
    throw new Error("Valid until date is required.");
  }

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, supplier_id, final_quote_id")
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .single();

  if (engagementError || !engagement) {
    throw new Error("RFQ engagement not found.");
  }

  let finalQuoteId = engagement.final_quote_id ?? null;

  if (finalQuoteId) {
    const { error: updateQuoteError } = await supabase
      .from("quotations")
      .update({
        price_per_unit,
        quantity,
        moq,
        lead_time,
        notes: notes || null,
        valid_until,
      })
      .eq("quote_id", finalQuoteId)
      .eq("supplier_id", supplierProfile.supplier_id);

    if (updateQuoteError) {
      throw new Error(updateQuoteError.message || "Failed to update quotation.");
    }
  } else {
    const { data: insertedQuote, error: insertQuoteError } = await supabase
      .from("quotations")
      .insert({
        engagement_id,
        supplier_id: supplierProfile.supplier_id,
        price_per_unit,
        quantity,
        moq,
        lead_time,
        notes: notes || null,
        valid_until,
      })
      .select("quote_id")
      .single();

    if (insertQuoteError || !insertedQuote) {
      throw new Error(insertQuoteError?.message || "Failed to submit quotation.");
    }

    finalQuoteId = insertedQuote.quote_id;
  }

  const { error: updateEngagementError } = await supabase
    .from("rfq_engagements")
    .update({
      final_quote_id: finalQuoteId,
      status: "quoted",
      viewed_at: new Date().toISOString(),
    })
    .eq("engagement_id", engagement_id)
    .eq("supplier_id", supplierProfile.supplier_id);

  if (updateEngagementError) {
    throw new Error(
      updateEngagementError.message || "Failed to update RFQ engagement."
    );
  }

  revalidateRfqPaths(returnTo);
  redirect(returnTo);
}
