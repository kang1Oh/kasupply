"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ConversationIdentityRow = {
  conversation_id?: number | null;
  id?: number | null;
  engagement_id?: number | null;
  rfq_engagement_id?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type EngagementLookupRow = {
  engagement_id: number;
  supplier_id: number;
  status: string | null;
  created_at: string | null;
  rfqs:
    | {
        buyer_id: number;
        status?: string | null;
      }
    | {
        buyer_id: number;
        status?: string | null;
      }[]
    | null;
};

function isSchemaFallbackError(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("column") === true ||
    error.message?.toLowerCase().includes("relation") === true ||
    error.message?.toLowerCase().includes("schema cache") === true
  );
}

function shouldTryNextInsertPayload(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return (
    isSchemaFallbackError(error) ||
    error.code === "23502" ||
    error.code === "23514"
  );
}

function readConversationId(row: ConversationIdentityRow | null | undefined) {
  if (!row) return null;
  if (typeof row.conversation_id === "number") return row.conversation_id;
  if (typeof row.id === "number") return row.id;
  return null;
}

function getSingleRfq(
  rfqs: EngagementLookupRow["rfqs"],
): { buyer_id: number; status?: string | null } | null {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

async function findConversationByEngagement(
  supabase: SupabaseServerClient,
  buyerId: number,
  supplierId: number,
  engagementId: number,
) {
  const tables = ["conversations", "conversation"] as const;
  const engagementColumns = ["engagement_id", "rfq_engagement_id"] as const;

  for (const table of tables) {
    for (const engagementColumn of engagementColumns) {
      const result = await supabase
        .from(table)
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("supplier_id", supplierId)
        .eq(engagementColumn, engagementId)
        .maybeSingle<ConversationIdentityRow>();

      if (!result.error) {
        const id = readConversationId(result.data);
        if (id !== null) return id;
        continue;
      }

      if (isSchemaFallbackError(result.error)) continue;
      throw new Error(result.error.message || "Failed to load conversation.");
    }
  }

  return null;
}

async function findGenericConversation(
  supabase: SupabaseServerClient,
  buyerId: number,
  supplierId: number,
) {
  const tables = ["conversations", "conversation"] as const;

  for (const table of tables) {
    const result = await supabase
      .from(table)
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("supplier_id", supplierId)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (result.error) {
      if (isSchemaFallbackError(result.error)) continue;
      throw new Error(result.error.message || "Failed to load conversation.");
    }

    const genericConversation = ((result.data as ConversationIdentityRow[] | null) ?? []).find(
      (row) => row.engagement_id == null && row.rfq_engagement_id == null,
    );

    const id = readConversationId(genericConversation);
    if (id !== null) return id;
  }

  return null;
}

async function insertConversation(
  supabase: SupabaseServerClient,
  params: {
    buyerId: number;
    supplierId: number;
    initiatedBy: string;
    engagementId?: number | null;
  },
) {
  const tables = ["conversations", "conversation"] as const;
  const now = new Date().toISOString();
  const conversationType = params.engagementId != null ? "rfq" : "direct";
  const payloads = [
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          engagement_id: params.engagementId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        },
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          rfq_engagement_id: params.engagementId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
        },
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          engagement_id: params.engagementId,
          initiated_by: params.initiatedBy,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          initiated_by: params.initiatedBy,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        },
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          engagement_id: params.engagementId,
          initiated_by: params.initiatedBy,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          initiated_by: params.initiatedBy,
        },
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          engagement_id: params.engagementId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          initiated_by: params.initiatedBy,
          conversation_type: conversationType,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        },
    params.engagementId != null
      ? {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          engagement_id: params.engagementId,
          created_at: now,
          updated_at: now,
        }
      : {
          supplier_id: params.supplierId,
          buyer_id: params.buyerId,
          created_at: now,
          updated_at: now,
        },
  ] as const;

  for (const table of tables) {
    for (const payload of payloads) {
      const result = await supabase
        .from(table)
        .insert(payload)
        .select("*")
        .maybeSingle<ConversationIdentityRow>();

      if (!result.error) {
        const id = readConversationId(result.data);
        if (id !== null) return id;
        continue;
      }

      if (shouldTryNextInsertPayload(result.error)) continue;

      if (result.error.code === "23505") {
        const existing =
          params.engagementId != null
            ? await findConversationByEngagement(
                supabase,
                params.buyerId,
                params.supplierId,
                params.engagementId,
              )
            : await findGenericConversation(
                supabase,
                params.buyerId,
                params.supplierId,
              );

        if (existing !== null) return existing;
      }

      throw new Error(result.error.message || "Failed to create conversation.");
    }
  }

  return null;
}

async function findLatestActiveEngagement(
  supabase: SupabaseServerClient,
  buyerId: number,
  supplierId: number,
) {
  const { data, error } = await supabase
    .from("rfq_engagements")
    .select(
      `
      engagement_id,
      supplier_id,
      status,
      created_at,
      rfqs!inner (
        buyer_id,
        status
      )
    `,
    )
    .eq("supplier_id", supplierId)
    .eq("rfqs.buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load RFQ engagements.");
  }

  const active = ((data as EngagementLookupRow[] | null) ?? []).find((row) => {
    const status = String(row.status ?? "").toLowerCase();
    const rfq = getSingleRfq(row.rfqs);
    const rfqStatus = String(rfq?.status ?? "").toLowerCase();

    return !["rejected", "withdrawn", "declined"].includes(status) &&
      !["closed", "fulfilled", "cancelled"].includes(rfqStatus);
  });

  return active?.engagement_id ?? null;
}

export async function ensureBuyerConversationForSupplier(
  supabase: SupabaseServerClient,
  params: {
    buyerId: number;
    supplierId: number;
    initiatedBy: string;
    engagementId?: number | null;
  },
) {
  const activeEngagementId =
    params.engagementId ??
    (await findLatestActiveEngagement(
      supabase,
      params.buyerId,
      params.supplierId,
    ));

  if (activeEngagementId !== null) {
    const existingForEngagement = await findConversationByEngagement(
      supabase,
      params.buyerId,
      params.supplierId,
      activeEngagementId,
    );

    if (existingForEngagement !== null) {
      return existingForEngagement;
    }

    return insertConversation(supabase, {
      buyerId: params.buyerId,
      supplierId: params.supplierId,
      initiatedBy: params.initiatedBy,
      engagementId: activeEngagementId,
    });
  }

  const existingGeneric = await findGenericConversation(
    supabase,
    params.buyerId,
    params.supplierId,
  );

  if (existingGeneric !== null) {
    return existingGeneric;
  }

  return insertConversation(supabase, {
    buyerId: params.buyerId,
    supplierId: params.supplierId,
    initiatedBy: params.initiatedBy,
    engagementId: null,
  });
}
