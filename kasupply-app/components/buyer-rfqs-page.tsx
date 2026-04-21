"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BuyerRfqListItem } from "@/lib/buyer/rfq-workflows";

type BuyerRfqsPageProps = {
  rfqs: BuyerRfqListItem[];
};

type DisplayStatusKey = "confirmed" | "pending" | "responded" | "closed";
type SortOption = "newest" | "oldest";

const STATUS_FILTERS: Array<{
  key: DisplayStatusKey | "all";
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "responded", label: "Responded" },
  { key: "closed", label: "Closed" },
];

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatQuantity(quantity: number, unit: string) {
  return `${new Intl.NumberFormat("en-PH").format(quantity)} ${unit}`;
}

function formatTargetPrice(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) {
    return "Open budget";
  }

  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `\u20b1${amount} / ${unit}`;
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "RF";
}

function getReferenceCode(rfq: BuyerRfqListItem) {
  const createdDate = new Date(rfq.createdAt);
  const year = Number.isNaN(createdDate.getTime())
    ? new Date().getFullYear()
    : createdDate.getFullYear();

  return `RFQ-${year}-${String(rfq.rfqId).padStart(3, "0")}`;
}

function getPrimarySupplierName(rfq: BuyerRfqListItem) {
  return (
    rfq.supplierPreview?.supplierName ??
    rfq.engagements[0]?.supplierName ??
    "Awaiting supplier"
  );
}

function hasSupplierReply(rfq: BuyerRfqListItem) {
  return (
    rfq.quotationCount > 0 ||
    rfq.engagements.some((engagement) => {
      const normalized = engagement.status.toLowerCase();
      return !["viewing", "pending"].includes(normalized);
    })
  );
}

function getDisplayStatus(rfq: BuyerRfqListItem): {
  key: DisplayStatusKey;
  label: string;
  badgeClassName: string;
  dotClassName: string;
} {
  const normalizedStatus = rfq.status.toLowerCase();
  const hasAcceptedQuote = rfq.engagements.some(
    (engagement) => engagement.status.toLowerCase() === "accepted",
  );
  const hasSupplierResponse = hasSupplierReply(rfq);
  const hasPurchaseOrderSignal = rfq.hasPurchaseOrder || normalizedStatus === "closed";

  if (normalizedStatus === "cancelled" || hasPurchaseOrderSignal) {
    return {
      key: "closed",
      label: "Closed",
      badgeClassName: "bg-[#eef1f5] text-[#5b6472]",
      dotClassName: "bg-[#5b6472]",
    };
  }

  if (normalizedStatus === "fulfilled" || hasAcceptedQuote) {
    return {
      key: "confirmed",
      label: "Confirmed",
      badgeClassName: "bg-[#edf9f1] text-[#2d9b63]",
      dotClassName: "bg-[#2d9b63]",
    };
  }

  if (hasSupplierResponse) {
    return {
      key: "responded",
      label: "Responded",
      badgeClassName: "bg-[#eaf0ff] text-[#4673f4]",
      dotClassName: "bg-[#4673f4]",
    };
  }

  return {
    key: "pending",
    label: "Pending",
    badgeClassName: "bg-[#fff1e7] text-[#f28b32]",
    dotClassName: "bg-[#f28b32]",
  };
}

function getAvatarClassName(index: number) {
  const palette = [
    "bg-[#eefaf3] text-[#4a9a70]",
    "bg-[#dceaff] text-[#45699f]",
    "bg-[#ffe9d9] text-[#ff7b33]",
    "bg-[#ffcfd9] text-[#c9577c]",
  ];

  return palette[index % palette.length];
}

