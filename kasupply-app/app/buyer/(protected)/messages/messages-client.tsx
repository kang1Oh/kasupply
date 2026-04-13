"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markBuyerConversationRead, sendBuyerMessageInline } from "./actions";
import type { BuyerMessagesData, MessageItem } from "./data";

type BuyerMessagesClientProps = {
  initialData: BuyerMessagesData;
};

type RawMessageRecord = Record<string, unknown>;

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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readFirstNumber(row: RawMessageRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function readFirstString(row: RawMessageRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function readFirstBoolean(row: RawMessageRecord, keys: string[]) {
  for (const key of keys) {
    const value = asBoolean(row[key]);
    if (value !== null) return value;
  }
  return null;
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

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replaceAll("Â·", "·")
    .replaceAll("â€¢", "·")
    .replaceAll("â€”", "-")
    .replaceAll("â€¦", "...");
}

function normalizeMessageRecord(
  row: RawMessageRecord,
  currentUserId: string,
): MessageItem | null {
  const id = readFirstNumber(row, ["message_id", "id"]);
  if (id === null) return null;

  const senderId = readFirstString(row, ["sender_id", "sent_by", "user_id"]);
  const sentAt = readFirstString(row, ["created_at", "sent_at"]);
  const content =
    readFirstString(row, ["message_text", "content", "message", "body", "text"]) ?? "";
  const readAt = readFirstString(row, ["read_at"]);
  const isRead = readFirstBoolean(row, ["is_read"]);

  return {
    id,
    senderId,
    content: cleanText(content),
    sentAt,
    sentAtLabel: formatChatTimestamp(sentAt),
    isOwnMessage: senderId === currentUserId,
    isRead: Boolean(readAt) || isRead === true,
  };
}

function getAvatarTheme(seed: string) {
  const themes = [
    "bg-[#DDF3E5] text-[#4E9B6C]",
    "bg-[#E6EEFF] text-[#4B74F0]",
    "bg-[#FFE8D8] text-[#F08A36]",
    "bg-[#FFE2DE] text-[#F46A59]",
  ];

  const index =
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % themes.length;
  return themes[index]!;
}

function MessageBubble({
  message,
  otherPartyInitials,
  ownInitials,
}: {
  message: MessageItem;
  otherPartyInitials: string;
  ownInitials: string;
}) {
  const own = message.isOwnMessage;
  const otherTheme = getAvatarTheme(otherPartyInitials);

  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[72%] items-end gap-3 ${
          own ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
            own ? "bg-[#4D7BF6] text-white" : otherTheme
          }`}
        >
          {own ? ownInitials : otherPartyInitials}
        </div>

        <div className={own ? "text-right" : "text-left"}>
          <div className="inline-block rounded-[9px] border border-[#E7EDF5] bg-white px-4 py-3 text-[12px] font-medium leading-[1.35] text-[#223654] shadow-[0_4px_14px_rgba(15,23,42,0.025)]">
            {message.content}
          </div>
          <p className="mt-2 text-[10px] text-[#B1BAC7]">{message.sentAtLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function BuyerMessagesClient({ initialData }: BuyerMessagesClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialData.query);
  const [conversations, setConversations] = useState(initialData.conversations);
  const initialSelectedConversationId = initialData.selectedConversation?.id ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(
    initialData.selectedConversation?.id ?? null,
  );
  const [messages, setMessages] = useState<MessageItem[]>(initialData.messages);
  const [draft, setDraft] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const draftConversation =
    selectedConversation == null ? initialData.draftConversation : null;
  const activeConversation = selectedConversation ?? draftConversation;
  const selectedConversationId = selectedConversation?.id ?? null;
  const unreadConversations = conversations.filter((conversation) => conversation.hasUnread).length;

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.name,
        conversation.subtitle,
        conversation.latestMessage,
        conversation.rfqReference ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversations, query]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConversationId) return;

    let isCancelled = false;

    const loadMessages = async () => {
      const shouldShowLoading =
        selectedConversationId !== initialSelectedConversationId ||
        initialData.messages.length === 0;

      if (shouldShowLoading) {
        setIsLoadingMessages(true);
      }

      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", selectedConversationId)
          .order("created_at", { ascending: true });

        if (isCancelled) return;

        const normalized = ((data as RawMessageRecord[] | null) ?? [])
          .map((row) => normalizeMessageRecord(row, initialData.currentUserId))
          .filter((value): value is MessageItem => value !== null);

        setMessages(normalized);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? { ...conversation, unreadCount: 0, hasUnread: false }
              : conversation,
          ),
        );

        void markBuyerConversationRead(selectedConversationId);
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    const channel = supabase
      .channel(`buyer-messages-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const normalized = normalizeMessageRecord(
            payload.new as RawMessageRecord,
            initialData.currentUserId,
          );

          if (!normalized) return;

          setMessages((current) => {
            if (current.some((message) => message.id === normalized.id)) return current;
            return [...current, normalized];
          });

          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === selectedConversationId
                ? {
                    ...conversation,
                    latestMessage: normalized.content,
                    latestMessageAt: normalized.sentAt,
                    latestMessageTimeLabel: formatSidebarTimestamp(normalized.sentAt),
                    unreadCount: normalized.isOwnMessage ? 0 : conversation.unreadCount + 1,
                    hasUnread: !normalized.isOwnMessage,
                    isOnline: true,
                  }
                : conversation,
            ),
          );

          if (!normalized.isOwnMessage) {
            void markBuyerConversationRead(selectedConversationId);
          }
        },
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [
    initialData.currentUserId,
    initialData.messages.length,
    initialSelectedConversationId,
    selectedConversationId,
    supabase,
  ]);

  async function handleSendMessage() {
    if (!activeConversation) return;
    const trimmed = draft.trim();
    if (!trimmed) return;

    setDraft("");

    startTransition(async () => {
      const result = await sendBuyerMessageInline({
        conversationId: selectedConversation?.id ?? null,
        supplierId: selectedConversation == null ? activeConversation.supplierId : null,
        engagementId: selectedConversation == null ? activeConversation.engagementId : null,
        message: trimmed,
      });

      if (selectedConversation == null && result.conversationId) {
        router.replace(`/buyer/messages?conversationId=${result.conversationId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="relative left-1/2 right-1/2 -mt-5 w-screen -translate-x-1/2 bg-white">
      <div className="overflow-hidden border-y border-[#E3E8F0] bg-white">
        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[30.2%_69.8%]">
          <aside className="border-r border-[#E6ECF3] bg-white">
            <div className="flex items-center justify-between border-b border-[#E6ECF3] px-5 py-4">
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[#233B63]">
                Messages
              </h1>
              <span className="rounded-full bg-[#FF4D3D] px-2.5 py-1 text-[10px] font-semibold leading-none text-white">
                {unreadConversations} unread
              </span>
            </div>

            <div className="border-b border-[#EDF2F7] px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C8CFD9]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search conversations..."
                  className="h-[36px] w-full rounded-[6px] border border-[#EEF2F7] bg-[#FAFAFB] pl-9 pr-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B8C0CB]"
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="px-4 py-8 text-[13px] text-[#98A2B3]">No conversations found.</div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.id === selectedId;
                  const theme = getAvatarTheme(conversation.name);

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={`relative flex w-full items-start gap-3 border-b border-[#EEF2F7] px-5 py-[14px] text-left transition ${
                        isActive ? "bg-white" : "hover:bg-[#FAFBFD]"
                      }`}
                    >
                      {isActive ? (
                        <span className="absolute inset-y-0 left-0 w-[2px] bg-[#4A74F3]" />
                      ) : null}

                      <div className="relative shrink-0">
                        <div
                          className={`flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[13px] font-semibold ${theme}`}
                        >
                          {conversation.initials}
                        </div>
                        {conversation.isOnline ? (
                          <span className="absolute -right-0.5 top-0.5 h-[8px] w-[8px] rounded-full border border-white bg-[#2DBB5F]" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-[14px] font-semibold leading-5 text-[#233B63]">
                            {cleanText(conversation.name)}
                          </p>
                          <span className="whitespace-nowrap text-[11px] text-[#A7B0BD]">
                            {conversation.latestMessageTimeLabel}
                          </span>
                        </div>
                        <p className="mt-[2px] truncate text-[12px] leading-5 text-[#7E8899]">
                          {cleanText(conversation.latestMessage)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col bg-white">
            {activeConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-[#E6ECF3] px-4 py-3 md:px-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] text-[15px] font-semibold ${
                        getAvatarTheme(activeConversation.name)
                      }`}
                    >
                      {activeConversation.initials}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-semibold leading-5 text-[#233B63]">
                        {cleanText(activeConversation.name)}
                      </h2>
                      <p className="truncate text-[12px] leading-5 text-[#99A4B4]">
                        {cleanText(activeConversation.subtitle)}
                      </p>
                    </div>
                  </div>

                  {activeConversation.rfqHref ? (
                    <Link
                      href={activeConversation.rfqHref}
                      className="inline-flex h-[38px] items-center justify-center rounded-[8px] border border-[#DDE4ED] bg-white px-4 text-[13px] font-medium text-[#334155] transition hover:bg-[#F8FAFC]"
                    >
                      View RFQ
                    </Link>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 border-b border-[#E6ECF3] px-4 py-3 text-[12px] md:px-5">
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.04em] text-[#A8B2C0]">
                    Related RFQ
                  </span>
                  {activeConversation.rfqReference ? (
                    <span className="inline-flex shrink-0 items-center rounded-[8px] bg-[#EAF1FF] px-3 py-1 font-semibold text-[#4B74F0]">
                      {activeConversation.rfqReference}
                    </span>
                  ) : null}
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-[#738094]">
                    {activeConversation.rfqTitle ? (
                      <span className="truncate">{cleanText(activeConversation.rfqTitle)}</span>
                    ) : null}
                    {activeConversation.rfqQuantityLabel ? (
                      <>
                        <span className="text-[#C4CBD6]">-</span>
                        <span>{cleanText(activeConversation.rfqQuantityLabel)}</span>
                      </>
                    ) : null}
                    {activeConversation.rfqTargetPriceLabel ? (
                      <>
                        <span className="text-[#C4CBD6]">·</span>
                        <span>{cleanText(activeConversation.rfqTargetPriceLabel)}</span>
                      </>
                    ) : null}
                    {activeConversation.rfqDeadlineLabel ? (
                      <>
                        <span className="text-[#C4CBD6]">·</span>
                        <span>{cleanText(activeConversation.rfqDeadlineLabel)}</span>
                      </>
                    ) : null}
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#C0C7D4]" />
                </div>

                <div className="flex-1 bg-[#FCFCFD] px-4 py-6 md:px-5">
                  {isLoadingMessages ? (
                    <div className="pt-24 text-center text-[13px] text-[#98A2B3]">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex min-h-[360px] items-center justify-center text-center text-[13px] text-[#98A2B3]">
                      {selectedConversation
                        ? "No messages in this conversation yet."
                        : "Start the conversation by sending your first message."}
                    </div>
                  ) : (
                    <div className="flex min-h-[360px] flex-col justify-end">
                      <div className="mb-9 text-center text-[12px] font-medium text-[#B3BCC8]">
                        Today
                      </div>
                      <div className="space-y-9">
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            otherPartyInitials={activeConversation.initials}
                            ownInitials={initialData.buyerInitials}
                          />
                        ))}
                      </div>
                      <div ref={endRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E6ECF3] bg-[#FBFCFD] px-4 py-3 md:px-5">
                  <div className="flex items-center gap-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Type your message..."
                      className="h-[40px] min-h-[40px] flex-1 resize-none rounded-[8px] border border-[#E6EBF2] bg-white px-4 py-2.5 text-[12px] text-[#344054] outline-none placeholder:text-[#B4BDCB]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={isPending || draft.trim().length === 0}
                      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-[8px] bg-[#4D7BF6] text-white transition hover:bg-[#3F69D1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-8">
                <div className="max-w-md text-center">
                  <h2 className="text-[22px] font-semibold text-[#223654]">Select a conversation</h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#98A2B3]">
                    Choose a supplier conversation from the left to load the active chat window.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
