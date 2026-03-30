import { createClient } from "@/lib/supabase/server";
import { getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

type NotificationRow = {
  notification_id: number;
  user_id: string;
  type: string;
  title: string;
  body: string;
  reference_table: string | null;
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
};

type RfqRouteRow = {
  rfq_id: number;
  visibility: string | null;
};

export type BuyerNotificationItem = {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  referenceTable: string | null;
  referenceId: number | null;
  isRead: boolean;
  createdAt: string;
  targetPath: string | null;
};

export type BuyerNotificationsData = {
  items: BuyerNotificationItem[];
  unreadCount: number;
  totalCount: number;
};

function normalizeReferenceTable(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getNotificationKey(referenceTable: string | null, referenceId: number | null) {
  return `${normalizeReferenceTable(referenceTable)}:${referenceId ?? "null"}`;
}

function getBuyerRfqPath(rfq: RfqRouteRow) {
  return rfq.visibility === "public"
    ? `/buyer/sourcing-board/${rfq.rfq_id}`
    : `/buyer/rfqs/${rfq.rfq_id}`;
}

async function getCurrentBuyerNotificationContext() {
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null;
  }

  return buyerContext;
}

async function resolveBuyerNotificationTargets(rows: NotificationRow[]) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerNotificationContext();

  if (!buyerContext || rows.length === 0) {
    return new Map<string, string>();
  }

  const directRfqIds = new Set<number>();
  const purchaseOrderIds = new Set<number>();
  const engagementIds = new Set<number>();
  const conversationIds = new Set<number>();
  const quotationIds = new Set<number>();
  const offerIds = new Set<number>();
  const requestMatchIds = new Set<number>();

  for (const row of rows) {
    const referenceId = row.reference_id;
    const referenceTable = normalizeReferenceTable(row.reference_table);

    if (!referenceId) {
      continue;
    }

    if (referenceTable === "rfq" || referenceTable === "rfqs") {
      directRfqIds.add(referenceId);
      continue;
    }

    if (referenceTable === "request_match" || referenceTable === "request_matches") {
      requestMatchIds.add(referenceId);
      continue;
    }

    if (referenceTable === "purchase_order" || referenceTable === "purchase_orders") {
      purchaseOrderIds.add(referenceId);
      continue;
    }

    if (referenceTable === "rfq_engagement" || referenceTable === "rfq_engagements") {
      engagementIds.add(referenceId);
      continue;
    }

    if (referenceTable === "quotation" || referenceTable === "quotations") {
      quotationIds.add(referenceId);
      continue;
    }

    if (
      referenceTable === "negotiation_offer" ||
      referenceTable === "negotiation_offers"
    ) {
      offerIds.add(referenceId);
      continue;
    }

    if (referenceTable === "conversation" || referenceTable === "conversations") {
      conversationIds.add(referenceId);
    }
  }

  const targetByKey = new Map<string, string>();
  const quotationToEngagement = new Map<number, number>();
  const offerToEngagement = new Map<number, number>();

  let rfqRouteMap = new Map<number, string>();

  const loadRfqRouteMap = async (rfqIds: number[]) => {
    if (rfqIds.length === 0) {
      return new Map<number, string>();
    }

    const { data, error } = await supabase
      .from("rfqs")
      .select("rfq_id, visibility")
      .eq("buyer_id", buyerContext.buyerId)
      .in("rfq_id", rfqIds);

    if (error) {
      return new Map<number, string>();
    }

    return new Map<number, string>(
      ((data as RfqRouteRow[] | null) ?? []).map((row) => [row.rfq_id, getBuyerRfqPath(row)])
    );
  };

  if (quotationIds.size > 0) {
    const { data: quotationRows, error } = await supabase
      .from("quotations")
      .select("quote_id, engagement_id")
      .in("quote_id", Array.from(quotationIds));

    if (!error) {
      for (const quotation of quotationRows ?? []) {
        if (typeof quotation.quote_id === "number" && typeof quotation.engagement_id === "number") {
          quotationToEngagement.set(quotation.quote_id, quotation.engagement_id);
          engagementIds.add(quotation.engagement_id);
        }
      }
    }
  }

  if (offerIds.size > 0) {
    const { data: offerRows, error } = await supabase
      .from("negotiation_offers")
      .select("offer_id, engagement_id")
      .in("offer_id", Array.from(offerIds));

    if (!error) {
      for (const offer of offerRows ?? []) {
        if (typeof offer.offer_id === "number" && typeof offer.engagement_id === "number") {
          offerToEngagement.set(offer.offer_id, offer.engagement_id);
          engagementIds.add(offer.engagement_id);
        }
      }
    }
  }

  if (directRfqIds.size > 0) {
    rfqRouteMap = await loadRfqRouteMap(Array.from(directRfqIds));

    for (const rfqId of directRfqIds) {
      const path = rfqRouteMap.get(rfqId);
      if (path) {
        targetByKey.set(getNotificationKey("rfqs", rfqId), path);
        targetByKey.set(getNotificationKey("rfq", rfqId), path);
      }
    }
  }

  if (requestMatchIds.size > 0) {
    const { data: requestMatches, error } = await supabase
      .from("request_matches")
      .select("match_id, rfq_id")
      .in("match_id", Array.from(requestMatchIds));

    if (!error) {
      const rfqIds = Array.from(
        new Set(
          (requestMatches ?? [])
            .map((row) => row.rfq_id)
            .filter((value): value is number => typeof value === "number")
        )
      );

      if (rfqIds.length > 0) {
        const loadedRfqRoutes = await loadRfqRouteMap(rfqIds);

        for (const [rfqId, path] of loadedRfqRoutes) {
          rfqRouteMap.set(rfqId, path);
        }
      }

      for (const requestMatch of requestMatches ?? []) {
        const path = rfqRouteMap.get(requestMatch.rfq_id);

        if (!path) {
          continue;
        }

        targetByKey.set(getNotificationKey("request_match", requestMatch.match_id), path);
        targetByKey.set(getNotificationKey("request_matches", requestMatch.match_id), path);
      }
    }
  }

  if (engagementIds.size > 0) {
    const { data: engagementRows, error } = await supabase
      .from("rfq_engagements")
      .select("engagement_id, rfq_id")
      .in("engagement_id", Array.from(engagementIds));

    if (!error) {
      const rfqIds = Array.from(
        new Set(
          (engagementRows ?? [])
            .map((row) => row.rfq_id)
            .filter((value): value is number => typeof value === "number")
        )
      );

      if (rfqIds.length > 0) {
        const loadedRfqRoutes = await loadRfqRouteMap(rfqIds);

        for (const [rfqId, path] of loadedRfqRoutes) {
          rfqRouteMap.set(rfqId, path);
        }
      }

      for (const engagement of engagementRows ?? []) {
        const path = rfqRouteMap.get(engagement.rfq_id);
        if (!path) {
          continue;
        }

        targetByKey.set(getNotificationKey("rfq_engagement", engagement.engagement_id), path);
        targetByKey.set(getNotificationKey("rfq_engagements", engagement.engagement_id), path);
      }
    }
  }

  for (const [quoteId, engagementId] of quotationToEngagement) {
    const path = targetByKey.get(getNotificationKey("rfq_engagements", engagementId));

    if (path) {
      targetByKey.set(getNotificationKey("quotation", quoteId), path);
      targetByKey.set(getNotificationKey("quotations", quoteId), path);
    }
  }

  for (const [offerId, engagementId] of offerToEngagement) {
    const path = targetByKey.get(getNotificationKey("rfq_engagements", engagementId));

    if (path) {
      targetByKey.set(getNotificationKey("negotiation_offer", offerId), path);
      targetByKey.set(getNotificationKey("negotiation_offers", offerId), path);
    }
  }

  if (purchaseOrderIds.size > 0) {
    const { data: purchaseOrders, error } = await supabase
      .from("purchase_orders")
      .select("po_id")
      .eq("buyer_id", buyerContext.buyerId)
      .in("po_id", Array.from(purchaseOrderIds));

    if (!error) {
      for (const order of purchaseOrders ?? []) {
        const path = `/buyer/purchase-orders/${order.po_id}`;
        targetByKey.set(getNotificationKey("purchase_order", order.po_id), path);
        targetByKey.set(getNotificationKey("purchase_orders", order.po_id), path);
      }
    }
  }

  if (conversationIds.size > 0) {
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("conversation_id, buyer_id")
      .eq("buyer_id", buyerContext.buyerId)
      .in("conversation_id", Array.from(conversationIds));

    if (!error) {
      for (const conversation of conversations ?? []) {
        const path = `/buyer/messages?conversationId=${conversation.conversation_id}`;
        targetByKey.set(getNotificationKey("conversation", conversation.conversation_id), path);
        targetByKey.set(
          getNotificationKey("conversations", conversation.conversation_id),
          path
        );
      }
    }
  }

  return targetByKey;
}

