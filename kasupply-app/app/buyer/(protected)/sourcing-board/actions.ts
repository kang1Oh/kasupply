"use server";

import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { getBuyerRfqListItems, getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";

export async function getBuyerSourcingBoardData() {
  const [buyerContext, currentUser, requests] = await Promise.all([
    getCurrentBuyerContext(),
    getCurrentAppUser(),
    getBuyerRfqListItems({
      visibility: "public",
      rfqType: "sourcing_board",
    }),
  ]);

  return {
    buyerBusinessName: buyerContext?.businessProfile.business_name ?? "Your Business",
    buyerAvatarUrl: currentUser.user?.avatar_url ?? null,
    requests,
  };
}
