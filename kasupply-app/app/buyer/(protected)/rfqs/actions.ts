"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export type BuyerRFQListItem = {
  rfqId: number;
  productName: string;
  quantity: number;
  unit: string;
  specifications: string | null;
  deadline: string;
  status: string;
  visibility: string;
  createdAt: string;
  category: {
    categoryId: number;
    categoryName: string;
  } | null;
  engagements: {
    engagementId: number;
    supplierId: number;
    supplierName: string;
    status: string;
    verifiedBadge: boolean;
    finalQuoteId: number | null;
  }[];
};

async function getCurrentBuyerId() {
  const supabase = await createClient();
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    return null;
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError || !businessProfile) {
    return null;
  }

  const { data: buyerProfile, error: buyerProfileError } = await supabase
    .from("buyer_profiles")
    .select("buyer_id")
    .eq("profile_id", businessProfile.profile_id)
    .maybeSingle();

  if (buyerProfileError || !buyerProfile) {
    return null;
  }

  return buyerProfile.buyer_id as number;
}

export async function getBuyerRFQs(): Promise<BuyerRFQListItem[]> {
  const supabase = await createClient();
  const buyerId = await getCurrentBuyerId();

  if (!buyerId) {
    return [];
  }

  const { data: rfqRows, error: rfqError } = await supabase
    .from("rfqs")
    .select(
      `
      rfq_id,
      category_id,
      product_name,
      quantity,
      unit,
      specifications,
      deadline,
      status,
      visibility,
      created_at,
      product_categories (
        category_id,
        category_name
      )
    `
    )
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (rfqError) {
    console.error("Error fetching buyer RFQs:", rfqError);
    throw new Error("Failed to fetch RFQs.");
  }

  if (!rfqRows || rfqRows.length === 0) {
    return [];
  }

  const rfqIds = rfqRows.map((row) => row.rfq_id);

  const { data: engagementRows, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select(
      `
      engagement_id,
      rfq_id,
      supplier_id,
      status,
      final_quote_id
    `
    )
    .in("rfq_id", rfqIds)
    .order("created_at", { ascending: false });

  if (engagementError) {
    console.error("Error fetching RFQ engagements:", engagementError);
    throw new Error("Failed to fetch RFQ engagements.");
  }

  const supplierIds = Array.from(
    new Set((engagementRows ?? []).map((row) => row.supplier_id))
  );

  let supplierRows:
    | {
        supplier_id: number;
        verified_badge: boolean;
        business_profiles:
          | { business_name: string }
          | { business_name: string }[]
          | null;
      }[]
    | null = [];

  if (supplierIds.length > 0) {
    const { data, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select(
        `
        supplier_id,
        verified_badge,
        business_profiles (
          business_name
        )
      `
      )
      .in("supplier_id", supplierIds);

    if (supplierError) {
      console.error("Error fetching RFQ suppliers:", supplierError);
      throw new Error("Failed to fetch supplier details.");
    }

    supplierRows = data;
  }

  const supplierById = new Map<
    number,
    {
      supplierName: string;
      verifiedBadge: boolean;
    }
  >();

  for (const row of supplierRows ?? []) {
    const profile = Array.isArray(row.business_profiles)
      ? row.business_profiles[0]
      : row.business_profiles;

    supplierById.set(row.supplier_id, {
      supplierName: profile?.business_name ?? "Unknown Supplier",
      verifiedBadge: row.verified_badge,
    });
  }

  const engagementsByRfq = new Map<number, BuyerRFQListItem["engagements"]>();

  for (const row of engagementRows ?? []) {
    const supplier = supplierById.get(row.supplier_id);

    if (!engagementsByRfq.has(row.rfq_id)) {
      engagementsByRfq.set(row.rfq_id, []);
    }

    engagementsByRfq.get(row.rfq_id)!.push({
      engagementId: row.engagement_id,
      supplierId: row.supplier_id,
      supplierName: supplier?.supplierName ?? "Unknown Supplier",
      status: row.status,
      verifiedBadge: supplier?.verifiedBadge ?? false,
      finalQuoteId: row.final_quote_id,
    });
  }

  return rfqRows.map((row) => {
    const category = Array.isArray(row.product_categories)
      ? row.product_categories[0]
      : row.product_categories;

    return {
      rfqId: row.rfq_id,
      productName: row.product_name,
      quantity: row.quantity,
      unit: row.unit,
      specifications: row.specifications,
      deadline: row.deadline,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.created_at,
      category: category
        ? {
            categoryId: category.category_id,
            categoryName: category.category_name,
          }
        : null,
      engagements: engagementsByRfq.get(row.rfq_id) ?? [],
    };
  });
}