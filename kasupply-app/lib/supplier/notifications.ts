"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { formatPurchaseOrderNumber } from "@/lib/purchase-orders/constants";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number | null;
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

type UserRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

type ProductRelation =
  | {
      product_id: number;
      product_name: string | null;
    }
  | {
      product_id: number;
      product_name: string | null;
    }[]
  | null;

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
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      created_at: string | null;
      products: ProductRelation;
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
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      created_at: string | null;
      products: ProductRelation;
    }[]
  | null;

type RequestMatchRow = {
  match_id: number;
  rfq_id: number;
  supplier_id: number;
  match_score: number | null;
  notified_at: string | null;
  rfqs: RfqRelation;
};

type EngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  final_quote_id: number | null;
  created_at: string | null;
  rfqs: RfqRelation;
};

type OfferRow = {
  offer_id: number;
  engagement_id: number;
  offered_by: string | null;
  offer_round: number | null;
  price_per_unit: number | null;
  quantity: number | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type ConversationRow = {
  conversation_id: number;
  buyer_id: number | null;
  engagement_id: number | null;
  updated_at: string | null;
};

type MessageRow = {
  message_id: number;
  conversation_id: number;
  sender_id: string | null;
  message_text: string | null;
  content?: string | null;
  created_at: string | null;
  read_at?: string | null;
  is_read?: boolean | null;
};

type PurchaseOrderRow = {
  po_id: number;
  buyer_id: number | null;
  quote_id: number | null;
  status: string | null;
  receipt_file_url: string | null;
  receipt_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

type BuyerDirectoryEntry = {
  businessName: string;
  avatarUrl: string | null;
  location: string;
};

export type SupplierNotificationTone = "red" | "yellow";

export type SupplierNotificationCategory =
  | "message"
  | "direct_rfq"
  | "quotation_reply"
  | "board_match"
  | "receipt_received"
  | "order_completed";

export type SupplierNotificationItem = {
  id: string;
  category: SupplierNotificationCategory;
  categoryLabel: string;
  title: string;
  description: string;
  timeLabel: string;
  sortTime: number;
  targetHref: string;
  tone: SupplierNotificationTone;
};

export type SupplierNotificationsPageData = {
  supplierName: string;
  greeting: string;
  dateLabel: string;
  badgeTone: SupplierNotificationTone | null;
  items: SupplierNotificationItem[];
  actionableCount: number;
  boardMatchCount: number;
};

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") === true ||
    error.message?.toLowerCase().includes("relation") === true
  );
}

async function readOptionalRows<T>(
  query: PromiseLike<{
    data: T[] | null;
    error: { code?: string; message?: string } | null;
  }>,
) {
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [] as T[];
    throw new Error(error.message || "Failed to load supplier notifications.");
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

function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined) {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) return "unspecified quantity";
  return `${quantity} ${unit ?? ""}`.trim();
}

function formatLocation(parts: Array<string | null | undefined>) {
  const values = parts.filter((value): value is string => Boolean(value && value.trim()));
  return values.length > 0 ? values.join(", ") : "Location not set";
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

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getGreetingLabel(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
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
    throw new Error("Only suppliers can access notifications.");
  }

  const businessProfile = status.businessProfile;

  if (!businessProfile?.profile_id) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return {
    supabase,
    supplierProfile,
    appUserId: status.appUser.user_id,
    supplierName: businessProfile.business_name ?? "Supplier",
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
    ? await supabase
        .from("users")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds)
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
      avatarUrl: user?.avatar_url ?? null,
      location: formatLocation([
        business?.business_location,
        business?.city,
        business?.province,
        business?.region,
      ]),
    });
  }

  return directory;
}

