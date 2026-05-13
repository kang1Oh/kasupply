import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  getSupplierDashboardData,
  openMatchedRfq,
  type SupplierDashboardData,
} from "./actions";

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

function SourcingCard({
  item,
}: {
  item: SupplierDashboardData["sourcingOpportunities"][number];
}) {
  const actionClassName = item.submitted
    ? "bg-[#2E68F4] text-white"
    : "bg-[#27456F] text-white hover:bg-[#1F3A5D]";

  return (
    <article className="rounded-[24px] border border-[#E3E8F0] bg-white p-[24px] shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-[14px]">
          <ProfileAvatar
            name={item.buyerName}
            avatarUrl={item.buyerAvatarUrl}
            fallbackInitials={item.buyerInitials}
            sizes="50px"
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#FFDCE5] text-[20px] font-medium text-[#E16589]"
          />

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
          {item.statusLabel === "Open" ? (
            <span className="inline-flex items-center rounded-[6px] bg-[#EEF9F1] px-[12px] py-[5px] text-[12px] font-semibold text-[#3E9A60]">
              <span className="mr-[6px] h-[7px] w-[7px] rounded-full bg-[#3E9A60]" />
              {item.statusLabel}
            </span>
          ) : item.statusLabel === "Closed" ? (
            <span className="inline-flex items-center rounded-[6px] bg-[#FDEDED] px-[12px] py-[5px] text-[12px] font-semibold text-[#D14343]">
              <span className="mr-[6px] h-[7px] w-[7px] rounded-full bg-[#D14343]" />
              {item.statusLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-[14px]">
        <h2 className="text-[18px] font-semibold leading-[1.4] text-[#374151]">{item.title}</h2>
        <p className="mt-[8px] max-w-[760px] text-[14px] leading-[1.7] text-[#7E8794]">
          {item.description}
        </p>
      </div>

      <div className="mt-[16px] grid gap-0 overflow-hidden rounded-[16px] border border-[#DDE3EB] bg-[#F5F6F8] sm:grid-cols-2 xl:grid-cols-4">
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
          className={`mt-[14px] inline-flex h-[46px] w-full items-center justify-center rounded-[10px] text-[14px] font-medium transition ${actionClassName}`}
        >
          {item.actionLabel}
        </Link>
      ) : (
        <form action={openMatchedRfq} className="mt-[14px]">
          <input type="hidden" name="match_id" value={item.matchId} />
          <input type="hidden" name="rfq_id" value={item.rfqId} />
          <button
            type="submit"
            className={`inline-flex h-[46px] w-full items-center justify-center rounded-[10px] text-[14px] font-medium transition ${actionClassName}`}
          >
            {item.actionLabel}
          </button>
        </form>
      )}
    </article>
  );
}

export default async function SupplierDashboardPage() {
  const filteredCards = (await getSupplierDashboardData()).sourcingOpportunities.filter((item) => item.statusLabel === "Open" || item.statusLabel === "Closed");

  const totalMatches = filteredCards.length;
  const newCount = filteredCards.filter((item) => item.statusLabel === "Open").length;
  const urgentCount = filteredCards.filter((item) => item.statusLabel === "Open").length;
  let data = buildFallbackDashboardData();
  let hasLoadError = false;

  try {
    data = await getSupplierDashboardData();
  } catch (error) {
    hasLoadError = true;
    console.error("Failed to load supplier sourcing board data:", error);
  }

  return (
    <main className="-m-6 min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-[#DCE5F1] bg-white">
        <div className="flex items-center px-[18px] py-[15px] text-[14px]">
          <span className="font-normal text-[#A5AEBB]">KaSupply</span>
          <ChevronRight className="mx-[8px] h-[14px] w-[14px] text-[#B6BEC9]" />
          <span className="font-semibold text-[#2B4368]">Sourcing Board</span>
        </div>
      </header>

      <div className="px-[24px] py-[24px] md:px-[32px]">
        <div className="mb-[24px]">
          <h1 className="text-[23px] font-semibold text-[#1E3A5F]">Sourcing Board</h1>
          <p className="mt-[2px] text-[16px] text-[#94A3B8]">
            {filteredCards.length} matches with buyers
          </p>
        </div>

        <section className="grid gap-[20px] md:grid-cols-4">
          {[
            ["TOTAL MATCHES", totalMatches, "#A855F7"],
            ["NEW", newCount, "#2563EB"],
            ["URGENT", urgentCount, "#FF7A1A"],
          ].map(([label, value, accent]) => (
            <div
              key={String(label)}
              className="rounded-[22px] border border-[#EDF1F6] border-l-[4px] bg-white px-[24px] py-[22px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              style={{ borderLeftColor: String(accent) }}
            >
              <p className="text-[13px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">
                {label}
              </p>
              <p className="mt-[16px] text-[34px] font-semibold leading-none text-[#27344C]">
                {value}
              </p>
            </div>
          ))}
        </section>

        {hasLoadError ? (
          <section className="mt-[16px] rounded-[16px] border border-[#F6D5C7] bg-[#FFF7F2] px-[16px] py-[12px] text-[13px] text-[#A45A38]">
            The sourcing board is available again, but some live supplier data could not be loaded right now.
          </section>
        ) : null}

        <section className="mt-[20px] space-y-[18px]">
          {data.sourcingOpportunities.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#D8E1ED] bg-white px-[24px] py-[44px] text-center text-[14px] text-[#8A94A6] shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              No sourcing matches are visible right now.
            </div>
          ) : (
            data.sourcingOpportunities.map((item) => (
              <SourcingCard key={item.matchId} item={item} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
