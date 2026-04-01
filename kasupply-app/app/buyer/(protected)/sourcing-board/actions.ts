"use server";

import { getBuyerRfqListItems, getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";

export async function getBuyerSourcingBoardData() {
  const [buyerContext, requests] = await Promise.all([
    getCurrentBuyerContext(),
    getBuyerRfqListItems({
      visibility: "public",
      rfqType: "sourcing_board",
    }),
  ]);

  return {
    buyerBusinessName: buyerContext?.businessProfile.business_name ?? "Your Business",
    requests,
  };
}
