"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import {
  removeMessageImageAttachment,
  uploadMessageImageAttachment,
} from "@/lib/messages/image-attachments";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
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

type SupplierMessagesDatabaseClient =
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
    authUserId: authUser.id,
    appUserId: String(appUser.user_id),
    supplierProfile,
  };
}

async function validateSupplierConversationOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: number,
  conversationId: number,
) {
  const tables = ["conversation", "conversations"];
  let lastError: { code?: string; message?: string } | null = null;

  for (const table of tables) {
    const byConversationId = await supabase
      .from(table)
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (!byConversationId.error) {
      return;
    }

    if (!isMissingTableOrColumnError(byConversationId.error)) {
      throw new Error(byConversationId.error.message || "Failed to validate conversation.");
    }

    lastError = byConversationId.error;

    const byId = await supabase
      .from(table)
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("id", conversationId)
      .maybeSingle();

    if (!byId.error) {
      return;
    }

    if (isMissingTableOrColumnError(byId.error)) {
      lastError = byId.error;
      continue;
    }

    throw new Error(byId.error.message || "Failed to validate conversation.");
  }

  throw new Error(lastError?.message || "Conversation not found.");
}

async function insertMessage(
  databaseClient: SupplierMessagesDatabaseClient,
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
    {
      conversation_id: conversationId,
      user_id: senderId,
      message_text: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
    {
      conversation_id: conversationId,
      user_id: senderId,
      message: messageText,
      attachment_url: attachmentUrl,
      created_at: createdAt,
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of payloads) {
    const result = await databaseClient.from("messages").insert(payload);

    if (!result.error) {
      return;
    }

    if (isMissingTableOrColumnError(result.error)) {
      lastError = result.error;
      continue;
    }

    throw new Error(result.error.message || "Failed to send message.");
  }

  throw new Error(lastError?.message || "Failed to send message.");
}

async function touchConversation(
  databaseClient: SupplierMessagesDatabaseClient,
  supplierId: number,
  conversationId: number,
) {
  for (const table of ["conversation", "conversations"]) {
    const byConversationId = await databaseClient
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("supplier_id", supplierId)
      .eq("conversation_id", conversationId);

    if (!byConversationId.error) {
      return;
    }

    if (!isMissingTableOrColumnError(byConversationId.error)) {
      return;
    }

    const byId = await databaseClient
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("supplier_id", supplierId)
      .eq("id", conversationId);

    if (!byId.error) {
      return;
    }

    if (!isMissingTableOrColumnError(byId.error)) {
      return;
    }
  }
}

export async function sendSupplierMessage(formData: FormData) {
  const { supabase, authUserId, appUserId, supplierProfile } =
    await getCurrentSupplierContext();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;

  const conversationId = Number(formData.get("conversation_id"));
  const message = String(formData.get("message") || "").trim();
  const attachmentEntry = formData.get("attachment");
  const attachment =
    attachmentEntry instanceof File && attachmentEntry.size > 0 ? attachmentEntry : null;
  const filter = String(formData.get("filter") || "all").trim();
  const query = String(formData.get("query") || "").trim();

  if (!conversationId || Number.isNaN(conversationId)) {
    throw new Error("Invalid conversation.");
  }

  if (!message && attachment == null) {
    throw new Error("Message cannot be empty.");
  }

  await validateSupplierConversationOwnership(
    supabase,
    supplierProfile.supplier_id,
    conversationId,
  );

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
        actorType: "supplier",
        actorId: supplierProfile.supplier_id,
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
    await touchConversation(databaseClient, supplierProfile.supplier_id, conversationId);
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

  revalidatePath("/supplier/messages");

  const nextUrl = new URLSearchParams({
    conversation: String(conversationId),
  });

  if (filter === "unread") {
    nextUrl.set("filter", "unread");
  }

  if (query) {
    nextUrl.set("q", query);
  }

  redirect(`/supplier/messages?${nextUrl.toString()}`);
}

export async function sendSupplierMessageInline(formData: FormData) {
  const { supabase, authUserId, appUserId, supplierProfile } =
    await getCurrentSupplierContext();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;

  const conversationId = Number(formData.get("conversation_id"));
  const message = String(formData.get("message") || "").trim();
  const attachmentEntry = formData.get("attachment");
  const attachment =
    attachmentEntry instanceof File && attachmentEntry.size > 0 ? attachmentEntry : null;

  if (!conversationId || Number.isNaN(conversationId)) {
    throw new Error("Invalid conversation.");
  }

  if (!message && attachment == null) {
    throw new Error("Message cannot be empty.");
  }

  await validateSupplierConversationOwnership(
    supabase,
    supplierProfile.supplier_id,
    conversationId,
  );

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
        actorType: "supplier",
        actorId: supplierProfile.supplier_id,
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
    await touchConversation(databaseClient, supplierProfile.supplier_id, conversationId);
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

  revalidatePath("/supplier/messages");

  return { ok: true };
}
