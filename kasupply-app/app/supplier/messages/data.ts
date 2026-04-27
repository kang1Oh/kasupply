import { createClient } from "@/lib/supabase/server";
import { parseMessagePayload } from "@/lib/messages/message-payload";

type RawRecord = Record<string, unknown>;

type ConversationTable = "conversation" | "conversations";
type EngagementTable = "rfq_engagement" | "rfq_engagements";
type RfqTable = "rfq" | "rfqs";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type CurrentBusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
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
  contact_number: string | null;
};

type UserRow = {
  user_id: string;
  auth_user_id?: string | null;
  name: string | null;
  email: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFirstNumber(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function readFirstString(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function readFirstBoolean(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") === true ||
    error.message?.toLowerCase().includes("relation") === true
  );
}

async function runFirstAvailable<T>(
  tables: string[],
  runner: (table: string) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
) {
  let lastError: { code?: string; message?: string } | null = null;

  for (const table of tables) {
    const result = await runner(table);
    if (!result.error) {
      return {
        table,
        data: result.data,
      };
    }

    if (isMissingRelationError(result.error)) {
      lastError = result.error;
      continue;
    }

    throw new Error(result.error.message || `Failed to query ${table}.`);
  }

  throw new Error(lastError?.message || "Required table was not found.");
}

async function runFirstAvailableOrEmpty<T>(
  tables: string[],
  runner: (table: string) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
) {
  try {
    return await runFirstAvailable<T>(tables, runner);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("required table was not found") || message.includes("relation")) {
      return {
        table: tables[0] ?? "conversations",
        data: ([] as unknown) as T,
      };
    }

    throw error;
  }
}

async function getCurrentSupplierContext() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, auth_user_id, name, email")
    .eq("auth_user_id", authUser.id)
    .single<UserRow>();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id, business_name")
    .eq("user_id", appUser.user_id)
    .single<CurrentBusinessProfileRow>();

  if (businessProfileError || !businessProfile) {
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
    appUser,
    supplierProfile,
    supplierInitials: getInitials(businessProfile.business_name ?? appUser.name ?? "Supplier"),
  };
}

