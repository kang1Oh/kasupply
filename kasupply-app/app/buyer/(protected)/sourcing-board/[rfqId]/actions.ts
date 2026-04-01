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

export type SourcingRequestPageData = {
  buyerBusinessName: string;
  data: BuyerRfqDetailsData;
};

function revalidateSourcingPaths(rfqId: number) {
  revalidatePath("/buyer/sourcing-board");
  revalidatePath(`/buyer/sourcing-board/${rfqId}`);
  revalidatePath("/buyer/rfqs");
  revalidatePath(`/buyer/rfqs/${rfqId}`);
}

async function assertBuyerOwnsSourcingRequest(rfqId: number) {
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
    .eq("visibility", "public")
    .eq("rfq_type", "sourcing_board")
    .maybeSingle();

  if (!rfq) {
    throw new Error("Sourcing request not found or access denied.");
  }

  return buyerContext;
}

export async function getSourcingRequestPageData(
  rfqId: number
): Promise<SourcingRequestPageData | null> {
  const [data, buyerContext] = await Promise.all([
    getBuyerRfqDetails(rfqId),
    getCurrentBuyerContext(),
  ]);

  if (
    !data ||
    data.rfq.visibility !== "public" ||
    data.rfq.rfqType !== "sourcing_board"
  ) {
    return null;
  }

  return {
    buyerBusinessName: buyerContext?.businessProfile.business_name ?? "Your Business",
    data,
  };
}

export async function closeSourcingRequest(formData: FormData) {
  const supabase = await createClient();
  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");

  if (!rfqId) {
    throw new Error("Missing sourcing request.");
  }

  await assertBuyerOwnsSourcingRequest(rfqId);

  const { data: engagements, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id")
    .eq("rfq_id", rfqId);

  if (engagementsError) {
    throw new Error(
      engagementsError.message || "Failed to load sourcing request engagements."
    );
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
      throw new Error(
        engagementUpdate.error.message ||
          "Failed to close sourcing request engagements."
      );
    }

    if (offersUpdate.error) {
      throw new Error(
        offersUpdate.error.message || "Failed to reject negotiation offers."
      );
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
    throw new Error(rfqUpdate.error.message || "Failed to close sourcing request.");
  }

  if (matchesUpdate.error) {
    throw new Error(matchesUpdate.error.message || "Failed to hide request matches.");
  }

  revalidateSourcingPaths(rfqId);
  redirect(`/buyer/sourcing-board/${rfqId}`);
}

export async function acceptSourcingOffer(formData: FormData) {
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

  revalidateSourcingPaths(rfqId);
  redirect(`/buyer/sourcing-board/${rfqId}`);
}

export async function acceptSourcingQuote(formData: FormData) {
  const supabase = await createClient();
  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");

  if (!rfqId || !engagementId || !quoteId) {
    throw new Error("Missing RFQ, engagement, or quotation.");
  }

  await assertBuyerOwnsSourcingRequest(rfqId);

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
    .select("quote_id, engagement_id")
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
    throw new Error(
      failedUpdate.error.message || "Failed to update sourcing request status."
    );
  }

  revalidateSourcingPaths(rfqId);
  redirect(`/buyer/sourcing-board/${rfqId}`);
}

export async function declineSourcingQuote(formData: FormData) {
  const supabase = await createClient();
  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const engagementId = Number(formData.get("engagementId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");

  if (!rfqId || !engagementId || !quoteId) {
    throw new Error("Missing RFQ, engagement, or quotation.");
  }

  await assertBuyerOwnsSourcingRequest(rfqId);

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
    throw new Error(rfqUpdateError.message || "Failed to reopen sourcing request.");
  }

  revalidateSourcingPaths(rfqId);
  redirect(`/buyer/sourcing-board/${rfqId}`);
}
