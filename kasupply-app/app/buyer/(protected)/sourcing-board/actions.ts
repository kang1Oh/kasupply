"use server";

import { getBuyerRfqListItems } from "@/lib/buyer/rfq-workflows";

export async function getBuyerSourcingRequests() {
  return getBuyerRfqListItems({ visibility: "public" });
}
