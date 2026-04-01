"use server";

import { getBuyerRfqListItems } from "@/lib/buyer/rfq-workflows";
import type { BuyerRfqListItem } from "@/lib/buyer/rfq-workflows";

export async function getBuyerRFQs(): Promise<BuyerRfqListItem[]> {
  return getBuyerRfqListItems();
}
