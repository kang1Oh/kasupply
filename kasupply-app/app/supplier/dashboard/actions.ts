"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { ensureSupplierConversationForEngagement } from "@/lib/messages/ensure-conversation";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_at: string | null;
  verified_badge: boolean;
};

type BusinessProfileRow = {
  profile_id: number;
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number | null;
};

type UserRow = {
  user_id: string;
  auth_user_id?: string | null;
  name: string | null;
  email: string | null;
};

type ProductRow = {
  product_id: number;
  product_name: string | null;
  stock_available: number | null;
  moq: number | null;
  unit: string | null;
};

type CategoryRow = {
  category_id: number;
  category_name: string | null;
};

type RfqRelation =
  | {
      rfq_id: number;
      buyer_id: number;
      category_id: number | null;
      product_id: number | null;
      requested_product_name: string | null;
      quantity: number | null;
      unit: string | null;
      target_price_per_unit: number | null;
      specifications: string | null;
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      status: string | null;
      created_at: string | null;
      products:
        | { product_id: number; product_name: string | null }
        | { product_id: number; product_name: string | null }[]
        | null;
    }
  | {
      rfq_id: number;
      buyer_id: number;
      category_id: number | null;
      product_id: number | null;
      requested_product_name: string | null;
      quantity: number | null;
      unit: string | null;
      target_price_per_unit: number | null;
      specifications: string | null;
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      status: string | null;
      created_at: string | null;
      products:
        | { product_id: number; product_name: string | null }
        | { product_id: number; product_name: string | null }[]
        | null;
    }[]
  | null;

type BulletinBoardItemRow = {
  match_id: number;
  rfq_id: number;
  supplier_id: number;
  match_score: number | null;
  match_reason: string | null;
  is_visible: boolean | null;
  notified_at: string | null;
  rfqs: RfqRelation;
};

type ExistingEngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  final_quote_id: number | null;
  created_at: string | null;
};

type DashboardEngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  final_quote_id: number | null;
  created_at: string | null;
  rfqs: RfqRelation;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  created_at: string | null;
};

type PurchaseOrderRow = {
  po_id: number;
  buyer_id: number | null;
  quote_id: number | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
};

type ConversationRow = {
  conversation_id: number;
  buyer_id: number | null;
  engagement_id: number | null;
  updated_at: string | null;
};

type MessageRow = {
  message_id?: number;
  conversation_id?: number;
  sender_id?: string | null;
  message_text?: string | null;
  content?: string | null;
  created_at?: string | null;
  read_at?: string | null;
  is_read?: boolean | null;
};

type BuyerDirectoryEntry = {
  businessName: string;
  businessType: string | null;
  location: string;
  city: string | null;
  province: string | null;
  region: string | null;
  contactName: string | null;
};

export type SupplierDashboardData = {
  supplierName: string;
  supplierInitials: string;
  supplierBusinessType: string;
  currentDateLabel: string;
  verificationStatus: "not_started" | "incomplete" | "pending" | "verified";
  stats: {
    inventoryItems: number;
    inventoryNote: string;
    incomingRfqs: number;
    incomingRfqsNote: string;
    matchedBuyers: number;
    matchedBuyersNote: string;
    pendingInvoices: number;
    pendingInvoicesNote: string;
  };
  sourcingOpportunities: Array<{
    matchId: number;
    rfqId: number;
    engagementId: number | null;
    buyerInitials: string;
    buyerName: string;
    category: string;
    date: string;
    matchLabel: string;
    statusLabel: string;
    title: string;
    description: string;
    details: Array<{
      label: string;
      value: string;
    }>;
    actionLabel: string;
    actionHref: string | null;
    submitted: boolean;
  }>;
  notifications: Array<{
    title: string;
    description: string;
    time: string;
    tone: "green" | "orange" | "blue" | "pink";
    sortTime: number;
  }>;
  incomingRfqs: Array<{
    matchId: number;
    rfqId: number;
    initials: string;
    product: string;
    buyer: string;
    target: string;
    quantity: string;
    time: string;
  }>;
  inventorySnapshot: Array<{
    productId: number;
    product: string;
    quantity: string;
    status: "in-stock" | "low-stock" | "out-of-stock";
    statusLabel: string;
  }>;
};