export async function getBuyerNotifications(limit = 50): Promise<BuyerNotificationsData> {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerNotificationContext();

  if (!buyerContext) {
    return {
      items: [],
      unreadCount: 0,
      totalCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "notification_id, user_id, type, title, body, reference_table, reference_id, is_read, created_at"
    )
    .eq("user_id", buyerContext.appUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load notifications.");
  }

  const rows = (data as NotificationRow[] | null) ?? [];
  const targetMap = await resolveBuyerNotificationTargets(rows);

  return {
    items: rows.map((row) => ({
      notificationId: row.notification_id,
      type: row.type,
      title: row.title,
      body: row.body,
      referenceTable: row.reference_table,
      referenceId: row.reference_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      targetPath: targetMap.get(getNotificationKey(row.reference_table, row.reference_id)) ?? null,
    })),
    unreadCount: rows.filter((row) => !row.is_read).length,
    totalCount: rows.length,
  };
}

export async function getBuyerUnreadNotificationCount(userId?: string | null) {
  const supabase = await createClient();
  let appUserId = String(userId ?? "").trim();

  if (!appUserId) {
    const { user, error } = await getCurrentAppUser();

    if (error || !user) {
      return 0;
    }

    appUserId = user.user_id;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("notification_id", { count: "exact", head: true })
    .eq("user_id", appUserId)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getBuyerNotificationById(notificationId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerNotificationContext();

  if (!buyerContext) {
    return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "notification_id, user_id, type, title, body, reference_table, reference_id, is_read, created_at"
    )
    .eq("notification_id", notificationId)
    .eq("user_id", buyerContext.appUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as NotificationRow;
  const targetMap = await resolveBuyerNotificationTargets([row]);

  return {
    notificationId: row.notification_id,
    userId: row.user_id,
    isRead: row.is_read,
    targetPath: targetMap.get(getNotificationKey(row.reference_table, row.reference_id)) ?? null,
  };
}
