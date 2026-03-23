"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_at: string | null;
  verified_badge: boolean;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string;
};

type BulletinBoardItemRow = {
  match_id: number;
  rfq_id: number;
  supplier_id: number;
  match_score: number | null;
  match_reason: string | null;
  is_visible: boolean | null;
  notified_at: string | null;
  rfqs:
    | {
        rfq_id: number;
        product_name: string | null;
        specifications: string | null;
        quantity: number | null;
        unit: string | null;
        deadline: string | null;
        status: string | null;
        created_at: string | null;
      }
    | {
        rfq_id: number;
        product_name: string | null;
        specifications: string | null;
        quantity: number | null;
        unit: string | null;
        deadline: string | null;
        status: string | null;
        created_at: string | null;
      }[]
    | null;
};

type ExistingEngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string;
};

export type SupplierDashboardData = {
  supplierName: string;
  verificationStatus: "not_started" | "incomplete" | "pending" | "verified";
  onboarding: {
    hasBusinessProfile: boolean;
    hasSubmittedRequiredSupplierDocuments: boolean;
    hasSubmittedSiteImages: boolean;
  };
  stats: {
    inventoryItems: number;
    incomingRfqs: number;
    matchedBoardPosts: number;
    activeOrders: number;
    pendingInvoices: number;
  };
  bulletinBoardItems: Array<{
    matchId: number;
    rfqId: number;
    title: string;
    description: string;
    status: string;
    matchScore: number | null;
    matchReason: string | null;
    quantityLabel: string;
    deadline: string | null;
    createdAt: string | null;
    notifiedAt: string | null;
  }>;
};

function safeCount(value: number | null | undefined) {
  return value ?? 0;
}

function getJoinedRfq(
  rfqs: BulletinBoardItemRow["rfqs"]
):
  | {
      rfq_id: number;
      product_name: string | null;
      specifications: string | null;
      quantity: number | null;
      unit: string | null;
      deadline: string | null;
      status: string | null;
      created_at: string | null;
    }
  | null {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

function buildQuantityLabel(quantity: number | null, unit: string | null) {
  if (quantity === null && !unit) return "Quantity not specified";
  if (quantity !== null && unit) return `${quantity} ${unit}`;
  if (quantity !== null) return String(quantity);
  return unit ?? "Quantity not specified";
}

async function getCurrentSupplierContext() {
  const supabase = await createClient();
  const status = await getUserOnboardingStatus();

  if (!status.authenticated || status.role !== "supplier" || !status.appUser) {
    throw new Error("Only suppliers can access this action.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id, business_name")
    .eq("user_id", status.appUser.user_id)
    .single<BusinessProfileRow>();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id, verified, verified_at, verified_badge")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return {
    supabase,
    status,
    businessProfile,
    supplierProfile,
  };
}

export async function getSupplierDashboardData(): Promise<SupplierDashboardData> {
  const { supabase, status, businessProfile, supplierProfile } =
    await getCurrentSupplierContext();

  const [
    inventoryResult,
    incomingRfqsResult,
    matchedBoardPostsResult,
    activeOrdersResult,
    pendingInvoicesResult,
    bulletinBoardResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.supplier_id),

    supabase
      .from("rfq_engagements")
      .select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.supplier_id)
      .neq("status", "rejected")
      .neq("status", "withdrawn"),

    supabase
      .from("request_matches")
      .select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.supplier_id)
      .eq("is_visible", true),

    supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.supplier_id)
      .in("status", ["pending", "in_transit", "delivered"]),

    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.supplier_id)
      .neq("status", "paid"),

    supabase
      .from("request_matches")
      .select(`
        match_id,
        rfq_id,
        supplier_id,
        match_score,
        match_reason,
        is_visible,
        notified_at,
        rfqs (
          rfq_id,
          product_name,
          specifications,
          quantity,
          unit,
          deadline,
          status,
          created_at
        )
      `)
      .eq("supplier_id", supplierProfile.supplier_id)
      .eq("is_visible", true)
      .order("match_score", { ascending: false })
      .limit(5),
  ]);

  if (bulletinBoardResult.error) {
    throw new Error(
      bulletinBoardResult.error.message || "Failed to load bulletin board items."
    );
  }

  const safeBoardRows: BulletinBoardItemRow[] =
    (bulletinBoardResult.data as BulletinBoardItemRow[] | null) ?? [];

  return {
    supplierName: businessProfile.business_name,
    verificationStatus: status.supplierVerificationStatus,
    onboarding: {
      hasBusinessProfile: status.hasBusinessProfile,
      hasSubmittedRequiredSupplierDocuments:
        status.hasSubmittedRequiredSupplierDocuments,
      hasSubmittedSiteImages: status.hasSubmittedSiteImages,
    },
    stats: {
      inventoryItems: safeCount(inventoryResult.count),
      incomingRfqs: safeCount(incomingRfqsResult.count),
      matchedBoardPosts: safeCount(matchedBoardPostsResult.count),
      activeOrders: safeCount(activeOrdersResult.count),
      pendingInvoices: safeCount(pendingInvoicesResult.count),
    },
    bulletinBoardItems: safeBoardRows.map((row) => {
      const rfq = getJoinedRfq(row.rfqs);

      return {
        matchId: row.match_id,
        rfqId: row.rfq_id,
        title: rfq?.product_name ?? `RFQ #${row.rfq_id}`,
        description: rfq?.specifications ?? "No specifications provided.",
        status: rfq?.status ?? "open",
        matchScore: row.match_score,
        matchReason: row.match_reason,
        quantityLabel: buildQuantityLabel(rfq?.quantity ?? null, rfq?.unit ?? null),
        deadline: rfq?.deadline ?? null,
        createdAt: rfq?.created_at ?? null,
        notifiedAt: row.notified_at,
      };
    }),
  };
}

