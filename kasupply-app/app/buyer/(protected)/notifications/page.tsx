import { redirect } from "next/navigation";
import {
  ClipboardCheck,
  MessageSquare,
  PackageCheck,
} from "lucide-react";
import type { BuyerNotificationItem } from "@/lib/buyer/notifications";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getBuyerNotifications } from "@/lib/buyer/notifications";
import {
  markAllBuyerNotificationsRead,
  markBuyerNotificationRead,
  openBuyerNotification,
} from "./actions";

const categoryIconMap: Record<BuyerNotificationItem["category"], typeof MessageSquare> = {
  message: MessageSquare,
  quotation_reply: ClipboardCheck,
  purchase_order_update: PackageCheck,
} as const;

const categoryColorMap: Record<
  BuyerNotificationItem["category"],
  {
    iconWrap: string;
    icon: string;
    pill: string;
    label: string;
  }
> = {
  message: {
    iconWrap: "bg-[#EEF4FF]",
    icon: "text-[#2E68F4]",
    pill: "bg-[#E9F1FF] text-[#2E68F4]",
    label: "New Message",
  },
  quotation_reply: {
    iconWrap: "bg-[#FFF1F0]",
    icon: "text-[#E15A4F]",
    pill: "bg-[#FFF0ED] text-[#D14A3F]",
    label: "Quotation Reply",
  },
  purchase_order_update: {
    iconWrap: "bg-[#EEF8F1]",
    icon: "text-[#2F8C57]",
    pill: "bg-[#E8F7ED] text-[#2F8C57]",
    label: "Purchase Order Update",
  },
} as const;

function formatTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default async function BuyerNotificationsPage() {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "authenticated",
    targetPath: "/buyer/notifications",
    reason: "notifications",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const notifications = await getBuyerNotifications();
  const quotationReplyCount = notifications.items.filter(
    (item) => item.category === "quotation_reply",
  ).length;
  const purchaseOrderUpdateCount = notifications.items.filter(
    (item) => item.category === "purchase_order_update",
  ).length;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#d9e2ef] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4ff_100%)] p-6 shadow-[0_18px_45px_rgba(36,63,104,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-2xl font-bold text-[#223654]">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#61738f]">
            Track new messages, quotation replies, and purchase order status changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[#4a5b75] shadow-[0_10px_30px_rgba(36,63,104,0.08)]">
            <span className="font-semibold text-[#223654]">{notifications.unreadCount}</span>{" "}
            unread
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[#4a5b75] shadow-[0_10px_30px_rgba(36,63,104,0.08)]">
            <span className="font-semibold text-[#223654]">{quotationReplyCount}</span>{" "}
            quotation repl{quotationReplyCount === 1 ? "y" : "ies"}
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[#4a5b75] shadow-[0_10px_30px_rgba(36,63,104,0.08)]">
            <span className="font-semibold text-[#223654]">{purchaseOrderUpdateCount}</span>{" "}
            purchase order update{purchaseOrderUpdateCount === 1 ? "" : "s"}
          </div>

          {notifications.unreadCount > 0 ? (
            <form action={markAllBuyerNotificationsRead}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#243f68] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1f3658]"
              >
                Mark all as read
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {notifications.items.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#D8E2EE] bg-white px-[28px] py-[36px] shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-[18px] font-semibold text-[#223654]">Notifications</h2>
          <p className="mt-[10px] text-[15px] text-[#7C8798]">
            You have no new notifications.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {notifications.items.map((notification) => {
            const Icon = categoryIconMap[notification.category];
            const styles = categoryColorMap[notification.category];

            return (
              <section
                key={notification.notificationId}
                className={`rounded-[24px] border bg-white px-[20px] py-[20px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition ${
                  notification.isRead
                    ? "border-[#E5EBF3]"
                    : "border-[#D6E0EC] bg-[#FBFDFF]"
                }`}
              >
                <div className="flex items-start gap-[14px]">
                  <div
                    className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] ${styles.iconWrap}`}
                  >
                    <Icon className={`h-[20px] w-[20px] ${styles.icon}`} strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <span
                        className={`inline-flex items-center rounded-full px-[10px] py-[4px] text-[11px] font-semibold uppercase tracking-[0.04em] ${styles.pill}`}
                      >
                        {styles.label}
                      </span>
                      <span className="text-[12px] font-medium text-[#9AA4B2]">
                        {formatTimestamp(notification.createdAt)}
                      </span>
                      {!notification.isRead ? (
                        <span className="h-[8px] w-[8px] rounded-full bg-[#FF5B49]" aria-hidden="true" />
                      ) : null}
                    </div>

                    <h2 className="mt-[10px] text-[18px] font-semibold text-[#304668]">
                      {notification.title}
                    </h2>
                    <p className="mt-[6px] max-w-[880px] text-[14px] leading-[1.7] text-[#66758A]">
                      {notification.body}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {notification.targetPath ? (
                        <form action={openBuyerNotification}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.notificationId}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl bg-[#243f68] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f3658]"
                          >
                            Open
                          </button>
                        </form>
                      ) : null}

                      {!notification.isRead ? (
                        <form action={markBuyerNotificationRead}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.notificationId}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#223654] transition hover:bg-[#F8FAFC]"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </section>
      )}
    </main>
  );
}
