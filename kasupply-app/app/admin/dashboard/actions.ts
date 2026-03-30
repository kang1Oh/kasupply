"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { safeLogAdminAction } from "@/lib/admin/audit";
import {
  safeReprocessOutstandingVerificationRuns,
  safeRetryLatestVerificationRunsForProfile,
  safeRetryVerificationRun,
} from "@/lib/verification/reprocessor";

type UserRoleRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  roles: { role_name: string } | null;
};

type BusinessProfileRow = {
  profile_id: number;
  user_id: string;
  business_name: string;
  business_type: string;
  city: string;
  province: string;
  region: string;
  business_location: string;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified_badge: boolean;
  verification_status: string | null;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
  verification_status: string | null;
};

type VerificationRunRow = {
  run_id: number;
  profile_id: number;
  target_type: string;
  target_id: number | null;
  kind: string;
  status: string;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};

type ProductRow = {
  product_id: number;
  supplier_id: number;
  product_name: string;
  is_published: boolean;
  stock_available: number | null;
  price_per_unit: number | null;
  updated_at: string | null;
};

type AdminActionLogRow = {
  action_id: number;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
};

export type AdminDashboardData = {
  summary: {
    totalAccounts: number;
    flaggedAccounts: number;
    publishedListings: number;
    verificationQueueCount: number;
  };
  accounts: Array<{
    userId: string;
    profileId: number | null;
    displayName: string;
    email: string;
    role: string;
    accountStatus: string;
    businessName: string | null;
    locationLabel: string | null;
    verificationLabel: string | null;
    hasVerifiedBadge: boolean;
  }>;
  verificationRuns: Array<{
    runId: number;
    profileId: number;
    businessName: string | null;
    kind: string;
    status: string;
    triggeredBy: string;
    targetType: string;
    targetId: number | null;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
  productListings: Array<{
    productId: number;
    supplierId: number;
    productName: string;
    supplierName: string;
    isPublished: boolean;
    stockAvailable: number | null;
    pricePerUnit: number | null;
    updatedAt: string | null;
  }>;
  recentActions: Array<{
    actionId: number;
    actionType: string;
    targetType: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
  }>;
};

const MODERATION_STATUSES = new Set([
  "active",
  "warned",
  "restricted",
  "suspended",
  "banned",
]);

function buildLocationLabel(profile: BusinessProfileRow | null) {
  if (!profile) return null;
  return [profile.city, profile.province, profile.region].filter(Boolean).join(", ");
}

async function getAdminContext() {
  const adminUser = await requireAdminUser();
  const supabase = await createClient();

  return { adminUser, supabase };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await getAdminContext();

  const [
    usersResult,
    businessProfilesResult,
    supplierProfilesResult,
    buyerProfilesResult,
    verificationRunsResult,
    productsResult,
    adminLogsResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        `
          user_id,
          name,
          email,
          status,
          roles!users_role_id_fkey (
            role_name
          )
        `
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("business_profiles")
      .select(
        "profile_id, user_id, business_name, business_type, city, province, region, business_location"
      ),
    supabase
      .from("supplier_profiles")
      .select("supplier_id, profile_id, verified_badge, verification_status"),
    supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id, verification_status"),
    supabase
      .from("verification_runs")
      .select(
        "run_id, profile_id, target_type, target_id, kind, status, triggered_by, created_at, completed_at, error_message"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("products")
      .select(
        "product_id, supplier_id, product_name, is_published, stock_available, price_per_unit, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("admin_action_logs")
      .select("action_id, action_type, target_type, target_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (usersResult.error) {
    throw new Error(usersResult.error.message || "Failed to load admin account monitoring data.");
  }

  if (businessProfilesResult.error) {
    throw new Error(
      businessProfilesResult.error.message || "Failed to load business profile monitoring data."
    );
  }

  if (supplierProfilesResult.error) {
    throw new Error(
      supplierProfilesResult.error.message || "Failed to load supplier moderation data."
    );
  }

  if (buyerProfilesResult.error) {
    throw new Error(
      buyerProfilesResult.error.message || "Failed to load buyer moderation data."
    );
  }

  if (verificationRunsResult.error) {
    throw new Error(
      verificationRunsResult.error.message || "Failed to load verification queue."
    );
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Failed to load product moderation data.");
  }

  const userRows = (usersResult.data as UserRoleRow[] | null) ?? [];
  const businessProfiles = (businessProfilesResult.data as BusinessProfileRow[] | null) ?? [];
  const supplierProfiles = (supplierProfilesResult.data as SupplierProfileRow[] | null) ?? [];
  const buyerProfiles = (buyerProfilesResult.data as BuyerProfileRow[] | null) ?? [];
  const verificationRuns = (verificationRunsResult.data as VerificationRunRow[] | null) ?? [];
  const products = (productsResult.data as ProductRow[] | null) ?? [];
  const recentActionLogs = adminLogsResult.error
    ? []
    : ((adminLogsResult.data as AdminActionLogRow[] | null) ?? []);

  const profileByUserId = new Map<string, BusinessProfileRow>();
  const profileByProfileId = new Map<number, BusinessProfileRow>();
  for (const profile of businessProfiles) {
    profileByUserId.set(profile.user_id, profile);
    profileByProfileId.set(profile.profile_id, profile);
  }

  const supplierByProfileId = new Map<number, SupplierProfileRow>();
  const supplierBySupplierId = new Map<number, SupplierProfileRow>();
  for (const supplier of supplierProfiles) {
    supplierByProfileId.set(supplier.profile_id, supplier);
    supplierBySupplierId.set(supplier.supplier_id, supplier);
  }

  const buyerByProfileId = new Map<number, BuyerProfileRow>();
  for (const buyer of buyerProfiles) {
    buyerByProfileId.set(buyer.profile_id, buyer);
  }

  const accounts = userRows.map((user) => {
    const profile = profileByUserId.get(user.user_id) ?? null;
    const supplierProfile = profile ? supplierByProfileId.get(profile.profile_id) ?? null : null;
    const buyerProfile = profile ? buyerByProfileId.get(profile.profile_id) ?? null : null;

    return {
      userId: user.user_id,
      profileId: profile?.profile_id ?? null,
      displayName: user.name || "Unnamed account",
      email: user.email || "No email",
      role: user.roles?.role_name || "Unknown",
      accountStatus: user.status || "active",
      businessName: profile?.business_name ?? null,
      locationLabel: buildLocationLabel(profile),
      verificationLabel:
        supplierProfile?.verification_status ?? buyerProfile?.verification_status ?? null,
      hasVerifiedBadge: supplierProfile?.verified_badge ?? false,
    };
  });

  const productListings = products.map((product) => {
    const supplierProfile = supplierBySupplierId.get(product.supplier_id) ?? null;
    const businessProfile = supplierProfile
      ? profileByProfileId.get(supplierProfile.profile_id) ?? null
      : null;

    return {
      productId: product.product_id,
      supplierId: product.supplier_id,
      productName: product.product_name,
      supplierName: businessProfile?.business_name ?? `Supplier #${product.supplier_id}`,
      isPublished: product.is_published,
      stockAvailable: product.stock_available,
      pricePerUnit: product.price_per_unit,
      updatedAt: product.updated_at,
    };
  });

  return {
    summary: {
      totalAccounts: accounts.length,
      flaggedAccounts: accounts.filter((account) =>
        ["warned", "restricted", "suspended", "banned"].includes(
          account.accountStatus.toLowerCase()
        ) || account.verificationLabel === "review_required"
      ).length,
      publishedListings: productListings.filter((item) => item.isPublished).length,
      verificationQueueCount: verificationRuns.filter((run) =>
        ["queued", "processing", "failed", "review_required"].includes(run.status)
      ).length,
    },
    accounts,
    verificationRuns: verificationRuns.map((run) => ({
      runId: run.run_id,
      profileId: run.profile_id,
      businessName: profileByProfileId.get(run.profile_id)?.business_name ?? null,
      kind: run.kind,
      status: run.status,
      triggeredBy: run.triggered_by,
      targetType: run.target_type,
      targetId: run.target_id,
      createdAt: run.created_at,
      completedAt: run.completed_at,
      errorMessage: run.error_message,
    })),
    productListings,
    recentActions: recentActionLogs.map((item) => ({
      actionId: item.action_id,
      actionType: item.action_type,
      targetType: item.target_type,
      targetId: item.target_id,
      reason: item.reason,
      createdAt: item.created_at,
    })),
  };
}

export async function updateAccountModerationStatus(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const userId = String(formData.get("user_id") || "").trim();
  const nextStatus = String(formData.get("next_status") || "").trim().toLowerCase();
  const reason = String(formData.get("reason") || "").trim();

  if (!userId) throw new Error("User is required.");
  if (!MODERATION_STATUSES.has(nextStatus)) throw new Error("Invalid moderation status.");

  const { error } = await supabase
    .from("users")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Failed to update account moderation status.");
  }

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: `account_${nextStatus}`,
    targetType: "user",
    targetId: userId,
    reason: reason || null,
    details: { nextStatus },
  });

  revalidatePath("/admin/dashboard");
}

export async function toggleListingModeration(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const productId = Number(formData.get("product_id"));
  const nextPublishedValue = String(formData.get("next_published")) === "true";
  const reason = String(formData.get("reason") || "").trim();

  if (!productId || Number.isNaN(productId)) {
    throw new Error("Invalid product.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_published: nextPublishedValue,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message || "Failed to update product visibility.");
  }

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: nextPublishedValue ? "restore_listing" : "remove_listing",
    targetType: "product",
    targetId: String(productId),
    reason: reason || null,
    details: { nextPublishedValue },
  });

  revalidatePath("/admin/dashboard");
}

