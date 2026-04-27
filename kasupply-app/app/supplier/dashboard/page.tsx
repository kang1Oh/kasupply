import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  getSupplierDashboardData,
  openMatchedRfq,
  type SupplierDashboardData,
} from "./actions";

type StatCardConfig = {
  label: string;
  value: number;
  note: string;
  iconSrc: string;
  iconAlt: string;
};

function buildFallbackDashboardData(): SupplierDashboardData {
  return {
    supplierName: "Supplier",
    supplierInitials: "S",
    supplierBusinessType: "Supplier",
    currentDateLabel: "Today",
    verificationStatus: "incomplete",
    stats: {
      inventoryItems: 0,
      inventoryNote: "Dashboard data is temporarily unavailable",
      incomingRfqs: 0,
      incomingRfqsNote: "Dashboard data is temporarily unavailable",
      matchedBuyers: 0,
      matchedBuyersNote: "Dashboard data is temporarily unavailable",
      pendingInvoices: 0,
      pendingInvoicesNote: "Dashboard data is temporarily unavailable",
    },
    sourcingOpportunities: [],
    notifications: [],
    incomingRfqs: [],
    inventorySnapshot: [],
  };
}

const notificationToneStyles: Record<
  SupplierDashboardData["notifications"][number]["tone"],
  {
    icon: typeof Bell;
    iconContainerClassName: string;
    iconClassName: string;
  }
> = {
  green: {
    icon: ClipboardList,
    iconContainerClassName: "bg-[#EAF8EE]",
    iconClassName: "text-[#56A96B]",
  },
  orange: {
    icon: FileText,
    iconContainerClassName: "bg-[#FFF0EB]",
    iconClassName: "text-[#F26B4F]",
  },
  blue: {
    icon: MessageSquare,
    iconContainerClassName: "bg-[#FFF4E8]",
    iconClassName: "text-[#F7A54A]",
  },
  pink: {
    icon: BriefcaseBusiness,
    iconContainerClassName: "bg-[#EEF2FF]",
    iconClassName: "text-[#5975F5]",
  },
};

function HeaderIconButton({
  ariaLabel,
  children,
  showDot = false,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  showDot?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
    >
      {showDot ? (
        <span className="absolute right-[9px] top-[9px] h-[6px] w-[6px] rounded-full bg-[#FF6C5C]" />
      ) : null}
      {children}
    </button>
  );
}

function StatCard({ item }: { item: StatCardConfig }) {
  return (
    <article className="rounded-[14px] border border-[#E5EBF3] bg-white px-[16px] py-[16px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#40434A]">
            {item.value}
          </p>
          <p className="mt-[8px] text-[13px] font-medium text-[#6A707C]">{item.label}</p>
          <p className="mt-[10px] text-[11px] font-medium text-[#2F8C57]">{item.note}</p>
        </div>

        <div className="flex h-[57px] w-[57px] shrink-0 items-center justify-center">
          <Image
            src={item.iconSrc}
            alt={item.iconAlt}
            width={57}
            height={57}
            className="h-[57px] w-[57px] object-contain"
          />
        </div>
      </div>
    </article>
  );
}

