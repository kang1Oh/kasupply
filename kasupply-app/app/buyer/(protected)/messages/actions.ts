"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import {
  removeMessageImageAttachment,
  uploadMessageImageAttachment,
} from "@/lib/messages/image-attachments";
import { createClient } from "@/lib/supabase/server";
import { ensureBuyerConversationForSupplier } from "@/lib/messages/ensure-buyer-conversation";

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
};

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type BuyerMessagesDatabaseClient =
  | Awaited<ReturnType<typeof createClient>>
  | NonNullable<ReturnType<typeof createAdminClient>>;

function isMissingTableOrColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    error.message?.toLowerCase().includes("column") === true ||
    error.message?.toLowerCase().includes("relation") === true ||
    error.message?.toLowerCase().includes("schema cache") === true
  );
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
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

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
    authUserId: authUser.id,
    appUserId: String(appUser.user_id),
    conversationInitiatorId: String(appUser.user_id),
    buyerProfile,
  };
}

async function validateBuyerConversationOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerId: number,
  conversationId: number,
) {
  for (const table of ["conversation", "conversations"]) {
    const byConversationId = await supabase
      .from(table)
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (!byConversationId.error) return;
    if (!isMissingTableOrColumnError(byConversationId.error)) {
      throw new Error(byConversationId.error.message || "Failed to validate conversation.");
    }

    const byId = await supabase
      .from(table)
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("id", conversationId)
      .maybeSingle();

    if (!byId.error) return;
    if (!isMissingTableOrColumnError(byId.error)) {
      throw new Error(byId.error.message || "Failed to validate conversation.");
    }
  }

  throw new Error("Conversation not found.");
}

async function insertMessage(
  databaseClient: BuyerMessagesDatabaseClient,
  conversationId: number,
  senderId: string,
  content: string,
  attachmentUrl: string | null = null,
) {
  const createdAt = new Date().toISOString();
  const messageText = content.trim();
  const payloads = [
    {
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
    {
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
    {
      conversation_id: conversationId,
      sender_id: senderId,
      message: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
    {
      conversation_id: conversationId,
      sender_id: senderId,
      body: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of payloads) {
    const result = await databaseClient.from("messages").insert(payload);
    if (!result.error) return;
    if (isMissingTableOrColumnError(result.error)) {
      lastError = result.error;
      continue;
    }
    throw new Error(result.error.message || "Failed to send message.");
  }

  throw new Error(lastError?.message || "Failed to send message.");
}

async function touchConversation(
  databaseClient: BuyerMessagesDatabaseClient,
  buyerId: number,
  conversationId: number,
) {
  for (const table of ["conversation", "conversations"]) {
    const byConversationId = await databaseClient
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("buyer_id", buyerId)
      .eq("conversation_id", conversationId);

    if (!byConversationId.error) return;
    if (!isMissingTableOrColumnError(byConversationId.error)) return;

    const byId = await databaseClient
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("buyer_id", buyerId)
      .eq("id", conversationId);

    if (!byId.error) return;
    if (!isMissingTableOrColumnError(byId.error)) return;
  }
}

export async function markBuyerConversationRead(conversationId: number) {
  const { supabase, appUserId, buyerProfile } = await getCurrentBuyerContext();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;

  await validateBuyerConversationOwnership(supabase, buyerProfile.buyer_id, conversationId);

  const { error } = await databaseClient
    .from("messages")
    .update({
      read_at: new Date().toISOString(),
      is_read: true,
    })
    .eq("conversation_id", conversationId)
    .neq("sender_id", appUserId)
    .is("read_at", null);

  if (error && !isMissingTableOrColumnError(error)) {
    if (!adminSupabase && /row-level security policy/i.test(error.message || "")) {
      throw new Error(
        "Message read updates are blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or run sql/messages_policies.sql in your Supabase SQL editor.",
      );
    }

    throw new Error(error.message || "Failed to mark messages as read.");
  }

  revalidatePath("/buyer/messages");
  return { ok: true };
}

export async function sendBuyerMessageInline(formData: FormData) {
  const { supabase, authUserId, appUserId, conversationInitiatorId, buyerProfile } =
    await getCurrentBuyerContext();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;

  const explicitConversationId = Number(formData.get("conversation_id") || "");
  const supplierId = Number(formData.get("supplier_id") || "");
  const engagementId = Number(formData.get("engagement_id") || "");
  const message = String(formData.get("message") || "").trim();
  const attachmentEntry = formData.get("attachment");
  const attachment =
    attachmentEntry instanceof File && attachmentEntry.size > 0 ? attachmentEntry : null;

  if (!message && attachment == null) {
    throw new Error("Message cannot be empty.");
  }

  let conversationId =
    explicitConversationId && !Number.isNaN(explicitConversationId)
      ? explicitConversationId
      : null;

  if (conversationId == null && supplierId && !Number.isNaN(supplierId)) {
    conversationId = await ensureBuyerConversationForSupplier(supabase, {
      buyerId: buyerProfile.buyer_id,
      supplierId,
      initiatedBy: conversationInitiatorId,
      engagementId: engagementId && !Number.isNaN(engagementId) ? engagementId : null,
    });
  }

  if (conversationId == null) {
    throw new Error(
      `Unable to create a conversation for buyer ${buyerProfile.buyer_id} and supplier ${supplierId ?? "unknown"}.`,
    );
  }

  await validateBuyerConversationOwnership(supabase, buyerProfile.buyer_id, conversationId);

  let uploadedAttachment:
    | {
        bucket: string;
        filePath: string;
        publicUrl: string;
      }
    | null = null;

  try {
    if (attachment) {
      uploadedAttachment = await uploadMessageImageAttachment(databaseClient, {
        actorType: "buyer",
        actorId: buyerProfile.buyer_id,
        authUserId,
        conversationId,
        file: attachment,
      });
    }

    await insertMessage(
      databaseClient,
      conversationId,
      appUserId,
      message,
      uploadedAttachment?.publicUrl ?? null,
    );
    await touchConversation(databaseClient, buyerProfile.buyer_id, conversationId);
  } catch (error) {
    if (uploadedAttachment) {
      await removeMessageImageAttachment(
        databaseClient,
        uploadedAttachment.bucket,
        uploadedAttachment.filePath,
      ).catch(() => undefined);
    }

    if (
      !adminSupabase &&
      error instanceof Error &&
      /row-level security policy/i.test(error.message)
    ) {
      throw new Error(
        "Sending messages is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or run sql/messages_policies.sql in your Supabase SQL editor.",
      );
    }

    throw error;
  }

  revalidatePath("/buyer/messages");
  return { ok: true, conversationId };
}
