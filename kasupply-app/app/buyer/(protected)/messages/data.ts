import { createClient } from "@/lib/supabase/server";

type RawRecord = Record<string, unknown>;

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
  runner: (
    table: string,
  ) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
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
  runner: (
    table: string,
  ) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
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

async function getCurrentBuyerContext() {
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
    .single<{ profile_id: number; business_name: string | null }>();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: buyerProfile, error: buyerProfileError } = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<BuyerProfileRow>();

  if (buyerProfileError || !buyerProfile) {
    throw new Error("Buyer profile not found.");
  }

  return {
    supabase,
    appUser,
    buyerProfile,
    buyerBusinessName: businessProfile.business_name ?? appUser.name ?? "Buyer",
  };
}

function formatLocation(profile: BusinessProfileRow | null) {
  if (!profile) return "Location not available";

  const parts = [profile.city, profile.province, profile.region].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return parts.length > 0 ? parts.join(", ") : "Location not available";
}

function formatBusinessType(value: string | null) {
  if (!value) return "Supplier";
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

  if (parts.length === 0) return "KS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatChatTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatSidebarTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatQuantityLabel(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return null;
  if (quantity != null && unit) return `${quantity} ${unit}`;
  if (quantity != null) return String(quantity);
  return unit;
}

function formatPriceLabel(value: number | null, unit: string | null) {
  if (value == null || Number.isNaN(value)) return null;
  return `Target PHP ${value.toLocaleString("en-PH")} / ${unit ?? "unit"}`;
}