function SourcingCard({
  item,
}: {
  item: SupplierDashboardData["sourcingOpportunities"][number];
}) {
  const actionClassName = item.submitted
    ? "bg-[#2E68F4] text-white"
    : "bg-[#27456F] text-white hover:bg-[#1F3A5D]";

  return (
    <article className="rounded-[22px] border border-[#E3E8F0] bg-white p-[24px] shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-[14px]">
          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#FFDCE5] text-[20px] font-medium text-[#E16589]">
            {item.buyerInitials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[8px]">
              <p className="text-[16px] font-semibold text-[#334155]">{item.buyerName}</p>
              <p className="text-[13px] text-[#A0A8B7]">
                {item.category}
                <span className="px-[5px]">·</span>
                {item.date}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          <span className="inline-flex rounded-full bg-[#E7F0FF] px-[12px] py-[5px] text-[12px] font-semibold text-[#4D83F6]">
            {item.matchLabel}
          </span>
          <span className="inline-flex items-center rounded-[6px] bg-[#EEF9F1] px-[12px] py-[5px] text-[12px] font-semibold text-[#3E9A60]">
            <span className="mr-[6px] h-[7px] w-[7px] rounded-full bg-[#3E9A60]" />
            {item.statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-[14px]">
        <h3 className="text-[17px] font-semibold leading-[1.4] text-[#374151]">{item.title}</h3>
        <p className="mt-[8px] max-w-[760px] text-[14px] leading-[1.65] text-[#7E8794]">
          {item.description}
        </p>
      </div>

      <div className="mt-[16px] grid gap-0 overflow-hidden rounded-[14px] border border-[#DDE3EB] bg-[#F5F6F8] sm:grid-cols-2 xl:grid-cols-4">
        {item.details.map((detail, index) => (
          <div
            key={`${item.matchId}-${detail.label}`}
            className={`px-[18px] py-[14px] ${index > 0 ? "border-t border-[#DDE3EB] sm:border-l sm:border-t-0" : ""} ${index > 1 ? "xl:border-l" : ""}`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#9EA6B4]">
              {detail.label}
            </p>
            <p className="mt-[6px] text-[15px] font-semibold text-[#374151]">{detail.value}</p>
          </div>
        ))}
      </div>

      {item.actionHref ? (
        <Link
          href={item.actionHref}
          className={`mt-[14px] inline-flex h-[44px] w-full items-center justify-center rounded-[6px] text-[14px] font-medium transition ${actionClassName}`}
        >
          {item.actionLabel}
        </Link>
      ) : (
        <form action={openMatchedRfq} className="mt-[14px]">
          <input type="hidden" name="match_id" value={item.matchId} />
          <input type="hidden" name="rfq_id" value={item.rfqId} />
          <button
            type="submit"
            className={`inline-flex h-[44px] w-full items-center justify-center rounded-[6px] text-[14px] font-medium transition ${actionClassName}`}
          >
            {item.actionLabel}
          </button>
        </form>
      )}
    </article>
  );
}

export default async function SupplierDashboardPage() {
  let data = buildFallbackDashboardData();
  let hasLoadError = false;

  try {
    data = await getSupplierDashboardData();
  } catch (error) {
    hasLoadError = true;
    console.error("Failed to load supplier dashboard data:", error);
  }

  const statCards: StatCardConfig[] = [
    {
      label: "Inventory Items",
      value: data.stats.inventoryItems,
      note: data.stats.inventoryNote,
      iconSrc: "/icons/inventory.svg",
      iconAlt: "Inventory items",
    },
    {
      label: "Incoming RFQs",
      value: data.stats.incomingRfqs,
      note: data.stats.incomingRfqsNote,
      iconSrc: "/icons/incoming-rfqs.svg",
      iconAlt: "Incoming RFQs",
    },
    {
      label: "Matched Buyers",
      value: data.stats.matchedBuyers,
      note: data.stats.matchedBuyersNote,
      iconSrc: "/icons/matched-buyers.svg",
      iconAlt: "Matched buyers",
    },
    {
      label: "Pending Invoices",
      value: data.stats.pendingInvoices,
      note: data.stats.pendingInvoicesNote,
      iconSrc: "/icons/pending-invoices.svg",
      iconAlt: "Pending invoices",
    },
  ];

  return (
    <div className="-m-6 min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#DCE5F1] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-[8px] text-[14px]">
            <span className="font-normal text-[#A5AEBB]">KaSupply</span>
            <ChevronRight className="h-[14px] w-[14px] text-[#B6BEC9]" />
            <span className="font-semibold text-[#2B4368]">Dashboard</span>
          </div>

          <div className="flex items-center gap-[8px]">
            <HeaderIconButton ariaLabel="Notifications" showDot>
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </HeaderIconButton>
            <Link href="/supplier/messages" aria-label="Messages">
              <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]">
                <MessageSquare className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="px-[24px] py-[22px] md:px-[32px]">
        <section>
          <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[#28456E]">
            Good Morning, {data.supplierName}
            <span className="ml-[4px]">👋</span>
          </h1>
          <p className="mt-[3px] text-[14px] font-medium text-[#A1AAB8]">{data.currentDateLabel}</p>
        </section>

        {hasLoadError ? (
          <section className="mt-[14px] rounded-[14px] border border-[#F6D5C7] bg-[#FFF7F2] px-[16px] py-[12px] text-[13px] text-[#A45A38]">
            The dashboard is available again, but some live supplier data could not be loaded right
            now.
          </section>
        ) : null}

        <section className="mt-[16px] grid gap-[16px] xl:grid-cols-4 md:grid-cols-2">
          {statCards.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </section>

        <section className="mt-[24px] grid gap-[22px] xl:grid-cols-[minmax(0,1fr)_404px]">
          <div className="min-w-0">
            <div className="mb-[14px] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold text-[#304668]">Sourcing Board</h2>
                <p className="mt-[2px] text-[15px] text-[#A2AAB7]">
                  Browse matches and submit quotes
                </p>
              </div>

              <div className="flex items-center gap-[10px]">
                <span className="text-[14px] text-[#A2AAB7]">Sort by</span>
                <button
                  type="button"
                  className="inline-flex h-[36px] items-center gap-[6px] rounded-[8px] border border-[#D8E0EA] bg-white px-[14px] text-[14px] font-medium text-[#4C5B70]"
                >
                  Newest First
                  <ChevronDown className="h-[16px] w-[16px]" />
                </button>
              </div>
            </div>

            <div className="space-y-[18px]">
              {data.sourcingOpportunities.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#D8E1ED] bg-white px-[24px] py-[40px] text-center text-[14px] text-[#8A94A6]">
                  No sourcing matches are visible right now.
                </div>
              ) : (
                data.sourcingOpportunities.map((item) => (
                  <SourcingCard key={item.matchId} item={item} />
                ))
              )}
            </div>
          </div>

          <aside>
            <div className="space-y-[14px]">
              <section className="overflow-hidden rounded-[24px] border border-[#D8E1ED] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between border-b border-[#E8EDF3] px-[16px] py-[16px]">
                  <h2 className="text-[16px] font-semibold text-[#304668]">Notifications</h2>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[#2E68F4] underline-offset-2 hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>

                <div>
                  {data.notifications.length === 0 ? (
                    <div className="px-[18px] py-[24px] text-[13px] text-[#8A94A6]">
                      No recent notifications.
                    </div>
                  ) : (
                    data.notifications.map((notification, index) => {
                      const tone = notificationToneStyles[notification.tone];
                      const Icon = tone.icon;

                      return (
                        <article
                          key={`${notification.title}-${index}`}
                          className={`flex gap-[12px] px-[16px] py-[16px] ${index > 0 ? "border-t border-[#EDF2F7]" : ""}`}
                        >
                          <div
                            className={`mt-[2px] flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] ${tone.iconContainerClassName}`}
                          >
                            <Icon
                              className={`h-[18px] w-[18px] ${tone.iconClassName}`}
                              strokeWidth={1.9}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-[10px]">
                              <p className="text-[15px] font-semibold leading-[1.35] text-[#364152]">
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-[8px]">
                                <span className="whitespace-nowrap text-[12px] text-[#A3ACB8]">
                                  {notification.time}
                                </span>
                                <span className="mt-[1px] h-[6px] w-[6px] rounded-full bg-[#2E8B57]" />
                              </div>
                            </div>
                            <p className="mt-[2px] text-[13px] leading-[1.45] text-[#98A2B0]">
                              {notification.description}
                            </p>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[24px] border border-[#D8E1ED] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between border-b border-[#E8EDF3] px-[16px] py-[14px]">
                  <div className="flex items-center gap-[8px]">
                    <h2 className="text-[15px] font-semibold text-[#304668]">Incoming RFQs</h2>
                    <span className="rounded-[6px] bg-[#FFF0E3] px-[8px] py-[2px] text-[10px] font-semibold text-[#F08A24]">
                      {data.stats.incomingRfqs} Pending
                    </span>
                  </div>
                  <Link
                    href="/supplier/rfq"
                    className="text-[12px] font-medium text-[#2E68F4] hover:underline"
                  >
                    View All →
                  </Link>
                </div>

                <div>
                  {data.incomingRfqs.length === 0 ? (
                    <div className="px-[16px] py-[24px] text-[13px] text-[#8A94A6]">
                      No incoming RFQs yet.
                    </div>
                  ) : (
                    data.incomingRfqs.map((item, index) => (
                      <article
                        key={item.matchId}
                        className={`flex items-start gap-[12px] px-[16px] py-[13px] ${index > 0 ? "border-t border-[#EDF2F7]" : ""}`}
                      >
                        <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[#EAF8EE] text-[10px] font-semibold text-[#55A468]">
                          {item.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-[10px]">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-[#364152]">
                                {item.product}
                              </p>
                              <p className="mt-[2px] truncate text-[11px] text-[#98A2B0]">
                                {item.buyer} · {item.target}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[12px] font-semibold text-[#4A5565]">
                                {item.quantity}
                              </p>
                              <p className="mt-[2px] text-[10px] text-[#A5ADBA]">{item.time}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[24px] border border-[#D8E1ED] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between border-b border-[#E8EDF3] px-[16px] py-[14px]">
                  <h2 className="text-[15px] font-semibold text-[#304668]">Inventory Snapshot</h2>
                  <Link
                    href="/supplier/inventory"
                    className="text-[12px] font-medium text-[#2E68F4] hover:underline"
                  >
                    Manage →
                  </Link>
                </div>

                <div>
                  {data.inventorySnapshot.length === 0 ? (
                    <div className="px-[16px] py-[24px] text-[13px] text-[#8A94A6]">
                      No inventory products found.
                    </div>
                  ) : (
                    data.inventorySnapshot.map((item, index) => (
                      <article
                        key={item.productId}
                        className={`flex items-center justify-between gap-[10px] px-[16px] py-[12px] ${index > 0 ? "border-t border-[#EDF2F7]" : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-[7px]">
                            <span
                              className={`h-[6px] w-[6px] shrink-0 rounded-full ${
                                item.status === "in-stock"
                                  ? "bg-[#2E8B57]"
                                  : item.status === "low-stock"
                                    ? "bg-[#F08A24]"
                                    : "bg-[#EF4444]"
                              }`}
                            />
                            <p className="truncate text-[13px] font-medium text-[#394150]">
                              {item.product}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-[10px]">
                          <span className="whitespace-nowrap text-[11px] text-[#A2AAB8]">
                            {item.quantity}
                          </span>
                          <span
                            className={`rounded-[6px] px-[9px] py-[3px] text-[10px] font-semibold ${
                              item.status === "in-stock"
                                ? "bg-[#ECFBF2] text-[#2F8C57]"
                                : item.status === "low-stock"
                                  ? "bg-[#FFF4E9] text-[#E9781B]"
                                  : "bg-[#FFF0F0] text-[#EF4444]"
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