function safeCount(value: number | null | undefined) {
  return value ?? 0;
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") === true ||
    error.message?.toLowerCase().includes("relation") === true
  );
}

async function readOptionalCount(
  query: Promise<{ count: number | null; error: { code?: string; message?: string } | null }>,
) {
  const { count, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return 0;
    throw new Error(error.message || "Failed to load dashboard count.");
  }
  return safeCount(count);
}

async function readOptionalRows<T>(
  query: Promise<{ data: T[] | null; error: { code?: string; message?: string } | null }>,
) {
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [] as T[];
    throw new Error(error.message || "Failed to load dashboard rows.");
  }
  return data ?? [];
}

function getSingleRfq(rfqs: RfqRelation) {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

function getRfqProductName(rfq: ReturnType<typeof getSingleRfq>) {
  if (!rfq) return null;
  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name || rfq.requested_product_name?.trim() || null;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatBusinessType(value: string | null | undefined) {
  if (!value) return "Supplier";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not set";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudget(value: number | null | undefined, unit: string | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Budget not set";
  return `${formatCurrency(value)} / ${unit ?? "unit"}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(value);
}

function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined) {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) return "Not set";
  return `${quantity} ${unit ?? ""}`.trim();
}

function formatLocation(parts: Array<string | null | undefined>) {
  const values = parts.filter((value): value is string => Boolean(value && value.trim()));
  return values.length > 0 ? values.join(", ") : "Location not set";
}

function getInventoryStatus(product: ProductRow): "in-stock" | "low-stock" | "out-of-stock" {
  const stock = typeof product.stock_available === "number" ? product.stock_available : 0;
  const moq = typeof product.moq === "number" ? product.moq : 0;
  if (stock <= 0) return "out-of-stock";
  if (stock <= moq || stock <= 20) return "low-stock";
  return "in-stock";
}

function getStatusLabel(status: "in-stock" | "low-stock" | "out-of-stock") {
  switch (status) {
    case "in-stock":
      return "In stock";
    case "low-stock":
      return "Low stock";
    case "out-of-stock":
    default:
      return "Out of stock";
  }
}

function getDateLabel(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
}

async function getCurrentSupplierContext() {
  const supabase = await createClient();
  const status = await getUserOnboardingStatus();

  if (!status.authenticated || status.role !== "supplier" || !status.appUser) {
    throw new Error("Only suppliers can access this action.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(
      "profile_id, user_id, business_name, business_type, business_location, city, province, region",
    )
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
    appUser: status.appUser,
  };
}

async function getBuyerDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerIds: number[],
) {
  if (buyerIds.length === 0) return new Map<number, BuyerDirectoryEntry>();

  const { data: buyerProfiles, error: buyerProfilesError } = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .in("buyer_id", buyerIds);

  if (buyerProfilesError) {
    throw new Error(buyerProfilesError.message || "Failed to load buyer profiles.");
  }

  const safeBuyerProfiles = (buyerProfiles as BuyerProfileRow[] | null) ?? [];
  const profileIds = safeBuyerProfiles
    .map((row) => row.profile_id)
    .filter((value): value is number => typeof value === "number");

  const { data: businessProfiles, error: businessProfilesError } = profileIds.length
    ? await supabase
        .from("business_profiles")
        .select(
          "profile_id, user_id, business_name, business_type, business_location, city, province, region",
        )
        .in("profile_id", profileIds)
    : { data: [], error: null };

  if (businessProfilesError) {
    throw new Error(
      businessProfilesError.message || "Failed to load buyer business profiles.",
    );
  }

  const userIds = ((businessProfiles as BusinessProfileRow[] | null) ?? [])
    .map((row) => row.user_id)
    .filter((value): value is string => Boolean(value));

  const { data: users, error: usersError } = userIds.length
    ? await supabase.from("users").select("user_id, name, email").in("user_id", userIds)
    : { data: [], error: null };

  if (usersError) {
    throw new Error(usersError.message || "Failed to load buyer contacts.");
  }

  const businessByProfileId = new Map<number, BusinessProfileRow>();
  for (const row of (businessProfiles as BusinessProfileRow[] | null) ?? []) {
    businessByProfileId.set(row.profile_id, row);
  }

  const userByUserId = new Map<string, UserRow>();
  for (const row of (users as UserRow[] | null) ?? []) {
    userByUserId.set(row.user_id, row);
  }

  const directory = new Map<number, BuyerDirectoryEntry>();
  for (const row of safeBuyerProfiles) {
    const business =
      typeof row.profile_id === "number" ? businessByProfileId.get(row.profile_id) ?? null : null;
    const user = business?.user_id ? userByUserId.get(business.user_id) ?? null : null;
    directory.set(row.buyer_id, {
      businessName: business?.business_name ?? `Buyer #${row.buyer_id}`,
      businessType: business?.business_type ?? null,
      location: formatLocation([
        business?.business_location,
        business?.city,
        business?.province,
      ]),
      city: business?.city ?? null,
      province: business?.province ?? null,
      region: business?.region ?? null,
      contactName: user?.name ?? null,
    });
  }

  return directory;
}