function formatDateLabel(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function buildConversationName(
  businessProfile: BusinessProfileRow | null,
  fallbackId: number | null,
) {
  if (businessProfile?.business_name) return businessProfile.business_name;
  if (fallbackId !== null) return `Supplier #${fallbackId}`;
  return "Unknown supplier";
}

export type MessageItem = {
  id: number;
  senderId: string | null;
  content: string;
  sentAt: string | null;
  sentAtLabel: string;
  isOwnMessage: boolean;
  isRead: boolean;
};

export type ConversationListItem = {
  id: number;
  supplierId: number | null;
  name: string;
  initials: string;
  subtitle: string;
  latestMessage: string;
  latestMessageAt: string | null;
  latestMessageTimeLabel: string;
  unreadCount: number;
  hasUnread: boolean;
  isOnline: boolean;
  engagementId: number | null;
  rfqId: number | null;
  rfqReference: string | null;
  rfqTitle: string | null;
  rfqQuantityLabel: string | null;
  rfqTargetPriceLabel: string | null;
  rfqDeadlineLabel: string | null;
  rfqHref: string | null;
  contactPerson: string | null;
  location: string;
};

export type BuyerMessagesData = {
  currentUserId: string;
  buyerInitials: string;
  filter: "all" | "unread";
  query: string;
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  draftConversation: ConversationListItem | null;
  messages: MessageItem[];
};

export async function getBuyerMessagesData(params?: {
  conversationId?: number | null;
  supplierId?: number | null;
  engagementId?: number | null;
  filter?: string | null;
  query?: string | null;
}) {
  const { supabase, appUser, buyerProfile, buyerBusinessName } =
    await getCurrentBuyerContext();
  const currentUserId = appUser.user_id;

  const filter = params?.filter === "unread" ? "unread" : "all";
  const query = String(params?.query || "").trim().toLowerCase();

  const conversationsResult = await runFirstAvailableOrEmpty<RawRecord[]>(
    ["conversation", "conversations"],
    async (table) => {
      const result = await supabase
        .from(table)
        .select("*")
        .eq("buyer_id", buyerProfile.buyer_id)
        .order("updated_at", { ascending: false });

      return {
        data: (result.data as RawRecord[] | null) ?? null,
        error: result.error,
      };
    },
  );

  const conversationRows = conversationsResult.data ?? [];
  const conversationIds = conversationRows
    .map((row) => readFirstNumber(row, ["conversation_id", "id"]))
    .filter((value): value is number => value !== null);

  const supplierIds = Array.from(
    new Set(
      [
        ...conversationRows
          .map((row) => readFirstNumber(row, ["supplier_id"]))
          .filter((value): value is number => value !== null),
        ...(params?.supplierId != null ? [params.supplierId] : []),
      ],
    ),
  );

  const engagementIds = Array.from(
    new Set(
      [
        ...conversationRows
          .map((row) => readFirstNumber(row, ["engagement_id", "rfq_engagement_id"]))
          .filter((value): value is number => value !== null),
        ...(params?.engagementId != null ? [params.engagementId] : []),
      ],
    ),
  );

  const supplierProfileMap = new Map<number, SupplierProfileRow>();
  const businessProfileMap = new Map<number, BusinessProfileRow>();
  const userMap = new Map<string, UserRow>();

  if (supplierIds.length > 0) {
    const { data: supplierProfiles } = await supabase
      .from("supplier_profiles")
      .select("supplier_id, profile_id")
      .in("supplier_id", supplierIds);

    for (const supplierProfile of (supplierProfiles as SupplierProfileRow[] | null) ?? []) {
      supplierProfileMap.set(supplierProfile.supplier_id, supplierProfile);
    }

    const profileIds = Array.from(
      new Set(
        ((supplierProfiles as SupplierProfileRow[] | null) ?? [])
          .map((row) => row.profile_id)
          .filter((value): value is number => typeof value === "number"),
      ),
    );

    if (profileIds.length > 0) {
      const { data: businessProfiles } = await supabase
        .from("business_profiles")
        .select(
          "profile_id, user_id, business_name, business_type, city, province, region, contact_number",
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

  const messagesByConversation = new Map<number, RawRecord[]>();
  for (const message of allMessages as RawRecord[]) {
    const conversationId = readFirstNumber(message, ["conversation_id"]);
    if (conversationId === null) continue;
    const current = messagesByConversation.get(conversationId) ?? [];
    current.push(message);
    messagesByConversation.set(conversationId, current);
  }

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

    for (const engagement of engagementResult.data ?? []) {
      const engagementId = readFirstNumber(engagement, ["engagement_id"]);
      const rfqId = readFirstNumber(engagement, ["rfq_id"]);
      if (engagementId !== null && rfqId !== null) {
        rfqByEngagement.set(engagementId, rfqId);
      }
    }
  }

  const rfqIds = Array.from(new Set(Array.from(rfqByEngagement.values())));
  const rfqDetailMap = new Map<
    number,
    {
      title: string | null;
      quantityLabel: string | null;
      targetPriceLabel: string | null;
      deadlineLabel: string | null;
    }
  >();

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

      rfqDetailMap.set(rfqId, {
        title,
        quantityLabel: formatQuantityLabel(
          readFirstNumber(rfq, ["quantity"]),
          readFirstString(rfq, ["unit"]),
        ),
        targetPriceLabel: formatPriceLabel(
          readFirstNumber(rfq, ["target_price_per_unit"]),
          readFirstString(rfq, ["unit"]),
        ),
        deadlineLabel: formatDateLabel(readFirstString(rfq, ["deadline"])),
      });
    }
  }

  const conversationItems = conversationRows
    .map((conversation) => {
    const id = readFirstNumber(conversation, ["conversation_id", "id"]) ?? 0;
    const supplierId = readFirstNumber(conversation, ["supplier_id"]);
    const engagementId = readFirstNumber(conversation, ["engagement_id", "rfq_engagement_id"]);
    const rfqId = engagementId !== null ? rfqByEngagement.get(engagementId) ?? null : null;
    const supplierProfile =
      supplierId !== null ? supplierProfileMap.get(supplierId) ?? null : null;
    const businessProfile =
      supplierProfile?.profile_id != null
        ? businessProfileMap.get(supplierProfile.profile_id) ?? null
        : null;
    const contactUser =
      businessProfile?.user_id != null
        ? userMap.get(businessProfile.user_id) ?? null
        : null;
    const threadMessages = messagesByConversation.get(id) ?? [];
    const latestMessage = threadMessages[threadMessages.length - 1] ?? null;
    const latestMessageAt =
      readFirstString(latestMessage ?? {}, ["created_at", "sent_at"]) ??
      readFirstString(conversation, ["updated_at", "created_at"]);
    const unreadCount = threadMessages.filter((message) => {
      const senderId = readFirstString(message, ["sender_id", "sent_by", "user_id"]);
      const readAt = readFirstString(message, ["read_at"]);
      const isRead = readFirstBoolean(message, ["is_read"]);
      return senderId !== currentUserId && !readAt && isRead !== true;
    }).length;
    const rfqDetails = rfqId !== null ? rfqDetailMap.get(rfqId) ?? null : null;
    const location = formatLocation(businessProfile);
    const subtitle = [
      formatBusinessType(businessProfile?.business_type ?? null),
      location !== "Location not available" ? location : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" · ");
    const name = buildConversationName(businessProfile, supplierId);

      if (threadMessages.length === 0) {
        return null;
      }

      return {
        id,
        supplierId,
        name,
        initials: getInitials(name),
        subtitle: subtitle || "Supplier",
        latestMessage:
          readFirstString(latestMessage ?? {}, [
            "message_text",
            "content",
            "message",
            "body",
            "text",
          ]) ?? "No messages yet.",
        latestMessageAt,
        latestMessageTimeLabel: formatSidebarTimestamp(latestMessageAt),
        unreadCount,
        hasUnread: unreadCount > 0,
        isOnline:
          latestMessageAt != null &&
          Date.now() - new Date(latestMessageAt).getTime() < 1000 * 60 * 60 * 24,
        engagementId,
        rfqId,
        rfqReference: rfqId !== null ? `RFQ-${rfqId}` : null,
        rfqTitle: rfqDetails?.title ?? null,
        rfqQuantityLabel: rfqDetails?.quantityLabel ?? null,
        rfqTargetPriceLabel: rfqDetails?.targetPriceLabel ?? null,
        rfqDeadlineLabel: rfqDetails?.deadlineLabel ?? null,
        rfqHref: rfqId !== null ? `/buyer/rfqs/${rfqId}` : null,
        contactPerson: contactUser?.name ?? null,
        location,
      } satisfies ConversationListItem;
    })
    .filter((conversation): conversation is ConversationListItem => conversation !== null);

  const searchedConversations = conversationItems.filter((conversation) => {
    if (!query) return true;
    return [
      conversation.name,
      conversation.subtitle,
      conversation.latestMessage,
      conversation.rfqReference ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const filteredConversations =
    filter === "unread"
      ? searchedConversations.filter((conversation) => conversation.hasUnread)
      : searchedConversations;

  const requestedConversationId = params?.conversationId ?? null;
  const requestedSupplierId = params?.supplierId ?? null;
  const requestedEngagementId = params?.engagementId ?? null;

  const matchingRequestedConversation =
    requestedSupplierId !== null
      ? filteredConversations.find((conversation) => {
          const sameSupplier = conversation.supplierId === requestedSupplierId;
          const sameEngagement =
            requestedEngagementId == null ||
            conversation.engagementId === requestedEngagementId;
          return sameSupplier && sameEngagement;
        }) ??
        filteredConversations.find(
          (conversation) => conversation.supplierId === requestedSupplierId,
        ) ??
        null
      : null;

  const selectedConversation =
    filteredConversations.find(
      (conversation) => conversation.id === requestedConversationId,
    ) ??
    matchingRequestedConversation ??
    (requestedSupplierId !== null ? null : filteredConversations[0] ?? null);

  const draftSupplierId = requestedSupplierId;
  const draftEngagementId = requestedEngagementId;
  const draftRfqId =
    draftEngagementId !== null ? rfqByEngagement.get(draftEngagementId) ?? null : null;
  const draftRfqDetails =
    draftRfqId !== null ? rfqDetailMap.get(draftRfqId) ?? null : null;
  const draftSupplierProfile =
    draftSupplierId !== null ? supplierProfileMap.get(draftSupplierId) ?? null : null;
  const draftBusinessProfile =
    draftSupplierProfile?.profile_id != null
      ? businessProfileMap.get(draftSupplierProfile.profile_id) ?? null
      : null;
  const draftContactUser =
    draftBusinessProfile?.user_id != null
      ? userMap.get(draftBusinessProfile.user_id) ?? null
      : null;
  const draftLocation = formatLocation(draftBusinessProfile);
  const draftSubtitle = [
    formatBusinessType(draftBusinessProfile?.business_type ?? null),
    draftLocation !== "Location not available" ? draftLocation : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
  const draftConversation =
    selectedConversation == null && draftSupplierId !== null
      ? ({
          id: 0,
          supplierId: draftSupplierId,
          name: buildConversationName(draftBusinessProfile, draftSupplierId),
          initials: getInitials(
            buildConversationName(draftBusinessProfile, draftSupplierId),
          ),
          subtitle: draftSubtitle || "Supplier",
          latestMessage: "Start a conversation with this supplier.",
          latestMessageAt: null,
          latestMessageTimeLabel: "",
          unreadCount: 0,
          hasUnread: false,
          isOnline: false,
          engagementId: draftEngagementId,
          rfqId: draftRfqId,
          rfqReference: draftRfqId !== null ? `RFQ-${draftRfqId}` : null,
          rfqTitle: draftRfqDetails?.title ?? null,
          rfqQuantityLabel: draftRfqDetails?.quantityLabel ?? null,
          rfqTargetPriceLabel: draftRfqDetails?.targetPriceLabel ?? null,
          rfqDeadlineLabel: draftRfqDetails?.deadlineLabel ?? null,
          rfqHref: draftRfqId !== null ? `/buyer/rfqs/${draftRfqId}` : null,
          contactPerson: draftContactUser?.name ?? null,
          location: draftLocation,
        } satisfies ConversationListItem)
      : null;

  const selectedMessages =
    selectedConversation != null
      ? (messagesByConversation.get(selectedConversation.id) ?? []).map((message) => {
          const senderId = readFirstString(message, ["sender_id", "sent_by", "user_id"]);
          const sentAt = readFirstString(message, ["created_at", "sent_at"]) ?? null;
          const content =
            readFirstString(message, ["message_text", "content", "message", "body", "text"]) ??
            "";
          const readAt = readFirstString(message, ["read_at"]);
          const isRead = readFirstBoolean(message, ["is_read"]);

          return {
            id: readFirstNumber(message, ["message_id", "id"]) ?? 0,
            senderId,
            content,
            sentAt,
            sentAtLabel: formatChatTimestamp(sentAt),
            isOwnMessage: senderId === currentUserId,
            isRead: Boolean(readAt) || isRead === true,
          } satisfies MessageItem;
        })
      : [];

  return {
    currentUserId,
    buyerInitials: getInitials(buyerBusinessName),
    filter,
    query,
    conversations: filteredConversations,
    selectedConversation,
    draftConversation,
    messages: selectedMessages,
  } satisfies BuyerMessagesData;
}
