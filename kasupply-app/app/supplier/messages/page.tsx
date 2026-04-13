import { getSupplierMessagesData } from "./data";
import { SupplierMessagesClient } from "./messages-client";

export default async function SupplierMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    conversation?: string;
    conversationId?: string;
    filter?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawConversationId =
    resolvedSearchParams.conversationId ?? resolvedSearchParams.conversation ?? null;
  const conversationId = rawConversationId ? Number(rawConversationId) : null;

  const data = await getSupplierMessagesData({
    conversationId: conversationId && !Number.isNaN(conversationId) ? conversationId : null,
    filter: resolvedSearchParams.filter ?? null,
    query: resolvedSearchParams.q ?? null,
  });

  return <SupplierMessagesClient initialData={data} />;
}
