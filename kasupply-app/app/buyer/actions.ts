"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export type PastSupplierItem = {
  supplierId: number;
  businessName: string;
  businessType: string;
  city: string;
  province: string;
  region: string;
  businessLocation: string;
  about: string | null;
  verifiedBadge: boolean;
  completedOrdersCount: number;
  latestCompletedAt: string | null;
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

export async function getPastSuppliers(): Promise<PastSupplierItem[]> {
  const supabase = await createClient();
  const buyerId = await getCurrentBuyerId();

  if (!buyerId) {
    return [];
  }

  const { data: poRows, error: poError } = await supabase
    .from("purchase_orders")
    .select("po_id, supplier_id, completed_at")
    .eq("buyer_id", buyerId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (poError) {
    console.error("Error fetching past suppliers purchase orders:", poError);
    throw new Error("Failed to fetch past suppliers.");
  }

  if (!poRows || poRows.length === 0) {
    return [];
  }

  const grouped = new Map<
    number,
    {
      completedOrdersCount: number;
      latestCompletedAt: string | null;
    }
  >();

  for (const row of poRows) {
    const current = grouped.get(row.supplier_id);

    if (!current) {
      grouped.set(row.supplier_id, {
        completedOrdersCount: 1,
        latestCompletedAt: row.completed_at,
      });
    } else {
      grouped.set(row.supplier_id, {
        completedOrdersCount: current.completedOrdersCount + 1,
        latestCompletedAt: current.latestCompletedAt ?? row.completed_at,
      });
    }
  }

  const supplierIds = Array.from(grouped.keys());

  const { data: supplierRows, error: supplierError } = await supabase
    .from("supplier_profiles")
    .select(
      `
      supplier_id,
      verified_badge,
      business_profiles (
        business_name,
        business_type,
        business_location,
        city,
        province,
        region,
        about
      )
    `
    )
    .in("supplier_id", supplierIds);

  if (supplierError) {
    console.error("Error fetching supplier profile details:", supplierError);
    throw new Error("Failed to fetch supplier details.");
  }

  const results: PastSupplierItem[] = [];

  for (const row of supplierRows ?? []) {
    const profile = Array.isArray(row.business_profiles)
      ? row.business_profiles[0]
      : row.business_profiles;

    if (!profile) continue;

    const stats = grouped.get(row.supplier_id);
    if (!stats) continue;

    results.push({
      supplierId: row.supplier_id,
      businessName: profile.business_name,
      businessType: profile.business_type,
      city: profile.city,
      province: profile.province,
      region: profile.region,
      businessLocation: profile.business_location,
      about: profile.about,
      verifiedBadge: row.verified_badge,
      completedOrdersCount: stats.completedOrdersCount,
      latestCompletedAt: stats.latestCompletedAt,
    });
  }

  results.sort((a, b) => {
    const aTime = a.latestCompletedAt
      ? new Date(a.latestCompletedAt).getTime()
      : 0;
    const bTime = b.latestCompletedAt
      ? new Date(b.latestCompletedAt).getTime()
      : 0;

    return bTime - aTime;
  });

  return results;
}

export type OrderAgainItem = {
  purchaseOrderId: number;
  supplierId: number;
  supplierName: string;
  verifiedBadge: boolean;
  rfqId: number;
  categoryId: number;
  productName: string;
  quantity: number;
  unit: string;
  specifications: string | null;
  latestOrderDate: string | null;
};

export async function getOrderAgainItems(): Promise<OrderAgainItem[]> {
  const supabase = await createClient();
  const buyerId = await getCurrentBuyerId();

  if (!buyerId) {
    return [];
  }

  const { data: purchaseOrders, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      po_id,
      quote_id,
      supplier_id,
      completed_at,
      quotations (
        quote_id,
        engagement_id
      )
    `
    )
    .eq("buyer_id", buyerId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (poError) {
    console.error("Error fetching order-again purchase orders:", poError);
    throw new Error("Failed to fetch order-again items.");
  }

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return [];
  }

  const engagementIds = purchaseOrders
    .map((row) => {
      const quotation = Array.isArray(row.quotations)
        ? row.quotations[0]
        : row.quotations;

      return quotation?.engagement_id ?? null;
    })
    .filter((value): value is number => value !== null);

  if (engagementIds.length === 0) {
    return [];
  }

  const { data: engagementRows, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, rfq_id")
    .in("engagement_id", engagementIds);

  if (engagementError) {
    console.error("Error fetching RFQ engagements for order again:", engagementError);
    throw new Error("Failed to fetch order-again engagements.");
  }

  const rfqIds = (engagementRows ?? []).map((row) => row.rfq_id);

  if (rfqIds.length === 0) {
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
      specifications
    `
    )
    .in("rfq_id", rfqIds);

  if (rfqError) {
    console.error("Error fetching RFQs for order again:", rfqError);
    throw new Error("Failed to fetch RFQ details.");
  }

  const supplierIds = Array.from(
    new Set(purchaseOrders.map((row) => row.supplier_id))
  );

  const { data: supplierRows, error: supplierError } = await supabase
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
    console.error("Error fetching suppliers for order again:", supplierError);
    throw new Error("Failed to fetch supplier details.");
  }

  const engagementToRfq = new Map<number, number>();
  for (const row of engagementRows ?? []) {
    engagementToRfq.set(row.engagement_id, row.rfq_id);
  }

  const rfqById = new Map<number, (typeof rfqRows)[number]>();
  for (const row of rfqRows ?? []) {
    rfqById.set(row.rfq_id, row);
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

  const seenKeys = new Set<string>();
  const results: OrderAgainItem[] = [];

  for (const row of purchaseOrders) {
    const quotation = Array.isArray(row.quotations)
      ? row.quotations[0]
      : row.quotations;

    const engagementId = quotation?.engagement_id;
    if (!engagementId) continue;

    const rfqId = engagementToRfq.get(engagementId);
    if (!rfqId) continue;

    const rfq = rfqById.get(rfqId);
    if (!rfq) continue;

    const supplier = supplierById.get(row.supplier_id);
    if (!supplier) continue;

    const dedupeKey = `${row.supplier_id}-${rfq.product_name}-${rfq.category_id}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    results.push({
      purchaseOrderId: row.po_id,
      supplierId: row.supplier_id,
      supplierName: supplier.supplierName,
      verifiedBadge: supplier.verifiedBadge,
      rfqId: rfq.rfq_id,
      categoryId: rfq.category_id,
      productName: rfq.product_name,
      quantity: rfq.quantity,
      unit: rfq.unit,
      specifications: rfq.specifications,
      latestOrderDate: row.completed_at,
    });
  }

  return results.slice(0, 6);
}