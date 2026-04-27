"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { safeLogAdminAction } from "@/lib/admin/audit";
import {
  getSupplierCertificationRequirements,
  getSupplierDocumentRequirements,
} from "@/lib/supplier-requirements";
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
  roles: { role_name: string } | Array<{ role_name: string }> | null;
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

function getUserRoleName(user: Pick<UserRoleRow, "roles">) {
  if (Array.isArray(user.roles)) {
    return user.roles[0]?.role_name ?? "Unknown";
  }

  return user.roles?.role_name ?? "Unknown";
}

type ModerationReportRow = {
  report_id: number;
  reporter_user_id: string | null;
  target_type: string;
  reported_user_id: string | null;
  reported_product_id: number | null;
  reason_code: string;
  description: string | null;
  evidence: unknown[] | null;
  status: string;
  priority: string;
  assigned_admin_user_id: string | null;
  admin_resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type ModerationReportMessageRow = {
  message_id: number;
  report_id: number;
  sender_type: string;
  sender_user_id: string | null;
  message_body: string;
  is_internal: boolean;
  created_at: string;
};

type AccountEnforcementActionRow = {
  enforcement_id: number;
  user_id: string;
  report_id: number | null;
  admin_user_id: string;
  action_type: string;
  reason: string;
  public_note: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
    openReportsCount: number;
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

export type AdminAccountsPageData = {
  summary: AdminDashboardData["summary"];
  accounts: AdminDashboardData["accounts"];
  filters: {
    query: string;
    status: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type AdminModerationPageData = {
  summary: {
    totalListings: number;
    publishedListings: number;
    hiddenListings: number;
  };
  productListings: AdminDashboardData["productListings"];
  filters: {
    query: string;
    visibility: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type AdminReportsPageData = {
  summary: {
    totalReports: number;
    openReports: number;
    underReviewReports: number;
    resolvedReports: number;
  };
  reports: Array<{
    reportId: number;
    status: string;
    priority: string;
    reasonCode: string;
    description: string | null;
    adminResolution: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    reportedUser: {
      userId: string;
      displayName: string;
      email: string;
      role: string;
      accountStatus: string;
      businessName: string | null;
    } | null;
    reporter: {
      userId: string | null;
      displayName: string;
      email: string;
    } | null;
    assignedAdminName: string | null;
    messages: Array<{
      messageId: number;
      senderType: string;
      senderName: string;
      messageBody: string;
      isInternal: boolean;
      createdAt: string;
    }>;
    enforcementHistory: Array<{
      enforcementId: number;
      actionType: string;
      reason: string;
      publicNote: string | null;
      isActive: boolean;
      createdAt: string;
      adminName: string | null;
    }>;
  }>;
  filters: {
    query: string;
    status: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type AdminSupplierRequirementsPageData = {
  documents: Awaited<ReturnType<typeof getSupplierDocumentRequirements>>;
  certifications: Awaited<ReturnType<typeof getSupplierCertificationRequirements>>;
};

type SupplierRequirementKind = "document" | "certification";

const MODERATION_STATUSES = new Set([
  "active",
  "warned",
  "restricted",
  "suspended",
  "banned",
]);
const HIGH_RISK_ACCOUNT_STATUSES = new Set(["suspended", "banned"]);
const ACCOUNT_STATUS_FILTERS = new Set(["all", ...MODERATION_STATUSES]);
const MODERATION_VISIBILITY_FILTERS = new Set(["all", "published", "hidden"]);
const OPEN_REPORT_STATUSES = ["submitted", "under_review"] as const;
const REPORT_STATUS_FILTERS = new Set([
  "all",
  "open",
  "submitted",
  "under_review",
  "action_taken",
  "dismissed",
  "closed",
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

function normalizePage(value: number | undefined, fallback = 1) {
  if (!value || Number.isNaN(value) || value < 1) return fallback;
  return Math.floor(value);
}

function createPagination(totalItems: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(normalizePage(page), totalPages);
  const startOffset = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const endOffset = Math.min(startOffset + pageSize, totalItems);

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startOffset,
    endOffset,
    startIndex: totalItems === 0 ? 0 : startOffset + 1,
    endIndex: endOffset,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

function readOpenReportsCountByUser(reports: ModerationReportRow[]) {
  const counts = new Map<string, number>();

  for (const report of reports) {
    if (!report.reported_user_id || !OPEN_REPORT_STATUSES.includes(report.status as (typeof OPEN_REPORT_STATUSES)[number])) {
      continue;
    }

    counts.set(report.reported_user_id, (counts.get(report.reported_user_id) ?? 0) + 1);
  }

  return counts;
}

async function applyAccountStatusChange(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  adminUserId: string;
  userId: string;
  nextStatus: string;
  reason: string | null;
  reportId?: number | null;
}) {
  const { supabase, adminUserId, userId, nextStatus, reason, reportId = null } = params;

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("user_id, status")
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string; status: string | null }>();

  if (existingUserError || !existingUser) {
    throw new Error(existingUserError?.message || "User not found.");
  }

  const currentStatus = String(existingUser.status ?? "active").toLowerCase();

  if (!MODERATION_STATUSES.has(nextStatus)) {
    throw new Error("Invalid moderation status.");
  }

  if (HIGH_RISK_ACCOUNT_STATUSES.has(nextStatus) && !reason) {
    throw new Error("Reason is required when suspending or banning an account.");
  }

  if (currentStatus === nextStatus) {
    return;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("users")
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update account moderation status.");
  }

  let enforcementActionType: string | null = null;
  if (nextStatus === "warned") enforcementActionType = "warn";
  if (nextStatus === "restricted") enforcementActionType = "restrict";
  if (nextStatus === "suspended") enforcementActionType = "suspend";
  if (nextStatus === "banned") enforcementActionType = "ban";
  if (
    nextStatus === "active" &&
    ["restricted", "suspended", "banned"].includes(currentStatus)
  ) {
    enforcementActionType = "reinstate";
  }

  if (["restricted", "suspended", "banned"].includes(nextStatus) || nextStatus === "active") {
    await supabase
      .from("account_enforcement_actions")
      .update({
        is_active: false,
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("is_active", true);
  }

  if (enforcementActionType) {
    const { error: enforcementError } = await supabase
      .from("account_enforcement_actions")
      .insert({
        user_id: userId,
        report_id: reportId,
        admin_user_id: adminUserId,
        action_type: enforcementActionType,
        reason: reason || `Account status changed to ${nextStatus}.`,
        public_note: null,
        starts_at: now,
        is_active: ["restrict", "suspend", "ban"].includes(enforcementActionType),
      });

    if (enforcementError) {
      throw new Error(enforcementError.message || "Failed to save enforcement action.");
    }
  }
}

function revalidateAdminWorkspace() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/requirements");
  revalidatePath("/admin/verification/[runId]", "page");
  revalidatePath("/onboarding/supplier-documents");
  revalidatePath("/supplier/account-settings");
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await getAdminContext();

  const [
    usersResult,
    businessProfilesResult,
    supplierProfilesResult,
    buyerProfilesResult,
    moderationReportsResult,
    verificationRunsResult,
    verificationQueueCountResult,
    productsResult,
    publishedListingsCountResult,
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
      .from("moderation_reports")
      .select(
        "report_id, reporter_user_id, target_type, reported_user_id, reported_product_id, reason_code, description, evidence, status, priority, assigned_admin_user_id, admin_resolution, resolved_at, created_at, updated_at"
      )
      .eq("target_type", "user"),
    supabase
      .from("verification_runs")
      .select(
        "run_id, profile_id, target_type, target_id, kind, status, triggered_by, created_at, completed_at, error_message"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("verification_runs")
      .select("run_id", { count: "exact", head: true })
      .in("status", ["queued", "processing", "failed", "review_required"]),
    supabase
      .from("products")
      .select(
        "product_id, supplier_id, product_name, is_published, stock_available, price_per_unit, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("products")
      .select("product_id", { count: "exact", head: true })
      .eq("is_published", true),
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

  if (moderationReportsResult.error) {
    throw new Error(moderationReportsResult.error.message || "Failed to load moderation reports.");
  }

  if (verificationRunsResult.error) {
    throw new Error(
      verificationRunsResult.error.message || "Failed to load verification queue."
    );
  }

  if (verificationQueueCountResult.error) {
    throw new Error(
      verificationQueueCountResult.error.message ||
        "Failed to load verification queue summary."
    );
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Failed to load product moderation data.");
  }

  if (publishedListingsCountResult.error) {
    throw new Error(
      publishedListingsCountResult.error.message || "Failed to load published listings summary."
    );
  }

  const userRows = (usersResult.data as UserRoleRow[] | null) ?? [];
  const businessProfiles = (businessProfilesResult.data as BusinessProfileRow[] | null) ?? [];
  const supplierProfiles = (supplierProfilesResult.data as SupplierProfileRow[] | null) ?? [];
  const buyerProfiles = (buyerProfilesResult.data as BuyerProfileRow[] | null) ?? [];
  const moderationReports =
    (moderationReportsResult.data as ModerationReportRow[] | null) ?? [];
  const verificationRuns = (verificationRunsResult.data as VerificationRunRow[] | null) ?? [];
  const products = (productsResult.data as ProductRow[] | null) ?? [];
  const recentActionLogs = adminLogsResult.error
    ? []
    : ((adminLogsResult.data as AdminActionLogRow[] | null) ?? []);
  const openReportCountsByUser = readOpenReportsCountByUser(moderationReports);

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
      role: getUserRoleName(user),
      accountStatus: user.status || "active",
      businessName: profile?.business_name ?? null,
      locationLabel: buildLocationLabel(profile),
      verificationLabel:
        supplierProfile?.verification_status ?? buyerProfile?.verification_status ?? null,
      hasVerifiedBadge: supplierProfile?.verified_badge ?? false,
      openReportsCount: openReportCountsByUser.get(user.user_id) ?? 0,
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
        ) ||
        account.verificationLabel === "review_required" ||
        account.openReportsCount > 0
      ).length,
      publishedListings: publishedListingsCountResult.count ?? 0,
      verificationQueueCount: verificationQueueCountResult.count ?? 0,
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

export async function getAdminAccountsPageData({
  query,
  status,
  page,
  pageSize = 12,
}: {
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminAccountsPageData> {
  const dashboardData = await getAdminDashboardData();
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const normalizedStatus = ACCOUNT_STATUS_FILTERS.has(String(status ?? "").toLowerCase())
    ? String(status ?? "").toLowerCase()
    : "all";

  const filteredAccounts = dashboardData.accounts.filter((account) => {
    const matchesStatus =
      normalizedStatus === "all" || account.accountStatus.toLowerCase() === normalizedStatus;

    if (!matchesStatus) return false;
    if (!normalizedQuery) return true;

    return [
      account.displayName,
      account.email,
      account.businessName ?? "",
      account.locationLabel ?? "",
      account.role,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const pagination = createPagination(filteredAccounts.length, page ?? 1, pageSize);

  return {
    summary: dashboardData.summary,
    accounts: filteredAccounts.slice(pagination.startOffset, pagination.endOffset),
    filters: {
      query: query?.trim() ?? "",
      status: normalizedStatus,
    },
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
      hasPreviousPage: pagination.hasPreviousPage,
      hasNextPage: pagination.hasNextPage,
    },
  };
}

export async function getAdminModerationPageData({
  query,
  visibility,
  page,
  pageSize = 12,
}: {
  query?: string;
  visibility?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminModerationPageData> {
  const { supabase } = await getAdminContext();
  const [productsResult, supplierProfilesResult, businessProfilesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "product_id, supplier_id, product_name, is_published, stock_available, price_per_unit, updated_at"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("supplier_profiles")
      .select("supplier_id, profile_id, verified_badge, verification_status"),
    supabase
      .from("business_profiles")
      .select("profile_id, user_id, business_name, business_type, city, province, region, business_location"),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Failed to load product moderation data.");
  }

  if (supplierProfilesResult.error) {
    throw new Error(
      supplierProfilesResult.error.message || "Failed to load supplier moderation data."
    );
  }

  if (businessProfilesResult.error) {
    throw new Error(
      businessProfilesResult.error.message || "Failed to load business profile monitoring data."
    );
  }

  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const normalizedVisibility = MODERATION_VISIBILITY_FILTERS.has(
    String(visibility ?? "").toLowerCase()
  )
    ? String(visibility ?? "").toLowerCase()
    : "all";

  const supplierProfiles = (supplierProfilesResult.data as SupplierProfileRow[] | null) ?? [];
  const businessProfiles = (businessProfilesResult.data as BusinessProfileRow[] | null) ?? [];
  const products = (productsResult.data as ProductRow[] | null) ?? [];

  const profileByProfileId = new Map<number, BusinessProfileRow>();
  for (const profile of businessProfiles) {
    profileByProfileId.set(profile.profile_id, profile);
  }

  const supplierBySupplierId = new Map<number, SupplierProfileRow>();
  for (const supplier of supplierProfiles) {
    supplierBySupplierId.set(supplier.supplier_id, supplier);
  }

  const allListings = products.map((product) => {
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

  const filteredListings = allListings.filter((product) => {
    const matchesVisibility =
      normalizedVisibility === "all" ||
      (normalizedVisibility === "published" && product.isPublished) ||
      (normalizedVisibility === "hidden" && !product.isPublished);

    if (!matchesVisibility) return false;
    if (!normalizedQuery) return true;

    return [product.productName, product.supplierName, String(product.productId)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const pagination = createPagination(filteredListings.length, page ?? 1, pageSize);

  return {
    summary: {
      totalListings: allListings.length,
      publishedListings: allListings.filter((product) => product.isPublished).length,
      hiddenListings: allListings.filter((product) => !product.isPublished).length,
    },
    productListings: filteredListings.slice(pagination.startOffset, pagination.endOffset),
    filters: {
      query: query?.trim() ?? "",
      visibility: normalizedVisibility,
    },
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
      hasPreviousPage: pagination.hasPreviousPage,
      hasNextPage: pagination.hasNextPage,
    },
  };
}

export async function getAdminReportsPageData({
  query,
  status,
  page,
  pageSize = 8,
}: {
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminReportsPageData> {
  const { supabase } = await getAdminContext();
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const normalizedStatus = REPORT_STATUS_FILTERS.has(String(status ?? "").toLowerCase())
    ? String(status ?? "").toLowerCase()
    : "all";

  const { data: reportsData, error: reportsError } = await supabase
    .from("moderation_reports")
    .select(
      "report_id, reporter_user_id, target_type, reported_user_id, reported_product_id, reason_code, description, evidence, status, priority, assigned_admin_user_id, admin_resolution, resolved_at, created_at, updated_at"
    )
    .eq("target_type", "user")
    .order("created_at", { ascending: false });

  if (reportsError) {
    throw new Error(reportsError.message || "Failed to load moderation reports.");
  }

  const reports = (reportsData as ModerationReportRow[] | null) ?? [];
  const reportIds = reports.map((report) => report.report_id);
  const reportUserIds = Array.from(
    new Set(
      reports.flatMap((report) =>
        [report.reporter_user_id, report.reported_user_id, report.assigned_admin_user_id].filter(
          Boolean
        ) as string[]
      )
    )
  );

  const messagesPromise =
    reportIds.length > 0
      ? supabase
          .from("moderation_report_messages")
          .select(
            "message_id, report_id, sender_type, sender_user_id, message_body, is_internal, created_at"
          )
          .in("report_id", reportIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const enforcementPromise =
    reportUserIds.length > 0
      ? supabase
          .from("account_enforcement_actions")
          .select(
            "enforcement_id, user_id, report_id, admin_user_id, action_type, reason, public_note, starts_at, ends_at, is_active, created_at, updated_at"
          )
          .in("user_id", reportUserIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const [messagesResult, enforcementResult] = await Promise.all([
    messagesPromise,
    enforcementPromise,
  ]);

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message || "Failed to load moderation report messages.");
  }

  if (enforcementResult.error) {
    throw new Error(
      enforcementResult.error.message || "Failed to load account enforcement history."
    );
  }

  const messages = (messagesResult.data as ModerationReportMessageRow[] | null) ?? [];
  const enforcementActions =
    (enforcementResult.data as AccountEnforcementActionRow[] | null) ?? [];
  const extendedUserIds = Array.from(
    new Set([
      ...reportUserIds,
      ...messages.map((message) => message.sender_user_id).filter(Boolean),
      ...enforcementActions.map((item) => item.admin_user_id).filter(Boolean),
    ] as string[])
  );

  const [usersResult, businessProfilesResult] = await Promise.all([
    extendedUserIds.length > 0
      ? supabase
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
          .in("user_id", extendedUserIds)
      : Promise.resolve({ data: [], error: null }),
    extendedUserIds.length > 0
      ? supabase
          .from("business_profiles")
          .select("profile_id, user_id, business_name, business_type, city, province, region, business_location")
          .in("user_id", extendedUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (usersResult.error) {
    throw new Error(usersResult.error.message || "Failed to load report user data.");
  }

  if (businessProfilesResult.error) {
    throw new Error(
      businessProfilesResult.error.message || "Failed to load report business profiles."
    );
  }

  const users = (usersResult.data as UserRoleRow[] | null) ?? [];
  const businessProfiles =
    (businessProfilesResult.data as BusinessProfileRow[] | null) ?? [];

  const userById = new Map(users.map((user) => [user.user_id, user]));
  const profileByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
  const messagesByReportId = new Map<number, ModerationReportMessageRow[]>();
  const enforcementByUserId = new Map<string, AccountEnforcementActionRow[]>();

  for (const message of messages) {
    const reportMessages = messagesByReportId.get(message.report_id) ?? [];
    reportMessages.push(message);
    messagesByReportId.set(message.report_id, reportMessages);
  }

  for (const enforcement of enforcementActions) {
    const userEnforcement = enforcementByUserId.get(enforcement.user_id) ?? [];
    userEnforcement.push(enforcement);
    enforcementByUserId.set(enforcement.user_id, userEnforcement);
  }

  const mappedReports = reports.map((report) => {
    const reportedUser = report.reported_user_id
      ? userById.get(report.reported_user_id) ?? null
      : null;
    const reporterUser = report.reporter_user_id
      ? userById.get(report.reporter_user_id) ?? null
      : null;
    const assignedAdmin = report.assigned_admin_user_id
      ? userById.get(report.assigned_admin_user_id) ?? null
      : null;
    const reportedBusiness = report.reported_user_id
      ? profileByUserId.get(report.reported_user_id) ?? null
      : null;
    const reportMessages = messagesByReportId.get(report.report_id) ?? [];
    const reportEnforcement =
      report.reported_user_id != null
        ? (enforcementByUserId.get(report.reported_user_id) ?? []).filter(
            (item) => item.report_id === report.report_id || item.report_id == null
          )
        : [];

    return {
      reportId: report.report_id,
      status: report.status,
      priority: report.priority,
      reasonCode: report.reason_code,
      description: report.description,
      adminResolution: report.admin_resolution,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      resolvedAt: report.resolved_at,
      reportedUser: reportedUser
        ? {
            userId: reportedUser.user_id,
            displayName: reportedUser.name || "Unnamed account",
            email: reportedUser.email || "No email",
            role: getUserRoleName(reportedUser),
            accountStatus: reportedUser.status || "active",
            businessName: reportedBusiness?.business_name ?? null,
          }
        : null,
      reporter: reporterUser
        ? {
            userId: reporterUser.user_id,
            displayName: reporterUser.name || "Anonymous reporter",
            email: reporterUser.email || "No email",
          }
        : null,
      assignedAdminName: assignedAdmin?.name || assignedAdmin?.email || null,
      messages: reportMessages.map((message) => {
        const sender = message.sender_user_id
          ? userById.get(message.sender_user_id) ?? null
          : null;

        return {
          messageId: message.message_id,
          senderType: message.sender_type,
          senderName:
            sender?.name || sender?.email || (message.sender_type === "admin" ? "Admin" : "System"),
          messageBody: message.message_body,
          isInternal: message.is_internal,
          createdAt: message.created_at,
        };
      }),
      enforcementHistory: reportEnforcement.map((item) => ({
        enforcementId: item.enforcement_id,
        actionType: item.action_type,
        reason: item.reason,
        publicNote: item.public_note,
        isActive: item.is_active,
        createdAt: item.created_at,
        adminName:
          userById.get(item.admin_user_id)?.name ||
          userById.get(item.admin_user_id)?.email ||
          null,
      })),
    };
  });

  const filteredReports = mappedReports.filter((report) => {
    const matchesStatus =
      normalizedStatus === "all" ||
      (normalizedStatus === "open"
        ? OPEN_REPORT_STATUSES.includes(
            report.status as (typeof OPEN_REPORT_STATUSES)[number]
          )
        : report.status.toLowerCase() === normalizedStatus);

    if (!matchesStatus) return false;
    if (!normalizedQuery) return true;

    return [
      report.reasonCode,
      report.description ?? "",
      report.reportedUser?.displayName ?? "",
      report.reportedUser?.email ?? "",
      report.reportedUser?.businessName ?? "",
      report.reporter?.displayName ?? "",
      report.reporter?.email ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const pagination = createPagination(filteredReports.length, page ?? 1, pageSize);

  return {
    summary: {
      totalReports: reports.length,
      openReports: reports.filter((report) =>
        OPEN_REPORT_STATUSES.includes(report.status as (typeof OPEN_REPORT_STATUSES)[number])
      ).length,
      underReviewReports: reports.filter((report) => report.status === "under_review").length,
      resolvedReports: reports.filter((report) =>
        ["action_taken", "dismissed", "closed"].includes(report.status)
      ).length,
    },
    reports: filteredReports.slice(pagination.startOffset, pagination.endOffset),
    filters: {
      query: query?.trim() ?? "",
      status: normalizedStatus,
    },
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
      hasPreviousPage: pagination.hasPreviousPage,
      hasNextPage: pagination.hasNextPage,
    },
  };
}

export async function getAdminSupplierRequirementsPageData(): Promise<AdminSupplierRequirementsPageData> {
  const { supabase } = await getAdminContext();

  const [documents, certifications] = await Promise.all([
    getSupplierDocumentRequirements(supabase),
    getSupplierCertificationRequirements(supabase),
  ]);

  return {
    documents,
    certifications,
  };
}

function readSupplierRequirementKind(formData: FormData): SupplierRequirementKind {
  const requirementKind = String(formData.get("requirement_kind") || "").trim().toLowerCase();

  if (requirementKind !== "document" && requirementKind !== "certification") {
    throw new Error("Invalid supplier requirement kind.");
  }

  return requirementKind;
}

function readRequirementDisplayOrder(formData: FormData) {
  const rawDisplayOrder = Number(formData.get("display_order"));
  return Number.isNaN(rawDisplayOrder) ? 0 : rawDisplayOrder;
}

export async function updateAccountModerationStatus(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const userId = String(formData.get("user_id") || "").trim();
  const nextStatus = String(formData.get("next_status") || "").trim().toLowerCase();
  const reason = String(formData.get("reason") || "").trim();

  if (!userId) throw new Error("User is required.");

  await applyAccountStatusChange({
    supabase,
    adminUserId: adminUser.user_id,
    userId,
    nextStatus,
    reason: reason || null,
  });

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: `account_${nextStatus}`,
    targetType: "user",
    targetId: userId,
    reason: reason || null,
    details: { nextStatus },
  });

  revalidateAdminWorkspace();
}

export async function toggleListingModeration(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const productId = Number(formData.get("product_id"));
  const nextPublishedValue = String(formData.get("next_published")) === "true";
  const reason = String(formData.get("reason") || "").trim();

  if (!productId || Number.isNaN(productId)) {
    throw new Error("Invalid product.");
  }
  if (!nextPublishedValue && !reason) {
    throw new Error("Reason is required when removing a listing.");
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

  revalidateAdminWorkspace();
}

export async function reviewModerationReportAction(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const reportId = Number(formData.get("report_id"));
  const nextReportStatus = String(formData.get("next_report_status") || "")
    .trim()
    .toLowerCase();
  const nextAccountStatus = String(formData.get("next_account_status") || "")
    .trim()
    .toLowerCase();
  const reason = String(formData.get("reason") || "").trim();
  const response = String(formData.get("response") || "").trim();

  if (!reportId || Number.isNaN(reportId)) {
    throw new Error("Invalid moderation report.");
  }

  if (
    !["submitted", "under_review", "action_taken", "dismissed", "closed"].includes(
      nextReportStatus
    )
  ) {
    throw new Error("Invalid report status.");
  }

  if (nextAccountStatus !== "no_change" && !MODERATION_STATUSES.has(nextAccountStatus)) {
    throw new Error("Invalid account moderation action.");
  }

  if (nextAccountStatus !== "no_change" && !reason) {
    throw new Error("Reason is required when taking an account action from a report.");
  }

  const { data: report, error: reportError } = await supabase
    .from("moderation_reports")
    .select(
      "report_id, reporter_user_id, target_type, reported_user_id, reported_product_id, reason_code, description, evidence, status, priority, assigned_admin_user_id, admin_resolution, resolved_at, created_at, updated_at"
    )
    .eq("report_id", reportId)
    .maybeSingle<ModerationReportRow>();

  if (reportError || !report) {
    throw new Error(reportError?.message || "Moderation report not found.");
  }

  if (report.target_type !== "user" || !report.reported_user_id) {
    throw new Error("This report is not linked to a reported user.");
  }

  if (response) {
    const { error: messageError } = await supabase
      .from("moderation_report_messages")
      .insert({
        report_id: reportId,
        sender_type: "admin",
        sender_user_id: adminUser.user_id,
        message_body: response,
        is_internal: false,
      });

    if (messageError) {
      throw new Error(messageError.message || "Failed to save admin response.");
    }
  }

  if (nextAccountStatus !== "no_change") {
    await applyAccountStatusChange({
      supabase,
      adminUserId: adminUser.user_id,
      userId: report.reported_user_id,
      nextStatus: nextAccountStatus,
      reason,
      reportId,
    });
  }

  const resolvedAt =
    ["action_taken", "dismissed", "closed"].includes(nextReportStatus) &&
    !report.resolved_at
      ? new Date().toISOString()
      : report.resolved_at;

  const { error: updateReportError } = await supabase
    .from("moderation_reports")
    .update({
      status: nextReportStatus,
      assigned_admin_user_id: adminUser.user_id,
      admin_resolution: response || reason || report.admin_resolution,
      resolved_at: resolvedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("report_id", reportId);

  if (updateReportError) {
    throw new Error(updateReportError.message || "Failed to update moderation report.");
  }

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: "review_moderation_report",
    targetType: "user",
    targetId: report.reported_user_id,
    reason: reason || response || null,
    details: {
      reportId,
      nextReportStatus,
      nextAccountStatus,
    },
  });

  revalidateAdminWorkspace();
}

export async function saveSupplierRequirementRuleAction(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const requirementKind = readSupplierRequirementKind(formData);
  const docTypeId = Number(formData.get("doc_type_id"));
  const certTypeId = Number(formData.get("cert_type_id"));
  const label = String(formData.get("label") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const displayOrder = readRequirementDisplayOrder(formData);
  const isRequired = String(formData.get("is_required")) === "on";
  const isActive = String(formData.get("is_active")) === "on";
  const showInOnboarding = String(formData.get("show_in_onboarding")) === "on";
  const allowPostOnboardingSubmission =
    String(formData.get("allow_post_onboarding_submission")) === "on";

  const matchColumn = requirementKind === "document" ? "doc_type_id" : "cert_type_id";
  const matchValue = requirementKind === "document" ? docTypeId : certTypeId;

  if (!matchValue || Number.isNaN(matchValue)) {
    throw new Error("A matching document or certification type is required.");
  }

  if (!label) {
    throw new Error(
      requirementKind === "document"
        ? "Document name is required."
        : "Certification name is required."
    );
  }

  if (requirementKind === "document") {
    const { error: updateTypeError } = await supabase
      .from("document_types")
      .update({
        document_type_name: label,
      })
      .eq("doc_type_id", docTypeId);

    if (updateTypeError) {
      throw new Error(updateTypeError.message || "Failed to update document type.");
    }
  } else {
    const { error: updateTypeError } = await supabase
      .from("certification_types")
      .update({
        certification_type_name: label,
        description: description || null,
      })
      .eq("cert_type_id", certTypeId);

    if (updateTypeError) {
      throw new Error(updateTypeError.message || "Failed to update certification type.");
    }
  }

  const { data: existingRule, error: existingRuleError } = await supabase
    .from("supplier_requirement_rules")
    .select("requirement_id")
    .eq("requirement_kind", requirementKind)
    .eq(matchColumn, matchValue)
    .maybeSingle<{ requirement_id: number }>();

  if (existingRuleError) {
    throw new Error(existingRuleError.message || "Failed to load existing requirement rule.");
  }

  const payload = {
    requirement_kind: requirementKind,
    doc_type_id: requirementKind === "document" ? docTypeId : null,
    cert_type_id: requirementKind === "certification" ? certTypeId : null,
    is_required: requirementKind === "document" ? isRequired : false,
    is_active: isActive,
    show_in_onboarding: requirementKind === "document" ? showInOnboarding : false,
    allow_post_onboarding_submission:
      requirementKind === "certification" ? allowPostOnboardingSubmission : false,
    display_order: displayOrder,
    updated_by_admin_user_id: adminUser.user_id,
    updated_at: new Date().toISOString(),
  };

  const query = existingRule
    ? supabase
        .from("supplier_requirement_rules")
        .update(payload)
        .eq("requirement_id", existingRule.requirement_id)
    : supabase.from("supplier_requirement_rules").insert({
        ...payload,
        created_by_admin_user_id: adminUser.user_id,
        created_at: new Date().toISOString(),
      });

  const { error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to save supplier requirement rule.");
  }

  await safeLogAdminAction({
    adminUserId: adminUser.user_id,
    actionType: "save_supplier_requirement",
    targetType: "profile",
    targetId: `${requirementKind}:${matchValue}`,
    details: {
      requirementKind,
      matchValue,
      label,
      description: requirementKind === "certification" ? description || null : null,
      isRequired: payload.is_required,
      isActive,
      showInOnboarding: payload.show_in_onboarding,
      allowPostOnboardingSubmission: payload.allow_post_onboarding_submission,
      displayOrder,
    },
  });

  revalidateAdminWorkspace();
}

export async function createSupplierRequirementTypeAction(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const requirementKind = readSupplierRequirementKind(formData);
  const label = String(formData.get("label") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const displayOrder = readRequirementDisplayOrder(formData);
  const isRequired = String(formData.get("is_required")) === "on";
  const isActive = String(formData.get("is_active")) === "on";
  const showInOnboarding = String(formData.get("show_in_onboarding")) === "on";
  const allowPostOnboardingSubmission =
    String(formData.get("allow_post_onboarding_submission")) === "on";

  if (!label) {
    throw new Error(
      requirementKind === "document"
        ? "Document name is required."
        : "Certification name is required."
    );
  }

  if (requirementKind === "document") {
    const { data: insertedDocumentType, error: insertDocumentTypeError } = await supabase
      .from("document_types")
      .insert({
        document_type_name: label,
      })
      .select("doc_type_id")
      .single<{ doc_type_id: number }>();

    if (insertDocumentTypeError || !insertedDocumentType) {
      throw new Error(insertDocumentTypeError?.message || "Failed to create document type.");
    }

    const { error: insertRuleError } = await supabase.from("supplier_requirement_rules").insert({
      requirement_kind: "document",
      doc_type_id: insertedDocumentType.doc_type_id,
      cert_type_id: null,
      is_required: isRequired,
      is_active: isActive,
      show_in_onboarding: showInOnboarding,
      allow_post_onboarding_submission: false,
      display_order: displayOrder,
      created_by_admin_user_id: adminUser.user_id,
      updated_by_admin_user_id: adminUser.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertRuleError) {
      await supabase
        .from("document_types")
        .delete()
        .eq("doc_type_id", insertedDocumentType.doc_type_id);
      throw new Error(insertRuleError.message || "Failed to create document requirement rule.");
    }

    await safeLogAdminAction({
      adminUserId: adminUser.user_id,
      actionType: "create_supplier_requirement",
      targetType: "profile",
      targetId: `document:${insertedDocumentType.doc_type_id}`,
      details: {
        requirementKind,
        label,
        isRequired,
        isActive,
        showInOnboarding,
        displayOrder,
      },
    });
  } else {
    const { data: insertedCertificationType, error: insertCertificationTypeError } = await supabase
      .from("certification_types")
      .insert({
        certification_type_name: label,
        description: description || null,
      })
      .select("cert_type_id")
      .single<{ cert_type_id: number }>();

    if (insertCertificationTypeError || !insertedCertificationType) {
      throw new Error(
        insertCertificationTypeError?.message || "Failed to create certification type."
      );
    }

    const { error: insertRuleError } = await supabase.from("supplier_requirement_rules").insert({
      requirement_kind: "certification",
      doc_type_id: null,
      cert_type_id: insertedCertificationType.cert_type_id,
      is_required: false,
      is_active: isActive,
      show_in_onboarding: false,
      allow_post_onboarding_submission: allowPostOnboardingSubmission,
      display_order: displayOrder,
      created_by_admin_user_id: adminUser.user_id,
      updated_by_admin_user_id: adminUser.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertRuleError) {
      await supabase
        .from("certification_types")
        .delete()
        .eq("cert_type_id", insertedCertificationType.cert_type_id);
      throw new Error(
        insertRuleError.message || "Failed to create certification requirement rule."
      );
    }

    await safeLogAdminAction({
      adminUserId: adminUser.user_id,
      actionType: "create_supplier_requirement",
      targetType: "profile",
      targetId: `certification:${insertedCertificationType.cert_type_id}`,
      details: {
        requirementKind,
        label,
        description: description || null,
        isActive,
        allowPostOnboardingSubmission,
        displayOrder,
      },
    });
  }

  revalidateAdminWorkspace();
}

export async function deleteSupplierRequirementTypeAction(formData: FormData) {
  const { adminUser, supabase } = await getAdminContext();
  const requirementKind = readSupplierRequirementKind(formData);

  if (requirementKind === "document") {
    const docTypeId = Number(formData.get("doc_type_id"));

    if (!docTypeId || Number.isNaN(docTypeId)) {
      throw new Error("Document type is required.");
    }

    const [{ data: documentType, error: documentTypeError }, { count, error: usageError }] =
      await Promise.all([
        supabase
          .from("document_types")
          .select("doc_type_id, document_type_name")
          .eq("doc_type_id", docTypeId)
          .maybeSingle<{ doc_type_id: number; document_type_name: string }>(),
        supabase
          .from("business_documents")
          .select("doc_id", { count: "exact", head: true })
          .eq("doc_type_id", docTypeId),
      ]);

    if (documentTypeError || !documentType) {
      throw new Error(documentTypeError?.message || "Document type not found.");
    }

    if (usageError) {
      throw new Error(usageError.message || "Failed to check document usage.");
    }

    if ((count ?? 0) > 0) {
      throw new Error(
        "This document requirement already has supplier submissions. Make it inactive instead of deleting it."
      );
    }

    const { error: deleteError } = await supabase
      .from("document_types")
      .delete()
      .eq("doc_type_id", docTypeId);

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to delete document type.");
    }

    await safeLogAdminAction({
      adminUserId: adminUser.user_id,
      actionType: "delete_supplier_requirement",
      targetType: "profile",
      targetId: `document:${docTypeId}`,
      details: {
        requirementKind,
        label: documentType.document_type_name,
      },
    });
  } else {
    const certTypeId = Number(formData.get("cert_type_id"));

    if (!certTypeId || Number.isNaN(certTypeId)) {
      throw new Error("Certification type is required.");
    }

    const [{ data: certificationType, error: certificationTypeError }, { count, error: usageError }] =
      await Promise.all([
        supabase
          .from("certification_types")
          .select("cert_type_id, certification_type_name")
          .eq("cert_type_id", certTypeId)
          .maybeSingle<{ cert_type_id: number; certification_type_name: string }>(),
        supabase
          .from("supplier_certifications")
          .select("certification_id", { count: "exact", head: true })
          .eq("cert_type_id", certTypeId),
      ]);

    if (certificationTypeError || !certificationType) {
      throw new Error(certificationTypeError?.message || "Certification type not found.");
    }

    if (usageError) {
      throw new Error(usageError.message || "Failed to check certification usage.");
    }

    if ((count ?? 0) > 0) {
      throw new Error(
        "This certification type already has supplier uploads. Make it inactive instead of deleting it."
      );
    }

    const { error: deleteError } = await supabase
      .from("certification_types")
      .delete()
      .eq("cert_type_id", certTypeId);

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to delete certification type.");
    }

    await safeLogAdminAction({
      adminUserId: adminUser.user_id,
      actionType: "delete_supplier_requirement",
      targetType: "profile",
      targetId: `certification:${certTypeId}`,
      details: {
        requirementKind,
        label: certificationType.certification_type_name,
      },
    });
  }

  revalidateAdminWorkspace();
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

  revalidateAdminWorkspace();
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

  revalidateAdminWorkspace();
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

  revalidateAdminWorkspace();
}