export async function openMatchedRfq(formData: FormData) {
  const { supabase, supplierProfile } = await getCurrentSupplierContext();

  const rfqId = Number(formData.get("rfq_id"));
  const matchId = Number(formData.get("match_id"));

  if (!rfqId || Number.isNaN(rfqId)) {
    throw new Error("Invalid RFQ.");
  }

  if (!matchId || Number.isNaN(matchId)) {
    throw new Error("Invalid match.");
  }

  const { data: existingEngagement, error: existingEngagementError } =
    await supabase
      .from("rfq_engagements")
      .select("engagement_id, rfq_id, supplier_id, status")
      .eq("rfq_id", rfqId)
      .eq("supplier_id", supplierProfile.supplier_id)
      .maybeSingle<ExistingEngagementRow>();

  if (existingEngagementError) {
    throw new Error(existingEngagementError.message);
  }

  let engagementId = existingEngagement?.engagement_id ?? null;

  if (!engagementId) {
    const { data: insertedEngagement, error: insertError } = await supabase
      .from("rfq_engagements")
      .insert({
        rfq_id: rfqId,
        supplier_id: supplierProfile.supplier_id,
        status: "viewing",
        viewed_at: new Date().toISOString(),
        initiated_at: new Date().toISOString(),
        final_quote_id: null,
        created_at: new Date().toISOString(),
      })
      .select("engagement_id")
      .single();

    if (insertError || !insertedEngagement) {
      throw new Error(insertError?.message || "Failed to open RFQ engagement.");
    }

    engagementId = insertedEngagement.engagement_id;
  } else if (existingEngagement && existingEngagement.status !== "rejected") {
    await supabase
      .from("rfq_engagements")
      .update({
        viewed_at: new Date().toISOString(),
      })
      .eq("engagement_id", engagementId);
  }

  await supabase
    .from("request_matches")
    .update({
      notified_at: new Date().toISOString(),
    })
    .eq("match_id", matchId)
    .eq("supplier_id", supplierProfile.supplier_id);

  revalidatePath("/supplier/dashboard");
  revalidatePath("/supplier/rfq");
  revalidatePath(`/supplier/rfq/${engagementId}`);

  redirect(`/supplier/rfq/${engagementId}`);
}
