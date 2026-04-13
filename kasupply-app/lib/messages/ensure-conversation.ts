"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ConversationIdentityRow = {
  conversation_id?: number | null;
  id?: number | null;
};

type EngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
};

type RfqBuyerRow = {
  buyer_id: number;
};

function isMissingConversationSchemaError(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return false;

  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("column") === true ||
    error.message?.toLowerCase().includes("relation") === true ||
    error.message?.toLowerCase().includes("schema cache") === true
  );
}

function readConversationId(row: ConversationIdentityRow | null | undefined) {
  if (!row) return null;
  if (typeof row.conversation_id === "number") return row.conversation_id;
  if (typeof row.id === "number") return row.id;
  return null;
}

async function findExistingConversation(
  supabase: SupabaseServerClient,
  supplierId: number,
  engagementId: number,
) {
  const tables = ["conversations", "conversation"] as const;
  const engagementColumns = ["engagement_id", "rfq_engagement_id"] as const;
  let lastMissingSchemaError: { code?: string; message?: string } | null = null;

  for (const table of tables) {
    for (const engagementColumn of engagementColumns) {
      const result = await supabase
        .from(table)
        .select("*")
        .eq("supplier_id", supplierId)
        .eq(engagementColumn, engagementId)
        .maybeSingle<ConversationIdentityRow>();

      if (!result.error) {
        const id = readConversationId(result.data);
        if (id !== null) return id;
        continue;
      }

      if (isMissingConversationSchemaError(result.error)) {
        lastMissingSchemaError = result.error;
        continue;
      }

      throw new Error(result.error.message || "Failed to load conversation.");
    }
  }

  if (lastMissingSchemaError) return null;
  return null;
}

async function insertConversation(
  supabase: SupabaseServerClient,
  supplierId: number,
  buyerId: number,
  initiatedBy: string,
  engagementId: number,
) {
  const tables = ["conversations", "conversation"] as const;
  const now = new Date().toISOString();
  const conversationType = "rfq";
  const payloads = [
    {
      supplier_id: supplierId,
      buyer_id: buyerId,
      engagement_id: engagementId,
      initiated_by: initiatedBy,
      conversation_type: conversationType,
      created_at: now,
      updated_at: now,
      last_message_at: now,
    },
    {
      supplier_id: supplierId,
      buyer_id: buyerId,
      engagement_id: engagementId,
      initiated_by: initiatedBy,
      conversation_type: conversationType,
    },
    {
      supplier_id: supplierId,
      buyer_id: buyerId,
      rfq_engagement_id: engagementId,
      initiated_by: initiatedBy,
      conversation_type: conversationType,
      created_at: now,
      updated_at: now,
      last_message_at: now,
    },
    {
      supplier_id: supplierId,
      buyer_id: buyerId,
      rfq_engagement_id: engagementId,
      initiated_by: initiatedBy,
      conversation_type: conversationType,
    },
    {
      supplier_id: supplierId,
      buyer_id: buyerId,
      engagement_id: engagementId,
    },
  ] as const;

  let lastMissingSchemaError: { code?: string; message?: string } | null = null;

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

      if (isMissingConversationSchemaError(result.error)) {
        lastMissingSchemaError = result.error;
        continue;
      }

      if (result.error.code === "23505") {
        const existing = await findExistingConversation(
          supabase,
          supplierId,
          engagementId,
        );
        if (existing !== null) return existing;
      }

      throw new Error(result.error.message || "Failed to create conversation.");
    }
  }

  if (lastMissingSchemaError) return null;
  return null;
}

export async function ensureSupplierConversationForEngagement(
  supabase: SupabaseServerClient,
  params: {
    supplierId: number;
    engagementId: number;
    initiatedBy: string;
  },
) {
  const existingConversationId = await findExistingConversation(
    supabase,
    params.supplierId,
    params.engagementId,
  );

  if (existingConversationId !== null) {
    return existingConversationId;
  }

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, rfq_id, supplier_id")
    .eq("engagement_id", params.engagementId)
    .eq("supplier_id", params.supplierId)
    .maybeSingle<EngagementRow>();

  if (engagementError) {
    throw new Error(engagementError.message || "Failed to load RFQ engagement.");
  }

  if (!engagement) {
    throw new Error("RFQ engagement not found.");
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("buyer_id")
    .eq("rfq_id", engagement.rfq_id)
    .maybeSingle<RfqBuyerRow>();

  if (rfqError) {
    throw new Error(rfqError.message || "Failed to load RFQ.");
  }

  if (!rfq?.buyer_id) {
    throw new Error("Buyer not found for this RFQ.");
  }

  return insertConversation(
    supabase,
    params.supplierId,
    rfq.buyer_id,
    params.initiatedBy,
    params.engagementId,
  );
}
