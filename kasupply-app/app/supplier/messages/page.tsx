import Link from "next/link";
import { getSupplierMessagesData } from "./data";
import { sendSupplierMessage } from "./actions";

function buildMessagesHref(params: {
  conversationId?: number | null;
  filter?: string | null;
  query?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (params.conversationId) {
    searchParams.set("conversation", String(params.conversationId));
  }

  if (params.filter === "unread") {
    searchParams.set("filter", "unread");
  }

  if (params.query) {
    searchParams.set("q", params.query);
  }

  const suffix = searchParams.toString();
  return suffix ? `/supplier/messages?${suffix}` : "/supplier/messages";
}

function formatMessageTime(value: string) {
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

export default async function SupplierMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    conversation?: string;
    filter?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const conversationId = resolvedSearchParams.conversation
    ? Number(resolvedSearchParams.conversation)
    : null;

  const data = await getSupplierMessagesData({
    conversationId: conversationId && !Number.isNaN(conversationId) ? conversationId : null,
    filter: resolvedSearchParams.filter ?? null,
    query: resolvedSearchParams.q ?? null,
  });

  const selectedConversation = data.selectedConversation;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Messages</h1>
        <p className="text-sm text-slate-500">
          Manage buyer conversations, answer inquiries, and continue RFQ-linked chat threads.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_290px]">
        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Inbox</h2>
                <p className="text-sm text-slate-500">
                  {data.conversations.length} conversation
                  {data.conversations.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 p-1">
              <Link
                href={buildMessagesHref({
                  conversationId: selectedConversation?.id ?? null,
                  filter: "all",
                  query: data.query,
                })}
                className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium transition ${
                  data.filter === "all"
                    ? "bg-[#243f68] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </Link>
              <Link
                href={buildMessagesHref({
                  conversationId: selectedConversation?.id ?? null,
                  filter: "unread",
                  query: data.query,
                })}
                className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium transition ${
                  data.filter === "unread"
                    ? "bg-[#243f68] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unread
              </Link>
            </div>

            <form method="GET" className="mt-4">
              {selectedConversation ? (
                <input type="hidden" name="conversation" value={selectedConversation.id} />
              ) : null}
              {data.filter === "unread" ? (
                <input type="hidden" name="filter" value="unread" />
              ) : null}
              <input
                type="search"
                name="q"
                defaultValue={data.query}
                placeholder="Search messages..."
                className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </form>
          </div>

          <div className="max-h-[calc(100vh-270px)] overflow-y-auto p-3">
            {data.conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                No conversations found for this filter yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.conversations.map((conversation) => {
                  const isSelected = selectedConversation?.id === conversation.id;

                  return (
                    <Link
                      key={conversation.id}
                      href={buildMessagesHref({
                        conversationId: conversation.id,
                        filter: data.filter,
                        query: data.query,
                      })}
                      className={`block rounded-2xl border px-4 py-3 transition ${
                        isSelected
                          ? "border-[#4b6a98] bg-[#f4f7fb] shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {conversation.name}
                            </p>
                            {conversation.hasUnread ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {conversation.latestMessage}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-slate-400">
                            {conversation.latestMessageTimeLabel}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <span className="mt-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#243f68] px-2 py-1 text-[11px] font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {selectedConversation.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      {selectedConversation.rfqReference ? (
                        <span>{selectedConversation.rfqReference}</span>
                      ) : (
                        <span>General inquiry</span>
                      )}
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active thread
                      </span>
                    </div>
                  </div>

                  {selectedConversation.latestMessageAt ? (
                    <p className="text-sm text-slate-400">
                      Last message {formatMessageTime(selectedConversation.latestMessageAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fcfcfd_0%,#ffffff_100%)] px-6 py-5">
                {data.messages.length === 0 ? (
                  <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
                    No messages in this conversation yet. Start the thread below.
                  </div>
                ) : (
                  data.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.isOwnMessage
                            ? "bg-[#243f68] text-white"
                            : "border border-slate-200 bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p className="text-sm leading-6">{message.content}</p>
                        <div
                          className={`mt-2 text-[11px] ${
                            message.isOwnMessage ? "text-slate-200" : "text-slate-400"
                          }`}
                        >
                          {message.sentAtLabel}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 p-5">
                <form action={sendSupplierMessage} className="flex items-end gap-3">
                  <input type="hidden" name="conversation_id" value={selectedConversation.id} />
                  <input type="hidden" name="filter" value={data.filter} />
                  <input type="hidden" name="query" value={data.query} />
                  <textarea
                    name="message"
                    rows={2}
                    placeholder="Type your message..."
                    className="min-h-[54px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    required
                  />
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#4f7cf7] px-5 text-sm font-semibold text-white transition hover:bg-[#4269d5]"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[720px] items-center justify-center px-8">
              <div className="max-w-md text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  Select a conversation
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pick a buyer conversation from the left to view the thread, send replies,
                  and jump into any linked RFQ engagement.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedConversation ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business Info
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {selectedConversation.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedConversation.rfqReference
                    ? `Linked to ${selectedConversation.rfqReference}`
                    : "General inquiry conversation"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedConversation.location}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Contact Person
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedConversation.contactPerson ?? "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Phone
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedConversation.phone ?? "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-700">
                    {selectedConversation.email ?? "Not available"}
                  </p>
                </div>
              </div>

              {selectedConversation.engagementId ? (
                <Link
                  href={`/supplier/rfq/${selectedConversation.engagementId}`}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-[#4f7cf7] px-4 py-3 text-sm font-semibold text-[#4f7cf7] transition hover:bg-blue-50"
                >
                  View Latest RFQ
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-slate-500">
              Conversation details will appear here once you open a thread.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