export function BuyerRfqsPage({ rfqs }: BuyerRfqsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<DisplayStatusKey | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const rfqStatuses = useMemo(
    () =>
      rfqs.map((rfq) => ({
        rfqId: rfq.rfqId,
        status: getDisplayStatus(rfq),
      })),
    [rfqs],
  );

  const statusById = useMemo(
    () => new Map(rfqStatuses.map((entry) => [entry.rfqId, entry.status] as const)),
    [rfqStatuses],
  );

  const filterCounts = useMemo(
    () =>
      rfqStatuses.reduce(
        (counts, entry) => {
          counts.all += 1;
          counts[entry.status.key] += 1;
          return counts;
        },
        {
          all: 0,
          confirmed: 0,
          pending: 0,
          responded: 0,
          closed: 0,
        },
      ),
    [rfqStatuses],
  );

  const visibleRfqs = useMemo(() => {
    const filtered = rfqs.filter((rfq) => {
      if (selectedFilter === "all") {
        return true;
      }

      return statusById.get(rfq.rfqId)?.key === selectedFilter;
    });

    return [...filtered].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      return sortBy === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [rfqs, selectedFilter, sortBy, statusById]);

  return (
    <main className="mx-auto w-full max-w-[1040px] pb-5 pt-1">
      <section className="pb-5">
        <h1 className="text-[25px] font-semibold tracking-[-0.04em] text-[#1E3A5F]">
          My RFQs
        </h1>
        <p className="mt-1 text-[15px] font-normal leading-[1rem] text-[#a6adba]">
          Track and manage all your requests for quotation
        </p>
      </section>

      <section className="flex items-center justify-between gap-4 pb-5">
        <div className="flex flex-wrap items-center gap-[9px]">
          {STATUS_FILTERS.map((tab) => {
            const isActive = selectedFilter === tab.key;
            const count =
              tab.key === "all" ? filterCounts.all : tab.key ? filterCounts[tab.key] : 0;

            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setSelectedFilter(tab.key)}
                className={`inline-flex h-[30px] items-center rounded-full border px-[16px] text-[14px] font-medium leading-none transition ${
                  isActive
                    ? "border-[#213f69] bg-[#213f69] text-white"
                    : "border-[#cfd6e2] bg-white text-[#38495f] hover:border-[#c4cfdd]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.key === "all" ? (
                  <span className="ml-[10px] inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-white text-[9px] font-semibold leading-none text-[#213f69]">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-[10px] text-[14px] font-medium text-[#b1b7c3]">
          <span className="font-medium">Sort by</span>
          <span className="relative flex h-[34px] min-w-[116px] items-center rounded-[8px] border border-[#e3e7ee] bg-white px-[12px] text-[#59677a] shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full appearance-none bg-transparent pr-5 text-[14px] font-medium text-[#4e5b6f] outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <span className="pointer-events-none absolute right-[10px] text-[#b1b7c3]">
              <ChevronDownIcon />
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3.5">
        {visibleRfqs.map((rfq, index) => {
          const status = statusById.get(rfq.rfqId) ?? getDisplayStatus(rfq);
          const supplierName = getPrimarySupplierName(rfq);

          return (
            <Link
              key={rfq.rfqId}
              href={`/buyer/rfqs/${rfq.rfqId}`}
              className="group block rounded-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#213f69] focus-visible:ring-offset-2"
            >
              <article className="overflow-hidden rounded-[14px] border border-[#e8ebf0] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)] transition group-hover:border-[#dfe5ee] group-hover:shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4 px-[18px] py-[16px]">
                  <div className="flex min-w-0 items-start gap-[12px]">
                    <div
                      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[6px] text-[22px] font-medium leading-none ${getAvatarClassName(
                        index,
                      )}`}
                    >
                      <span className="text-[21px] font-medium">
                        {getInitials(supplierName)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-semibold leading-5 text-[#5f6a7b]">
                        {rfq.productName}
                      </p>
                      <p className="mt-[4px] truncate text-[14px] leading-5 text-[#a7afbc]">
                        {supplierName}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-[10px] py-[5px] text-[13px] font-medium leading-none ${status.badgeClassName}`}
                    >
                      <span
                        className={`h-[7px] w-[7px] rounded-full ${status.dotClassName}`}
                      />
                      {status.label}
                    </span>
                    <p className="mt-[4px] text-[13px] font-normal leading-5 text-[#b2b8c4]">
                      {getReferenceCode(rfq)} {"\u00b7"} {formatShortDate(rfq.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#edf0f4] px-[18px] py-[12px]">
                  <div className="grid grid-cols-4 gap-[18px]">
                    <div>
                      <p className="text-[13px] font-normal uppercase leading-[1.2] tracking-[0.02em] text-[#c0c5ce]">
                        Quantity
                      </p>
                      <p className="mt-[6px] text-[16px] font-medium leading-[1.2] text-[#444f60]">
                        {formatQuantity(rfq.quantity, rfq.unit)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-normal uppercase leading-[1.2] tracking-[0.02em] text-[#c0c5ce]">
                        Target Price
                      </p>
                      <p className="mt-[6px] text-[16px] font-medium leading-[1.2] text-[#444f60]">
                        {formatTargetPrice(rfq.targetPricePerUnit, rfq.unit)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-normal uppercase leading-[1.2] tracking-[0.02em] text-[#c0c5ce]">
                        Deliver By
                      </p>
                      <p className="mt-[6px] text-[16px] font-medium leading-[1.2] text-[#444f60]">
                        {formatDisplayDate(rfq.preferredDeliveryDate ?? rfq.deadline)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-normal uppercase leading-[1.2] tracking-[0.02em] text-[#c0c5ce]">
                        Location
                      </p>
                      <p className="mt-[6px] text-[16px] font-medium leading-[1.2] text-[#444f60]">
                        {rfq.deliveryLocation || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}

        {visibleRfqs.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#d9e0ea] bg-white px-6 py-10 text-center text-[14px] text-[#98a2b2]">
            No RFQs found for this filter.
          </div>
        ) : null}
      </section>
    </main>
  );
}