function formatLocation(profile: BusinessProfileRow | null) {
  if (!profile) return "Location not available";

  const parts = [
    profile.business_location,
    profile.city,
    profile.province,
    profile.region,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return parts.length > 0 ? parts.join(", ") : "Location not available";
}

function formatTimestamp(value: string | null) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatBusinessType(value: string | null) {
  if (!value) return "Buyer";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function getInitials(value: string | null) {
  const parts = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "BY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatQuantityLabel(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return null;
  if (quantity != null && unit) return `${quantity} ${unit}`;
  if (quantity != null) return String(quantity);
  return unit;
}

function formatPriceLabel(value: number | null, unit: string | null) {
  if (value == null || Number.isNaN(value)) return null;
  return `Target ₱${value.toLocaleString("en-PH")} / ${unit ?? "unit"}`;
}

function buildConversationName(
  businessProfile: BusinessProfileRow | null,
  fallbackId: number | null,
) {
  if (businessProfile?.business_name) return businessProfile.business_name;
  if (fallbackId !== null) return `Buyer #${fallbackId}`;
  return "Unknown conversation";
}

export type MessageItem = {
  id: number;
  senderId: string | null;
  content: string;
  kind: "text" | "image";
  imageUrl: string | null;
  previewText: string;
  sentAt: string | null;
  sentAtLabel: string;
  isOwnMessage: boolean;
  isRead: boolean;
};

export type ConversationListItem = {
  id: number;
  buyerId: number | null;
  name: string;
  initials: string;
  subtitle: string;
  latestMessage: string;
  latestMessageAt: string | null;
  latestMessageTimeLabel: string;
  unreadCount: number;
  hasUnread: boolean;
  engagementId: number | null;
  rfqId: number | null;
  rfqReference: string | null;
  location: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  rfqTitle: string | null;
  rfqQuantityLabel: string | null;
  rfqTargetPriceLabel: string | null;
  rfqDeadlineLabel: string | null;
  rfqHref: string | null;
  poId: number | null;
  poHref: string | null;
};

export type SupplierMessagesData = {
  currentUserId: string;
  supplierInitials: string;
  filter: "all" | "unread";
  query: string;
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  messages: MessageItem[];
  conversationTable: ConversationTable;
  engagementTable: EngagementTable | null;
  rfqTable: RfqTable | null;
};

export async function getSupplierMessagesData(params?: {
  conversationId?: number | null;
  filter?: string | null;
  query?: string | null;
}) {
  const { supabase, appUser, supplierProfile, supplierInitials } =
    await getCurrentSupplierContext();

  const filter = params?.filter === "unread" ? "unread" : "all";
  const query = String(params?.query || "").trim().toLowerCase();

  const conversationsResult = await runFirstAvailableOrEmpty<RawRecord[]>(
    ["conversation", "conversations"],
    async (table) => {
      const result = await supabase
        .from(table)
        .select("*")
        .eq("supplier_id", supplierProfile.supplier_id)
        .order("updated_at", { ascending: false });

      return {
        data: (result.data as RawRecord[] | null) ?? null,
        error: result.error,
      };
    },
  );

  const conversationTable = conversationsResult.table as ConversationTable;
  const conversationRows = conversationsResult.data ?? [];

  const conversationIds = conversationRows
    .map((row) => readFirstNumber(row, ["conversation_id", "id"]))
    .filter((value): value is number => value !== null);

  const buyerIds = Array.from(
    new Set(
      conversationRows
        .map((row) => readFirstNumber(row, ["buyer_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const engagementIds = Array.from(
    new Set(
      conversationRows
        .map((row) => readFirstNumber(row, ["engagement_id", "rfq_engagement_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const buyerProfileMap = new Map<number, BuyerProfileRow>();
  const businessProfileMap = new Map<number, BusinessProfileRow>();
  const userMap = new Map<string, UserRow>();

  if (buyerIds.length > 0) {
    const { data: buyerProfiles } = await supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id")
      .in("buyer_id", buyerIds);

    for (const buyerProfile of (buyerProfiles as BuyerProfileRow[] | null) ?? []) {
      buyerProfileMap.set(buyerProfile.buyer_id, buyerProfile);
    }

    const profileIds = Array.from(
      new Set(
        ((buyerProfiles as BuyerProfileRow[] | null) ?? [])
          .map((row) => row.profile_id)
          .filter((value): value is number => typeof value === "number"),
      ),
    );

    if (profileIds.length > 0) {
      const { data: businessProfiles } = await supabase
        .from("business_profiles")
        .select(
          "profile_id, user_id, business_name, business_location, city, province, region, contact_number",
        )
        .in("profile_id", profileIds);

      for (const businessProfile of (businessProfiles as BusinessProfileRow[] | null) ?? []) {
        businessProfileMap.set(businessProfile.profile_id, businessProfile);
      }

      const userIds = Array.from(
        new Set(
          ((businessProfiles as BusinessProfileRow[] | null) ?? [])
            .map((row) => row.user_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("user_id, name, email")
          .in("user_id", userIds);

        for (const user of (users as UserRow[] | null) ?? []) {
          userMap.set(user.user_id, user);
        }
      }
    }
  }

  const allMessages =
    conversationIds.length > 0
      ? (
          await supabase
            .from("messages")
            .select("*")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: true })
        ).data ?? []
      : [];

  const messageRows = allMessages as RawRecord[];
  const messagesByConversation = new Map<number, RawRecord[]>();

  for (const message of messageRows) {
    const conversationId = readFirstNumber(message, ["conversation_id"]);
    if (conversationId === null) continue;
    const existing = messagesByConversation.get(conversationId) ?? [];
    existing.push(message);
    messagesByConversation.set(conversationId, existing);
  }

  let engagementTable: EngagementTable | null = null;
  let rfqTable: RfqTable | null = null;
  const rfqByEngagement = new Map<number, number>();

  if (engagementIds.length > 0) {
    const engagementResult = await runFirstAvailable<RawRecord[]>(
      ["rfq_engagement", "rfq_engagements"],
      async (table) => {
        const result = await supabase
          .from(table)
          .select("*")
          .in("engagement_id", engagementIds);

        return {
          data: (result.data as RawRecord[] | null) ?? null,
          error: result.error,
        };
      },
    );

    engagementTable = engagementResult.table as EngagementTable;

    for (const engagement of engagementResult.data ?? []) {
      const engagementId = readFirstNumber(engagement, ["engagement_id"]);
      const rfqId = readFirstNumber(engagement, ["rfq_id"]);
      if (engagementId !== null && rfqId !== null) {
        rfqByEngagement.set(engagementId, rfqId);
      }
    }

    const rfqIds = Array.from(new Set(Array.from(rfqByEngagement.values())));

    if (rfqIds.length > 0) {
      const rfqResult = await runFirstAvailable<RawRecord[]>(
        ["rfq", "rfqs"],
        async (table) => {
          const result = await supabase
            .from(table)
            .select("*")
            .in("rfq_id", rfqIds);

          return {
            data: (result.data as RawRecord[] | null) ?? null,
            error: result.error,
          };
        },
      );

      rfqTable = rfqResult.table as RfqTable;
      const rfqMap = new Map<number, RawRecord>();
      for (const rfq of rfqResult.data ?? []) {
        const rfqId = readFirstNumber(rfq, ["rfq_id"]);
        if (rfqId !== null) {
          rfqMap.set(rfqId, rfq);
        }
      }

      for (const [engagementId, rfqId] of Array.from(rfqByEngagement.entries())) {
        const rfq = rfqMap.get(rfqId);
        if (!rfq) continue;
        rfqByEngagement.set(
          engagementId,
          readFirstNumber(rfq, ["rfq_id"]) ?? rfqId,
        );
      }
    }
  }

  const rfqDetailMap = new Map<
    number,
    {
      title: string | null;
      quantityLabel: string | null;
      targetPriceLabel: string | null;
      deadlineLabel: string | null;
    }
  >();

  const rfqIds = Array.from(new Set(Array.from(rfqByEngagement.values())));
  if (rfqIds.length > 0) {
    const { data: rfqs } = await supabase
      .from("rfqs")
      .select(
        "rfq_id, product_id, requested_product_name, quantity, unit, target_price_per_unit, deadline",
      )
      .in("rfq_id", rfqIds);

    const safeRfqs = (rfqs as RawRecord[] | null) ?? [];
    const productIds = Array.from(
      new Set(
        safeRfqs
          .map((rfq) => readFirstNumber(rfq, ["product_id"]))
          .filter((value): value is number => value !== null),
      ),
    );

    const productNameById = new Map<number, string>();
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("product_id, product_name")
        .in("product_id", productIds);

      for (const product of (products as RawRecord[] | null) ?? []) {
        const productId = readFirstNumber(product, ["product_id"]);
        const productName = readFirstString(product, ["product_name"]);
        if (productId !== null && productName) {
          productNameById.set(productId, productName);
        }
      }
    }

    for (const rfq of safeRfqs) {
      const rfqId = readFirstNumber(rfq, ["rfq_id"]);
      if (rfqId === null) continue;

      const productId = readFirstNumber(rfq, ["product_id"]);
      const requestedName = readFirstString(rfq, ["requested_product_name"]);
      const title =
        (productId !== null ? productNameById.get(productId) ?? null : null) ??
        requestedName ??
        `RFQ-${rfqId}`;
      const quantity = readFirstNumber(rfq, ["quantity"]);
      const unit = readFirstString(rfq, ["unit"]);
      const targetPrice = readFirstNumber(rfq, ["target_price_per_unit"]);
      const deadline = readFirstString(rfq, ["deadline"]);

      rfqDetailMap.set(rfqId, {
        title,
        quantityLabel: formatQuantityLabel(quantity, unit),
        targetPriceLabel: formatPriceLabel(targetPrice, unit),
        deadlineLabel: deadline ? new Intl.DateTimeFormat("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(deadline)) : null,
      });
    }
  }

  const poIdByEngagement = new Map<number, number>();
  if (engagementIds.length > 0) {
    const { data: quotations } = await supabase
      .from("quotations")
      .select("quote_id, engagement_id")
      .in("engagement_id", engagementIds);

    const quoteIdByEngagement = new Map<number, number>();
    const quoteIds: number[] = [];
    for (const quotation of (quotations as RawRecord[] | null) ?? []) {
      const quoteId = readFirstNumber(quotation, ["quote_id"]);
      const engagementId = readFirstNumber(quotation, ["engagement_id"]);
      if (quoteId !== null && engagementId !== null) {
        quoteIdByEngagement.set(engagementId, quoteId);
        quoteIds.push(quoteId);
      }
    }

    if (quoteIds.length > 0) {
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("po_id, quote_id")
        .in("quote_id", quoteIds);

      const poByQuoteId = new Map<number, number>();
      for (const po of (purchaseOrders as RawRecord[] | null) ?? []) {
        const poId = readFirstNumber(po, ["po_id"]);
        const quoteId = readFirstNumber(po, ["quote_id"]);
        if (poId !== null && quoteId !== null) {
          poByQuoteId.set(quoteId, poId);
        }
      }

      for (const [engagementId, quoteId] of Array.from(quoteIdByEngagement.entries())) {
        const poId = poByQuoteId.get(quoteId);
        if (poId != null) {
          poIdByEngagement.set(engagementId, poId);
        }
      }
    }
  }

  const conversationItems = conversationRows
    .map((conversation) => {
    const id = readFirstNumber(conversation, ["conversation_id", "id"]) ?? 0;
    const buyerId = readFirstNumber(conversation, ["buyer_id"]);
    const engagementId = readFirstNumber(conversation, ["engagement_id", "rfq_engagement_id"]);
    const rfqId = engagementId !== null ? rfqByEngagement.get(engagementId) ?? null : null;
    const buyerProfile =
      buyerId !== null ? buyerProfileMap.get(buyerId) ?? null : null;
    const businessProfile =
      buyerProfile?.profile_id != null
        ? businessProfileMap.get(buyerProfile.profile_id) ?? null
        : null;
    const contactUser =
      businessProfile?.user_id != null
        ? userMap.get(businessProfile.user_id) ?? null
        : null;
    const threadMessages = messagesByConversation.get(id) ?? [];
    const latestMessage = threadMessages[threadMessages.length - 1] ?? null;
    const latestRawContent =
      readFirstString(latestMessage ?? {}, ["message_text", "content", "message", "body", "text"]) ??
      "No messages yet.";
    const latestPayload = parseMessagePayload(
      latestRawContent,
      readFirstString(latestMessage ?? {}, ["attachment_url"]),
    );
    const unreadCount = threadMessages.filter((message) => {
      const senderId = readFirstString(message, ["sender_id", "sent_by", "user_id"]);
      const readAt = readFirstString(message, ["read_at"]);
      const isRead = readFirstBoolean(message, ["is_read"]);
      return senderId !== appUser.user_id && !readAt && isRead !== true;
    }).length;
    const rfqDetails =
      rfqId !== null ? rfqDetailMap.get(rfqId) ?? null : null;
    const subtitle = [formatBusinessType(businessProfile?.business_type ?? null), businessProfile?.city ? `${businessProfile.city}, ${businessProfile.province ?? ""}`.replace(/,\s*$/, "") : null]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" · ");
    const poId = engagementId !== null ? poIdByEngagement.get(engagementId) ?? null : null;

      if (threadMessages.length === 0) {
        return null;
      }

      return {
        id,
        buyerId,
        name: buildConversationName(businessProfile, buyerId),
        initials: getInitials(buildConversationName(businessProfile, buyerId)),
        subtitle: subtitle || "Buyer",
        latestMessage: latestPayload.previewText || "No messages yet.",
        latestMessageAt:
          readFirstString(latestMessage ?? {}, ["created_at", "sent_at"]) ??
          readFirstString(conversation, ["updated_at", "created_at"]),
        latestMessageTimeLabel: formatTimestamp(
          readFirstString(latestMessage ?? {}, ["created_at", "sent_at"]) ??
            readFirstString(conversation, ["updated_at", "created_at"]),
        ),
        unreadCount,
        hasUnread: unreadCount > 0,
        engagementId,
        rfqId,
        rfqReference: rfqId !== null ? `RFQ-${rfqId}` : null,
        location: formatLocation(businessProfile),
        contactPerson: contactUser?.name ?? null,
        phone: businessProfile?.contact_number ?? null,
        email: contactUser?.email ?? null,
        rfqTitle: rfqDetails?.title ?? null,
        rfqQuantityLabel: rfqDetails?.quantityLabel ?? null,
        rfqTargetPriceLabel: rfqDetails?.targetPriceLabel ?? null,
        rfqDeadlineLabel: rfqDetails?.deadlineLabel ?? null,
        rfqHref: engagementId !== null ? `/supplier/rfq/${engagementId}` : null,
        poId,
        poHref: poId !== null ? `/supplier/purchase-orders/${poId}` : null,
      } satisfies ConversationListItem;
    })
    .filter((conversation): conversation is ConversationListItem => conversation !== null);

  const searchedConversations = conversationItems.filter((conversation) => {
    if (!query) return true;
    const haystack = [
      conversation.name,
      conversation.latestMessage,
      conversation.contactPerson ?? "",
      conversation.email ?? "",
      conversation.rfqReference ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const filteredConversations =
    filter === "unread"
      ? searchedConversations.filter((conversation) => conversation.hasUnread)
      : searchedConversations;

  const selectedConversation =
    filteredConversations.find(
      (conversation) => conversation.id === (params?.conversationId ?? null),
    ) ??
    filteredConversations[0] ??
    null;

  const selectedMessages =
    selectedConversation != null
      ? (messagesByConversation.get(selectedConversation.id) ?? []).map((message) => {
          const senderId = readFirstString(message, ["sender_id", "sent_by", "user_id"]);
          const sentAt =
            readFirstString(message, ["created_at", "sent_at"]) ?? null;
          const rawContent =
            readFirstString(message, ["message_text", "content", "message", "body", "text"]) ?? "";
          const payload = parseMessagePayload(
            rawContent,
            readFirstString(message, ["attachment_url"]),
          );
          const readAt = readFirstString(message, ["read_at"]);
          const isRead = readFirstBoolean(message, ["is_read"]);

          return {
            id: readFirstNumber(message, ["message_id", "id"]) ?? 0,
            senderId,
            content: payload.text,
            kind: payload.kind,
            imageUrl: payload.imageUrl,
            previewText: payload.previewText,
            sentAt,
            sentAtLabel: formatTimestamp(sentAt),
            isOwnMessage: senderId === appUser.user_id,
            isRead: Boolean(readAt) || isRead === true,
          } satisfies MessageItem;
        })
      : [];

  return {
    currentUserId: appUser.user_id,
    supplierInitials,
    filter,
    query,
    conversations: filteredConversations,
    selectedConversation,
    messages: selectedMessages,
    conversationTable,
    engagementTable,
    rfqTable,
  } satisfies SupplierMessagesData;
}
