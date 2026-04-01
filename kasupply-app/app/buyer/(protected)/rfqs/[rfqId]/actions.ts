"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  finalizeAcceptedOffer,
  getBuyerRfqDetails,
  getCurrentBuyerContext,
  type BuyerRfqDetailsData,
} from "@/lib/buyer/rfq-workflows";

export type RFQDetailsData = BuyerRfqDetailsData;

function revalidateBuyerRfqPaths(rfqId: number) {
  revalidatePath("/buyer/rfqs");
  revalidatePath(`/buyer/rfqs/${rfqId}`);
  revalidatePath("/buyer/sourcing-board");
  revalidatePath(`/buyer/sourcing-board/${rfqId}`);
}

async function assertBuyerOwnsRFQ(rfqId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("rfq_id")
    .eq("rfq_id", rfqId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (!rfq) {
    throw new Error("RFQ not found or access denied.");
  }

  return buyerContext;
}

export async function getRFQDetails(rfqId: number): Promise<RFQDetailsData | null> {
  return getBuyerRfqDetails(rfqId);
}

export async function cancelRFQ(formData: FormData) {
  const supabase = await createClient();

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");

  if (!rfqId) {
    throw new Error("Missing RFQ.");
  }

  await assertBuyerOwnsRFQ(rfqId);

  const { data: engagements, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id")
    .eq("rfq_id", rfqId);

  if (engagementsError) {
    throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
  }

  const engagementIds = (engagements ?? []).map((engagement) => engagement.engagement_id);

  if (engagementIds.length > 0) {
    const [engagementUpdate, offersUpdate, quotesUpdate] = await Promise.all([
      supabase
        .from("rfq_engagements")
        .update({ status: "withdrawn" })
        .in("engagement_id", engagementIds),
      supabase
        .from("negotiation_offers")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .in("status", ["pending", "countered"]),
      supabase
        .from("quotations")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .neq("status", "accepted"),
    ]);

    if (engagementUpdate.error) {
      throw new Error(engagementUpdate.error.message || "Failed to cancel RFQ engagements.");
    }

    if (offersUpdate.error) {
      throw new Error(offersUpdate.error.message || "Failed to reject negotiation offers.");
    }

    if (quotesUpdate.error) {
      throw new Error(quotesUpdate.error.message || "Failed to reject quotations.");
    }
  }

  const [rfqUpdate, matchesUpdate] = await Promise.all([
    supabase.from("rfqs").update({ status: "cancelled" }).eq("rfq_id", rfqId),
    supabase
      .from("request_matches")
      .update({ is_visible: false })
      .eq("rfq_id", rfqId),
  ]);

  if (rfqUpdate.error) {
    throw new Error(rfqUpdate.error.message || "Failed to cancel RFQ.");
  }

  if (matchesUpdate.error) {
    throw new Error(matchesUpdate.error.message || "Failed to hide request matches.");
  }

  revalidateBuyerRfqPaths(rfqId);
  redirect(`/buyer/rfqs/${rfqId}`);
}

export async function acceptOffer(formData: FormData) {
  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const offerId = Number(formData.get("offerId")?.toString() ?? "");

  if (!rfqId || !engagementId || !offerId) {
    throw new Error("Missing RFQ, engagement, or offer.");
  }

  await finalizeAcceptedOffer({
    rfqId,
    engagementId,
    offerId,
  });

  revalidateBuyerRfqPaths(rfqId);
  redirect(`/buyer/rfqs/${rfqId}`);
}

export async function acceptQuote(formData: FormData) {
  const supabase = await createClient();

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");

  if (!rfqId || !engagementId || !quoteId) {
    throw new Error("Missing RFQ, engagement, or quotation.");
  }

  await assertBuyerOwnsRFQ(rfqId);

  const { data: allEngagements, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id")
    .eq("rfq_id", rfqId);

  if (engagementsError) {
    throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
  }

  const engagementIds = (allEngagements ?? []).map((engagement) => engagement.engagement_id);

  const { data: quotationRow, error: quotationError } = await supabase
    .from("quotations")
    .select("quote_id, engagement_id, status")
    .eq("quote_id", quoteId)
    .eq("engagement_id", engagementId)
    .maybeSingle();

  if (quotationError || !quotationRow) {
    throw new Error("Quotation not found.");
  }

  const [acceptQuoteResult, rejectOtherQuotesResult, rejectOffersResult] =
    await Promise.all([
      supabase
        .from("quotations")
        .update({ status: "accepted" })
        .eq("quote_id", quoteId),
      supabase
        .from("quotations")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .neq("quote_id", quoteId)
        .neq("status", "accepted"),
      supabase
        .from("negotiation_offers")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .in("status", ["pending", "countered"]),
    ]);

  if (acceptQuoteResult.error) {
    throw new Error(acceptQuoteResult.error.message || "Failed to accept quotation.");
  }

  if (rejectOtherQuotesResult.error) {
    throw new Error(
      rejectOtherQuotesResult.error.message || "Failed to reject other quotations."
    );
  }

  if (rejectOffersResult.error) {
    throw new Error(rejectOffersResult.error.message || "Failed to close negotiations.");
  }

  const otherEngagementIds = engagementIds.filter((id) => id !== engagementId);

  const updates = [
    supabase
      .from("rfq_engagements")
      .update({
        status: "accepted",
        final_quote_id: quoteId,
      })
      .eq("engagement_id", engagementId),
    supabase.from("rfqs").update({ status: "fulfilled" }).eq("rfq_id", rfqId),
    supabase
      .from("request_matches")
      .update({ is_visible: false })
      .eq("rfq_id", rfqId),
  ];

  if (otherEngagementIds.length > 0) {
    updates.push(
      supabase
        .from("rfq_engagements")
        .update({ status: "rejected" })
        .in("engagement_id", otherEngagementIds)
    );
  }

  const updateResults = await Promise.all(updates);
  const failedUpdate = updateResults.find((result) => result.error);

  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || "Failed to update RFQ status.");
  }

  revalidateBuyerRfqPaths(rfqId);
  redirect(`/buyer/rfqs/${rfqId}`);
}

export async function declineQuote(formData: FormData) {
  const supabase = await createClient();

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");

  if (!rfqId || !engagementId || !quoteId) {
    throw new Error("Missing RFQ, engagement, or quotation.");
  }

  await assertBuyerOwnsRFQ(rfqId);

  const { data: engagementRow, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, final_quote_id")
    .eq("engagement_id", engagementId)
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (engagementError || !engagementRow) {
    throw new Error("Engagement not found.");
  }

  const { error: quoteUpdateError } = await supabase
    .from("quotations")
    .update({ status: "rejected" })
    .eq("quote_id", quoteId)
    .eq("engagement_id", engagementId);

  if (quoteUpdateError) {
    throw new Error(quoteUpdateError.message || "Failed to decline quotation.");
  }

  const { error: engagementUpdateError } = await supabase
    .from("rfq_engagements")
    .update({
      status: "rejected",
      final_quote_id:
        engagementRow.final_quote_id === quoteId ? null : engagementRow.final_quote_id,
    })
    .eq("engagement_id", engagementId);

  if (engagementUpdateError) {
    throw new Error(
      engagementUpdateError.message || "Failed to update engagement after decline."
    );
  }

  const { error: rfqUpdateError } = await supabase
    .from("rfqs")
    .update({ status: "open" })
    .eq("rfq_id", rfqId);

  if (rfqUpdateError) {
    throw new Error(rfqUpdateError.message || "Failed to reopen RFQ.");
  }

  revalidateBuyerRfqPaths(rfqId);
  redirect(`/buyer/rfqs/${rfqId}`);
}

export async function submitCounterOffer(formData: FormData) {
  const supabase = await createClient();

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const pricePerUnitRaw = formData.get("pricePerUnit")?.toString().trim() ?? "";
  const quantityRaw = formData.get("quantity")?.toString().trim() ?? "";
  const moqRaw = formData.get("moq")?.toString().trim() ?? "";
  const leadTime = formData.get("leadTime")?.toString().trim() ?? "";
  const notes = formData.get("notes")?.toString().trim() ?? "";

  const buyerContext = await assertBuyerOwnsRFQ(rfqId);

  if (!engagementId) {
    throw new Error("Engagement is required.");
  }

  const { data: engagementRow, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id")
    .eq("engagement_id", engagementId)
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (engagementError || !engagementRow) {
    throw new Error("Engagement not found.");
  }

  const { data: latestOffer } = await supabase
    .from("negotiation_offers")
    .select("offer_round")
    .eq("engagement_id", engagementId)
    .order("offer_round", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRound = (latestOffer?.offer_round ?? 0) + 1;

  const pricePerUnit = pricePerUnitRaw === "" ? null : Number(pricePerUnitRaw);
  const quantity = quantityRaw === "" ? null : Number(quantityRaw);
  const moq = moqRaw === "" ? null : Number(moqRaw);

  if (pricePerUnit !== null && (!Number.isFinite(pricePerUnit) || pricePerUnit < 0)) {
    throw new Error("Invalid price per unit.");
  }

  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    throw new Error("Invalid quantity.");
  }

  if (moq !== null && (!Number.isFinite(moq) || moq <= 0)) {
    throw new Error("Invalid MOQ.");
  }

  const { error: counterPreviousOffersError } = await supabase
    .from("negotiation_offers")
    .update({ status: "countered" })
    .eq("engagement_id", engagementId)
    .eq("status", "pending");

  if (counterPreviousOffersError) {
    throw new Error(
      counterPreviousOffersError.message || "Failed to update previous offers."
    );
  }

  const { error: insertOfferError } = await supabase
    .from("negotiation_offers")
    .insert({
      engagement_id: engagementId,
      offered_by: buyerContext.appUserId,
      offer_round: nextRound,
      price_per_unit: pricePerUnit,
      quantity,
      moq,
      lead_time: leadTime || null,
      notes: notes || null,
      status: "pending",
    });

  if (insertOfferError) {
    throw new Error(insertOfferError.message || "Failed to submit counter-offer.");
  }

  const { error: updateEngagementError } = await supabase
    .from("rfq_engagements")
    .update({ status: "negotiating" })
    .eq("engagement_id", engagementId);

  if (updateEngagementError) {
    throw new Error(
      updateEngagementError.message || "Failed to update engagement status."
    );
  }

  const { error: updateRfqError } = await supabase
    .from("rfqs")
    .update({ status: "open" })
    .eq("rfq_id", rfqId);

  if (updateRfqError) {
    throw new Error(updateRfqError.message || "Failed to update RFQ status.");
  }

  revalidatePath(`/buyer/rfqs/${rfqId}`);
  redirect(`/buyer/rfqs/${rfqId}`);
}
