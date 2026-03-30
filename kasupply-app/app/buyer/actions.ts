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