export async function getSupplierDashboardData(): Promise<SupplierDashboardData> {
  const { supabase, status, businessProfile, supplierProfile, appUser } =
    await getCurrentSupplierContext();

  const now = new Date();

  const [
    productsResult,
    requestMatchesResult,
    engagementsResult,
    dashboardEngagementsResult,
    purchaseOrdersResult,
    pendingInvoices,
    conversations,
  ] = await Promise.all([
    readOptionalRows<ProductRow>(
      supabase
        .from("products")
        .select("product_id, product_name, stock_available, moq, unit")
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("created_at", { ascending: false }),
    ),
    readOptionalRows<BulletinBoardItemRow>(
      supabase
        .from("request_matches")
        .select(
          `
          match_id,
          rfq_id,
          supplier_id,
          match_score,
          match_reason,
          is_visible,
          notified_at,
          rfqs (
            rfq_id,
            buyer_id,
            category_id,
            product_id,
            requested_product_name,
            quantity,
            unit,
            target_price_per_unit,
            specifications,
            preferred_delivery_date,
            delivery_location,
            deadline,
            status,
            created_at,
            products!rfqs_product_id_fkey (
              product_id,
              product_name
            )
          )
        `,
        )
        .eq("supplier_id", supplierProfile.supplier_id)
        .eq("is_visible", true)
        .order("notified_at", { ascending: false }),
    ),
    readOptionalRows<ExistingEngagementRow>(
      supabase
        .from("rfq_engagements")
        .select("engagement_id, rfq_id, supplier_id, status, final_quote_id, created_at")
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("created_at", { ascending: false }),
    ),
    readOptionalRows<DashboardEngagementRow>(
      supabase
        .from("rfq_engagements")
        .select(
          `
          engagement_id,
          rfq_id,
          supplier_id,
          status,
          final_quote_id,
          created_at,
          rfqs (
            rfq_id,
            buyer_id,
            category_id,
            product_id,
            requested_product_name,
            quantity,
            unit,
            target_price_per_unit,
            specifications,
            preferred_delivery_date,
            delivery_location,
            deadline,
            status,
            created_at,
            products!rfqs_product_id_fkey (
              product_id,
              product_name
            )
          )
        `,
        )
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("created_at", { ascending: false }),
    ),
    readOptionalRows<PurchaseOrderRow>(
      supabase
        .from("purchase_orders")
        .select("po_id, buyer_id, quote_id, status, created_at, completed_at")
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("created_at", { ascending: false }),
    ),
    readOptionalCount(
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("supplier_id", supplierProfile.supplier_id)
        .neq("status", "paid"),
    ),
    readOptionalRows<ConversationRow>(
      supabase
        .from("conversations")
        .select("conversation_id, buyer_id, engagement_id, updated_at")
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("updated_at", { ascending: false }),
    ),
  ]);

  const buyerIds = Array.from(
    new Set(
      requestMatchesResult
        .map((row) => getSingleRfq(row.rfqs)?.buyer_id)
        .concat(dashboardEngagementsResult.map((row) => getSingleRfq(row.rfqs)?.buyer_id))
        .concat(purchaseOrdersResult.map((row) => row.buyer_id ?? undefined))
        .concat(conversations.map((row) => row.buyer_id ?? undefined))
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  const categoryIds = Array.from(
    new Set(
      requestMatchesResult
        .map((row) => getSingleRfq(row.rfqs)?.category_id)
        .concat(dashboardEngagementsResult.map((row) => getSingleRfq(row.rfqs)?.category_id))
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  const [buyerDirectory, categories, messages] = await Promise.all([
    getBuyerDirectory(supabase, buyerIds),
    readOptionalRows<CategoryRow>(
      categoryIds.length
        ? supabase
            .from("product_categories")
            .select("category_id, category_name")
            .in("category_id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
    ),
    readOptionalRows<MessageRow>(
      conversations.length
        ? supabase
            .from("messages")
            .select(
              "message_id, conversation_id, sender_id, message_text, created_at, read_at, is_read",
            )
            .in(
              "conversation_id",
              conversations.map((row) => row.conversation_id),
            )
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ),
  ]);

  const engagementIds = engagementsResult.map((row) => row.engagement_id);
  const quotations = await readOptionalRows<QuotationRow>(
    engagementIds.length
      ? supabase
          .from("quotations")
          .select("quote_id, engagement_id, created_at")
          .in("engagement_id", engagementIds)
      : Promise.resolve({ data: [], error: null }),
  );

  const categoryById = new Map<number, string>();
  for (const row of categories) {
    categoryById.set(row.category_id, row.category_name ?? "General");
  }

  const engagementByRfqId = new Map<number, ExistingEngagementRow>();
  for (const row of engagementsResult) {
    const existing = engagementByRfqId.get(row.rfq_id);
    if (!existing) {
      engagementByRfqId.set(row.rfq_id, row);
      continue;
    }

    const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
    const nextTime = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (nextTime > existingTime) {
      engagementByRfqId.set(row.rfq_id, row);
    }
  }

  const quotationCountByEngagementId = new Map<number, number>();
  for (const row of quotations) {
    quotationCountByEngagementId.set(
      row.engagement_id,
      (quotationCountByEngagementId.get(row.engagement_id) ?? 0) + 1,
    );
  }

  const inventoryItems = productsResult.length;
  const lowStockAlerts = productsResult.filter(
    (product) => getInventoryStatus(product) === "low-stock",
  ).length;

  const activeDashboardEngagements = dashboardEngagementsResult.filter((row) => {
    const statusValue = String(row.status ?? "").toLowerCase();
    return !["rejected", "withdrawn", "declined"].includes(statusValue);
  });

  const incomingRfqsCount = activeDashboardEngagements.length;
  const newTodayRfqs = activeDashboardEngagements.filter((row) => {
    const source = row.created_at ?? getSingleRfq(row.rfqs)?.created_at;
    if (!source) return false;
    const parsed = new Date(source);
    return parsed.toDateString() === now.toDateString();
  }).length;

  const matchedBuyerIds = new Set<number>();
  for (const row of requestMatchesResult) {
    const buyerId = getSingleRfq(row.rfqs)?.buyer_id;
    if (typeof buyerId === "number") matchedBuyerIds.add(buyerId);
  }

  const matchScores = requestMatchesResult
    .map((row) => row.match_score)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageMatchScore =
    matchScores.length > 0
      ? Math.round(matchScores.reduce((sum, value) => sum + value, 0) / matchScores.length)
      : 0;

  const sourcingOpportunities = requestMatchesResult.slice(0, 2).map((row) => {
    const rfq = getSingleRfq(row.rfqs);
    const buyer = rfq?.buyer_id ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
    const engagement = engagementByRfqId.get(row.rfq_id) ?? null;
    const quotationCount =
      engagement != null ? quotationCountByEngagementId.get(engagement.engagement_id) ?? 0 : 0;
    const submitted = quotationCount > 0 || engagement?.final_quote_id != null;
    const buyerName =
      buyer?.businessName ?? (rfq?.buyer_id ? `Buyer #${rfq.buyer_id}` : "Unknown buyer");
    const category =
      (rfq?.category_id != null ? categoryById.get(rfq.category_id) : null) ?? "General";

    return {
      matchId: row.match_id,
      rfqId: row.rfq_id,
      engagementId: engagement?.engagement_id ?? null,
      buyerInitials: getInitials(buyerName),
      buyerName,
      category,
      date: formatShortDate(rfq?.created_at ?? row.notified_at),
      matchLabel:
        typeof row.match_score === "number" ? `${Math.round(row.match_score)}% Match` : "Match",
      statusLabel:
        String(rfq?.status ?? "").toLowerCase() === "closed" ? "Closed" : "Open",
      title: getRfqProductName(rfq) ?? `RFQ #${row.rfq_id}`,
      description: rfq?.specifications?.trim() || "No description provided.",
      details: [
        {
          label: "Quantity",
          value: formatQuantity(rfq?.quantity, rfq?.unit),
        },
        {
          label: "Budget",
          value: formatBudget(rfq?.target_price_per_unit, rfq?.unit),
        },
        {
          label: "Needed By",
          value: formatDate(rfq?.preferred_delivery_date ?? rfq?.deadline),
        },
        {
          label: "Location",
          value: rfq?.delivery_location?.trim() || buyer?.location || "Location not set",
        },
      ],
      actionLabel: submitted ? "Quotation Submitted" : "Send Quotation",
      actionHref: engagement?.engagement_id
        ? submitted
          ? `/supplier/rfq/${engagement.engagement_id}?view=sent`
          : `/supplier/rfq/${engagement.engagement_id}`
        : null,
      submitted,
    };
  });

  const incomingRfqs = activeDashboardEngagements.slice(0, 4).map((row) => {
    const rfq = getSingleRfq(row.rfqs);
    const buyer = rfq?.buyer_id ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
    const buyerName =
      buyer?.businessName ?? (rfq?.buyer_id ? `Buyer #${rfq.buyer_id}` : "Unknown buyer");
    return {
      matchId: row.engagement_id,
      rfqId: row.rfq_id,
      initials: getInitials(buyerName),
      product: getRfqProductName(rfq) ?? `RFQ #${row.rfq_id}`,
      buyer: buyerName,
      target: `Target ${formatBudget(rfq?.target_price_per_unit, rfq?.unit)}`,
      quantity: formatQuantity(rfq?.quantity, rfq?.unit),
      time: formatRelativeTime(row.created_at ?? rfq?.created_at),
    };
  });

  const inventorySnapshot = [...productsResult]
    .sort((left, right) => {
      const rank = (product: ProductRow) => {
        const statusValue = getInventoryStatus(product);
        if (statusValue === "out-of-stock") return 0;
        if (statusValue === "low-stock") return 1;
        return 2;
      };
      const rankDiff = rank(left) - rank(right);
      if (rankDiff !== 0) return rankDiff;
      return (left.stock_available ?? 0) - (right.stock_available ?? 0);
    })
    .slice(0, 5)
    .map((product) => {
      const statusValue = getInventoryStatus(product);
      return {
        productId: product.product_id,
        product: product.product_name ?? `Product #${product.product_id}`,
        quantity: formatQuantity(product.stock_available, product.unit),
        status: statusValue,
        statusLabel: getStatusLabel(statusValue),
      };
    });

  const conversationMap = new Map<number, ConversationRow>();
  for (const conversation of conversations) {
    conversationMap.set(conversation.conversation_id, conversation);
  }

  const latestUnreadBuyerMessage = messages.find((message) => {
    const senderId = message.sender_id ?? null;
    const isOwn = senderId === appUser.user_id;
    const isRead = Boolean(message.read_at) || message.is_read === true;
    return !isOwn && !isRead;
  });

  const notifications = [
    requestMatchesResult[0]
      ? (() => {
          const rfq = getSingleRfq(requestMatchesResult[0].rfqs);
          const buyer = rfq?.buyer_id ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
          const quantityLabel = formatQuantity(rfq?.quantity, rfq?.unit);
          return {
            title: "New RFQ received",
            description: `${buyer?.businessName ?? "A buyer"} sent an RFQ for ${quantityLabel} ${getRfqProductName(rfq) ?? "products"}.`,
            time: formatRelativeTime(requestMatchesResult[0].notified_at ?? rfq?.created_at),
            tone: "green" as const,
            sortTime: new Date(
              requestMatchesResult[0].notified_at ?? rfq?.created_at ?? 0,
            ).getTime(),
          };
        })()
      : null,
    purchaseOrdersResult.find((row) => String(row.status ?? "").toLowerCase() !== "completed")
      ? (() => {
          const po = purchaseOrdersResult.find(
            (row) => String(row.status ?? "").toLowerCase() !== "completed",
          )!;
          const buyer =
            typeof po.buyer_id === "number" ? buyerDirectory.get(po.buyer_id) ?? null : null;
          return {
            title: "Purchase order received",
            description: `PO-${String(po.po_id).padStart(4, "0")} from ${buyer?.businessName ?? "a buyer"} is ready for review.`,
            time: formatRelativeTime(po.created_at),
            tone: "orange" as const,
            sortTime: new Date(po.created_at ?? 0).getTime(),
          };
        })()
      : null,
    latestUnreadBuyerMessage
      ? (() => {
          const conversation =
            latestUnreadBuyerMessage.conversation_id != null
              ? conversationMap.get(latestUnreadBuyerMessage.conversation_id) ?? null
              : null;
          const buyer =
            typeof conversation?.buyer_id === "number"
              ? buyerDirectory.get(conversation.buyer_id) ?? null
              : null;
          return {
            title: "New message",
            description:
              latestUnreadBuyerMessage.message_text?.trim() ||
              `${buyer?.businessName ?? "A buyer"} sent a new message.`,
            time: formatRelativeTime(latestUnreadBuyerMessage.created_at),
            tone: "blue" as const,
            sortTime: new Date(latestUnreadBuyerMessage.created_at ?? 0).getTime(),
          };
        })()
      : null,
    purchaseOrdersResult.find((row) => {
      const normalized = String(row.status ?? "").toLowerCase();
      return normalized === "completed" || Boolean(row.completed_at);
    })
      ? (() => {
          const completedPo = purchaseOrdersResult.find((row) => {
            const normalized = String(row.status ?? "").toLowerCase();
            return normalized === "completed" || Boolean(row.completed_at);
          })!;
          const buyer =
            typeof completedPo.buyer_id === "number"
              ? buyerDirectory.get(completedPo.buyer_id) ?? null
              : null;
          return {
            title: "Order completed",
            description: `PO-${String(completedPo.po_id).padStart(4, "0")} was marked complete by ${buyer?.businessName ?? "the buyer"}.`,
            time: formatRelativeTime(completedPo.completed_at ?? completedPo.created_at),
            tone: "pink" as const,
            sortTime: new Date(
              completedPo.completed_at ?? completedPo.created_at ?? 0,
            ).getTime(),
          };
        })()
      : null,
  ]
    .filter(
      (item): item is NonNullable<(typeof notifications)[number]> =>
        item !== null && Number.isFinite(item.sortTime),
    )
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 4);

  return {
    supplierName: businessProfile.business_name ?? "Supplier",
    supplierInitials: getInitials(businessProfile.business_name ?? "Supplier"),
    supplierBusinessType: formatBusinessType(businessProfile.business_type),
    currentDateLabel: getDateLabel(now),
    verificationStatus: status.supplierVerificationStatus,
    stats: {
      inventoryItems,
      inventoryNote:
        lowStockAlerts > 0
          ? `↗ ${lowStockAlerts} low stock alert${lowStockAlerts === 1 ? "" : "s"}`
          : "Inventory levels look healthy",
      incomingRfqs: incomingRfqsCount,
      incomingRfqsNote:
        newTodayRfqs > 0 ? `↗ ${newTodayRfqs} new today` : "No new RFQs today",
      matchedBuyers: matchedBuyerIds.size,
      matchedBuyersNote:
        averageMatchScore > 0 ? `${averageMatchScore}% average match score` : "No match score yet",
      pendingInvoices,
      pendingInvoicesNote:
        pendingInvoices > 0 ? "Action needed" : "All supplier invoices are settled",
    },
    sourcingOpportunities,
    notifications,
    incomingRfqs,
    inventorySnapshot,
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

  const { data: existingEngagement, error: existingEngagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, rfq_id, supplier_id, status, final_quote_id, created_at")
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
  } else if (existingEngagement.status !== "rejected") {
    await supabase
      .from("rfq_engagements")
      .update({
        viewed_at: new Date().toISOString(),
      })
      .eq("engagement_id", engagementId);
  }

  await ensureSupplierConversationForEngagement(supabase, {
    supplierId: supplierProfile.supplier_id,
    engagementId,
    initiatedBy: appUser.user_id,
  });

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