export async function retryVerificationRunAction(formData: FormData) {
  const { adminUser } = await getAdminContext();
  const runId = Number(formData.get("run_id"));

  if (!runId || Number.isNaN(runId)) {
    throw new Error("Invalid verification run.");
  }

  const retriedRun = await safeRetryVerificationRun(runId);

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: "retry_verification_run",
    targetType: "verification_run",
    targetId: String(runId),
    details: {
      retryRunId: retriedRun?.run_id ?? null,
    },
  });

  revalidatePath("/admin/dashboard");
}

export async function retryProfileVerificationAction(formData: FormData) {
  const { adminUser } = await getAdminContext();
  const profileId = Number(formData.get("profile_id"));

  if (!profileId || Number.isNaN(profileId)) {
    throw new Error("Invalid business profile.");
  }

  const result = await safeRetryLatestVerificationRunsForProfile(profileId);

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: "retry_profile_verification",
    targetType: "profile",
    targetId: String(profileId),
    details: {
      retriedRunIds: result.runIds,
      count: result.count,
    },
  });

  revalidatePath("/admin/dashboard");
}

export async function reprocessOutstandingVerificationQueueAction(formData: FormData) {
  const { adminUser } = await getAdminContext();
  const limitValue = Number(formData.get("limit"));
  const limit = Number.isNaN(limitValue) || limitValue <= 0 ? 25 : limitValue;
  const result = await safeReprocessOutstandingVerificationRuns({ limit });

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: "reprocess_outstanding_verification_queue",
    targetType: "queue",
    targetId: "verification_runs",
    details: {
      processedRunIds: result.runIds,
      count: result.count,
      limit,
    },
  });

  revalidatePath("/admin/dashboard");
}