const getSupplierNotificationsSnapshot = cache(async (): Promise<SupplierNotificationsPageData> => {
  const { supabase, supplierProfile, appUserId, supplierName } =
    await getCurrentSupplierContext();
  const now = new Date();

  const [requestMatches, engagements, purchaseOrders, conversations] = await Promise.all([
      readOptionalRows<RequestMatchRow>(
        supabase
          .from("request_matches")
          .select(
            `
            match_id,
            rfq_id,
            supplier_id,
            match_score,
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
              preferred_delivery_date,
              delivery_location,
              deadline,
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
      readOptionalRows<EngagementRow>(
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
              preferred_delivery_date,
              delivery_location,
              deadline,
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
          .select(
            "po_id, buyer_id, quote_id, status, receipt_file_url, receipt_status, created_at, updated_at, completed_at",
          )
          .eq("supplier_id", supplierProfile.supplier_id)
          .order("updated_at", { ascending: false }),
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
      requestMatches
        .map((row) => getSingleRfq(row.rfqs)?.buyer_id)
        .concat(engagements.map((row) => getSingleRfq(row.rfqs)?.buyer_id))
        .concat(purchaseOrders.map((row) => row.buyer_id ?? undefined))
        .concat(conversations.map((row) => row.buyer_id ?? undefined))
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  const buyerDirectory = await getBuyerDirectory(supabase, buyerIds);

  const offers = await readOptionalRows<OfferRow>(
    engagements.length
      ? supabase
          .from("negotiation_offers")
          .select(
            "offer_id, engagement_id, offered_by, offer_round, price_per_unit, quantity, notes, status, created_at",
          )
          .in(
            "engagement_id",
            engagements.map((row) => row.engagement_id),
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  );

  const messages = await readOptionalRows<MessageRow>(
    conversations.length
      ? supabase
          .from("messages")
          .select(
            "message_id, conversation_id, sender_id, message_text, attachment_url, quotation_id, offer_id, is_read, created_at, read_at",
          )
          .in(
            "conversation_id",
            conversations.map((row) => row.conversation_id),
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  );

  const engagementById = new Map<number, EngagementRow>();
  for (const engagement of engagements) {
    engagementById.set(engagement.engagement_id, engagement);
  }

  const matchedRfqIds = new Set(requestMatches.map((row) => row.rfq_id));
  const conversationById = new Map<number, ConversationRow>();
  for (const conversation of conversations) {
    conversationById.set(conversation.conversation_id, conversation);
  }

  const latestUnreadMessageByConversation = new Map<number, MessageRow>();
  for (const message of messages) {
    if (message.sender_id === appUserId) continue;
    if (message.read_at || message.is_read === true) continue;
    if (!latestUnreadMessageByConversation.has(message.conversation_id)) {
      latestUnreadMessageByConversation.set(message.conversation_id, message);
    }
  }

  const latestBuyerOfferByEngagement = new Map<number, OfferRow>();
  for (const offer of offers) {
    if (!offer.engagement_id || offer.offered_by === appUserId) continue;
    if (!engagementById.has(offer.engagement_id)) continue;
    if (!latestBuyerOfferByEngagement.has(offer.engagement_id)) {
      latestBuyerOfferByEngagement.set(offer.engagement_id, offer);
    }
  }

  const items: SupplierNotificationItem[] = [];

  for (const [conversationId, message] of latestUnreadMessageByConversation) {
    const conversation = conversationById.get(conversationId) ?? null;
    const buyer =
      typeof conversation?.buyer_id === "number"
        ? buyerDirectory.get(conversation.buyer_id) ?? null
        : null;
    const preview = message.message_text?.trim() || message.content?.trim() || "A buyer sent you a new message.";
    const sortTime = new Date(message.created_at ?? 0).getTime();

    if (!Number.isFinite(sortTime)) continue;

    items.push({
      id: `message:${conversationId}`,
      category: "message",
      categoryLabel: "New Message",
      title: `New message from ${buyer?.businessName ?? "a buyer"}`,
      description: preview,
      timeLabel: formatRelativeTime(message.created_at),
      sortTime,
      targetHref: `/supplier/messages?conversation=${conversationId}`,
      tone: "red",
    });
  }

  for (const engagement of engagements) {
    if (matchedRfqIds.has(engagement.rfq_id)) continue;

    const status = String(engagement.status ?? "").toLowerCase();
    if (["rejected", "withdrawn", "declined"].includes(status)) continue;

    const rfq = getSingleRfq(engagement.rfqs);
    const buyer =
      typeof rfq?.buyer_id === "number" ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
    const productName = getRfqProductName(rfq) ?? `RFQ #${engagement.rfq_id}`;
    const quantityLabel = formatQuantity(rfq?.quantity, rfq?.unit);
    const sortTime = new Date(engagement.created_at ?? rfq?.created_at ?? 0).getTime();

    if (!Number.isFinite(sortTime)) continue;

    items.push({
      id: `direct-rfq:${engagement.engagement_id}`,
      category: "direct_rfq",
      categoryLabel: "Incoming Direct RFQ",
      title: "Incoming direct RFQ",
      description: `${buyer?.businessName ?? "A buyer"} requested ${quantityLabel} of ${productName}.`,
      timeLabel: formatRelativeTime(engagement.created_at ?? rfq?.created_at),
      sortTime,
      targetHref: `/supplier/rfq/${engagement.engagement_id}`,
      tone: "red",
    });
  }

  for (const [engagementId, offer] of latestBuyerOfferByEngagement) {
    const engagement = engagementById.get(engagementId) ?? null;
    const rfq = getSingleRfq(engagement?.rfqs ?? null);
    const buyer =
      typeof rfq?.buyer_id === "number" ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
    const productName = getRfqProductName(rfq) ?? `RFQ #${engagement?.rfq_id ?? engagementId}`;
    const sortTime = new Date(offer.created_at ?? 0).getTime();

    if (!Number.isFinite(sortTime)) continue;

    items.push({
      id: `quotation-reply:${offer.offer_id}`,
      category: "quotation_reply",
      categoryLabel: "Quotation Reply",
      title: "Quotation reply received",
      description:
        offer.notes?.trim() ||
        `${buyer?.businessName ?? "A buyer"} replied to your quotation for ${productName}.`,
      timeLabel: formatRelativeTime(offer.created_at),
      sortTime,
      targetHref: `/supplier/rfq/${engagementId}`,
      tone: "red",
    });
  }

  for (const match of requestMatches) {
    const rfq = getSingleRfq(match.rfqs);
    const buyer =
      typeof rfq?.buyer_id === "number" ? buyerDirectory.get(rfq.buyer_id) ?? null : null;
    const productName = getRfqProductName(rfq) ?? `RFQ #${match.rfq_id}`;
    const quantityLabel = formatQuantity(rfq?.quantity, rfq?.unit);
    const sortTime = new Date(match.notified_at ?? rfq?.created_at ?? 0).getTime();

    if (!Number.isFinite(sortTime)) continue;

    items.push({
      id: `board-match:${match.match_id}`,
      category: "board_match",
      categoryLabel: "Board Match",
      title: "New board match",
      description: `${buyer?.businessName ?? "A buyer"} matched with your profile for ${quantityLabel} of ${productName}.`,
      timeLabel: formatRelativeTime(match.notified_at ?? rfq?.created_at),
      sortTime,
      targetHref: "/supplier/sourcing-board",
      tone: "yellow",
    });
  }

  for (const order of purchaseOrders) {
    const buyer =
      typeof order.buyer_id === "number" ? buyerDirectory.get(order.buyer_id) ?? null : null;

    if (
      order.receipt_file_url &&
      String(order.receipt_status ?? "").toLowerCase() === "pending_review"
    ) {
      const sortTime = new Date(order.updated_at ?? order.created_at ?? 0).getTime();

      if (Number.isFinite(sortTime)) {
        items.push({
          id: `receipt:${order.po_id}`,
          category: "receipt_received",
          categoryLabel: "Receipt Received",
          title: "Buyer receipt received",
          description: `${buyer?.businessName ?? "The buyer"} uploaded a receipt for ${formatPurchaseOrderNumber(order.po_id)}. Review it to move the order forward.`,
          timeLabel: formatRelativeTime(order.updated_at ?? order.created_at),
          sortTime,
          targetHref: `/supplier/purchase-orders/${order.po_id}`,
          tone: "red",
        });
      }
    }

    if (
      String(order.status ?? "").toLowerCase() === "completed" ||
      Boolean(order.completed_at)
    ) {
      const sortTime = new Date(order.completed_at ?? order.updated_at ?? order.created_at ?? 0).getTime();

      if (Number.isFinite(sortTime)) {
        items.push({
          id: `completed:${order.po_id}`,
          category: "order_completed",
          categoryLabel: "Order Completed",
          title: "Order completed",
          description: `${formatPurchaseOrderNumber(order.po_id)} for ${buyer?.businessName ?? "the buyer"} has been marked complete.`,
          timeLabel: formatRelativeTime(order.completed_at ?? order.updated_at ?? order.created_at),
          sortTime,
          targetHref: `/supplier/purchase-orders/${order.po_id}`,
          tone: "red",
        });
      }
    }
  }

  const sortedItems = items
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 12);

  const badgeTone =
    sortedItems.length === 0
      ? null
      : sortedItems.some((item) => item.tone === "red")
        ? "red"
        : "yellow";

  return {
    supplierName,
    greeting: `${getGreetingLabel(now)}, ${supplierName}`,
    dateLabel: getDateLabel(now),
    badgeTone,
    items: sortedItems,
    actionableCount: sortedItems.filter((item) => item.tone === "red").length,
    boardMatchCount: sortedItems.filter((item) => item.category === "board_match").length,
  };
});

export async function getSupplierNotificationsPageData() {
  return getSupplierNotificationsSnapshot();
}

export const getSupplierNotificationSummary = cache(async () => {
  const data = await getSupplierNotificationsSnapshot();
  return {
    badgeTone: data.badgeTone,
    itemCount: data.items.length,
  };
});
