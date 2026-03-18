import { createClient } from "@/lib/supabase/server";

type RawRecord = Record<string, unknown>;

type ConversationTable = "conversation" | "conversations";
type EngagementTable = "rfq_engagement" | "rfq_engagements";
type RfqTable = "rfq" | "rfqs";

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
  business_location: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  contact_number: string | null;
};

type UserRow = {
  user_id: string;
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
    .select("user_id, name, email")
    .eq("auth_user_id", authUser.id)
    .single<UserRow>();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

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
  sentAt: string | null;
  sentAtLabel: string;
  isOwnMessage: boolean;
  isRead: boolean;
};

export type ConversationListItem = {
  id: number;
  buyerId: number | null;
  name: string;
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
};

export type SupplierMessagesData = {
  currentUserId: string;
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
  const { supabase, appUser, supplierProfile } = await getCurrentSupplierContext();

  const filter = params?.filter === "unread" ? "unread" : "all";
  const query = String(params?.query || "").trim().toLowerCase();

  const conversationsResult = await runFirstAvailable<RawRecord[]>(
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

  const conversationItems = conversationRows.map((conversation) => {
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
    const unreadCount = threadMessages.filter((message) => {
      const senderId = readFirstString(message, ["sender_id", "sent_by", "user_id"]);
      const readAt = readFirstString(message, ["read_at"]);
      const isRead = readFirstBoolean(message, ["is_read"]);
      return senderId !== appUser.user_id && !readAt && isRead !== true;
    }).length;

    return {
      id,
      buyerId,
      name: buildConversationName(businessProfile, buyerId),
      latestMessage:
        readFirstString(latestMessage ?? {}, ["content", "message", "body", "text"]) ??
        "No messages yet.",
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
    } satisfies ConversationListItem;
  });

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
          const content =
            readFirstString(message, ["content", "message", "body", "text"]) ?? "";
          const readAt = readFirstString(message, ["read_at"]);
          const isRead = readFirstBoolean(message, ["is_read"]);

          return {
            id: readFirstNumber(message, ["message_id", "id"]) ?? 0,
            senderId,
            content,
            sentAt,
            sentAtLabel: formatTimestamp(sentAt),
            isOwnMessage: senderId === appUser.user_id,
            isRead: Boolean(readAt) || isRead === true,
          } satisfies MessageItem;
        })
      : [];

  return {
    currentUserId: appUser.user_id,
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
