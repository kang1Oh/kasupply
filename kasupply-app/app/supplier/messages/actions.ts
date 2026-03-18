"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

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
    const result = await supabase
      .from(table)
      .select("conversation_id, id")
      .eq("supplier_id", supplierId)
      .or(`conversation_id.eq.${conversationId},id.eq.${conversationId}`)
      .maybeSingle();

    if (!result.error) {
      return;
    }

    if (isMissingTableOrColumnError(result.error)) {
      lastError = result.error;
      continue;
    }

    throw new Error(result.error.message || "Failed to validate conversation.");
  }

  throw new Error(lastError?.message || "Conversation not found.");
}

async function insertMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: number,
  senderId: string,
  content: string,
) {
  const payloads = [
    {
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      created_at: new Date().toISOString(),
    },
    {
      conversation_id: conversationId,
      sender_id: senderId,
      message: content,
      created_at: new Date().toISOString(),
    },
    {
      conversation_id: conversationId,
      sender_id: senderId,
      body: content,
      created_at: new Date().toISOString(),
    },
    {
      conversation_id: conversationId,
      user_id: senderId,
      content,
      created_at: new Date().toISOString(),
    },
    {
      conversation_id: conversationId,
      user_id: senderId,
      message: content,
      created_at: new Date().toISOString(),
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of payloads) {
    const result = await supabase.from("messages").insert(payload);

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
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: number,
  conversationId: number,
) {
  for (const table of ["conversation", "conversations"]) {
    const result = await supabase
      .from(table)
      .update({ updated_at: new Date().toISOString() })
      .eq("supplier_id", supplierId)
      .or(`conversation_id.eq.${conversationId},id.eq.${conversationId}`);

    if (!result.error) {
      return;
    }

    if (!isMissingTableOrColumnError(result.error)) {
      return;
    }
  }
}

export async function sendSupplierMessage(formData: FormData) {
  const { supabase, appUserId, supplierProfile } =
    await getCurrentSupplierContext();

  const conversationId = Number(formData.get("conversation_id"));
  const message = String(formData.get("message") || "").trim();
  const filter = String(formData.get("filter") || "all").trim();
  const query = String(formData.get("query") || "").trim();

  if (!conversationId || Number.isNaN(conversationId)) {
    throw new Error("Invalid conversation.");
  }

  if (!message) {
    throw new Error("Message cannot be empty.");
  }

  await validateSupplierConversationOwnership(
    supabase,
    supplierProfile.supplier_id,
    conversationId,
  );

  await insertMessage(supabase, conversationId, appUserId, message);
  await touchConversation(supabase, supplierProfile.supplier_id, conversationId);

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
