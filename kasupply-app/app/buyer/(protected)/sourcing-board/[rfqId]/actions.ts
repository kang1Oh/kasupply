"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  finalizeAcceptedOffer,
  getBuyerRfqDetails,
} from "@/lib/buyer/rfq-workflows";

export async function getSourcingRequestDetails(rfqId: number) {
  const data = await getBuyerRfqDetails(rfqId);

  if (!data || data.rfq.visibility !== "public") {
    return null;
  }

  return data;
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

  revalidatePath("/buyer/sourcing-board");
  revalidatePath(`/buyer/sourcing-board/${rfqId}`);
  revalidatePath("/buyer/rfqs");
  revalidatePath(`/buyer/rfqs/${rfqId}`);
  redirect(`/buyer/sourcing-board/${rfqId}`);
}
