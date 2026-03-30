import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getBuyerNotifications } from "@/lib/buyer/notifications";
import {
  markAllBuyerNotificationsRead,
  markBuyerNotificationRead,
  openBuyerNotification,
} from "./actions";

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

function formatNotificationType(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#d9e2ef] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4ff_100%)] p-6 shadow-[0_18px_45px_rgba(36,63,104,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6781a8]">
            Buyer notifications
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#223654]">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#61738f]">
            Track RFQ activity, sourcing updates, and order progress in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[#4a5b75] shadow-[0_10px_30px_rgba(36,63,104,0.08)]">
            <span className="font-semibold text-[#223654]">{notifications.unreadCount}</span>{" "}
            unread
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[#4a5b75] shadow-[0_10px_30px_rgba(36,63,104,0.08)]">
            <span className="font-semibold text-[#223654]">{notifications.totalCount}</span>{" "}
            total
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
        <section className="rounded-2xl border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">No notifications yet</h2>
          <p className="mt-2 text-sm text-[#8b95a5]">
            New buyer activity will appear here once your RFQs, sourcing requests, or
            orders start moving.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {notifications.items.map((notification) => (
            <section
              key={notification.notificationId}
              className={`rounded-2xl border p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition ${
                notification.isRead
                  ? "border-[#edf1f7] bg-white"
                  : "border-[#cfe0ff] bg-[#f8fbff]"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#d7dee8] bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#5d7190]">
                      {formatNotificationType(notification.type)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        notification.isRead
                          ? "bg-[#eef3f9] text-[#6d7f98]"
                          : "bg-[#dceaff] text-[#2456a6]"
                      }`}
                    >
                      {notification.isRead ? "Read" : "Unread"}
                    </span>
                    <span className="text-xs text-[#8b95a5]">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#223654]">
                      {notification.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4a5b75]">
                      {notification.body}
                    </p>
                  </div>
                </div>

                {!notification.isRead ? (
                  <div className="flex h-3 w-3 flex-none rounded-full bg-[#ff5331]" aria-hidden="true" />
                ) : null}
              </div>

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
                      className="inline-flex items-center justify-center rounded-xl border border-[#d7dee8] bg-white px-4 py-2.5 text-sm font-medium text-[#223654] transition hover:bg-[#f8fafc]"
                    >
                      Mark as read
                    </button>
                  </form>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
