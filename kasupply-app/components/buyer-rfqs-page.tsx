"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BuyerRfqListItem } from "@/lib/buyer/rfq-workflows";

type BuyerRfqsPageProps = {
  rfqs: BuyerRfqListItem[];
};

type DisplayStatusKey = "confirmed" | "pending" | "responded" | "closed";
type SortOption = "newest" | "oldest" | "delivery" | "quantity";

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

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
}> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "delivery", label: "Nearest Delivery" },
  { value: "quantity", label: "Highest Quantity" },
];

const CARD_ACCENTS = [
  { panelClassName: "bg-[#edf8ef] text-[#2f7a45]" },
  { panelClassName: "bg-[#e8f1ff] text-[#416eb7]" },
  { panelClassName: "bg-[#fff1e4] text-[#d8762f]" },
  { panelClassName: "bg-[#ffe8ef] text-[#c95073]" },
];

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "RF";
}

function getAvatarFallback(value: string | null | undefined) {
  return getInitials(String(value || "").trim() || "Supplier");
}

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

function formatQuantity(quantity: number, unit: string) {
  return `${new Intl.NumberFormat("en-PH").format(quantity)} ${unit}`;
}

function formatTargetPrice(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) {
    return "Open budget";
  }

  const hasDecimals = !Number.isInteger(value);
  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);

  return `P${amount} / ${unit}`;
}

function toTitleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPastDue(deadline: string) {
  const parsed = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
}

function hasSupplierReply(rfq: BuyerRfqListItem) {
  return rfq.engagements.some(
    (engagement) => engagement.status.toLowerCase() !== "viewing"
  );
}

function getDisplayStatus(rfq: BuyerRfqListItem): {
  key: DisplayStatusKey;
  label: string;
  className: string;
} {
  const normalizedStatus = rfq.status.toLowerCase();

  if (normalizedStatus === "fulfilled") {
    return {
      key: "confirmed",
      label: "Confirmed",
      className: "bg-[#edf8ef] text-[#2f7a45]",
    };
  }

  if (
    normalizedStatus === "closed" ||
    normalizedStatus === "cancelled" ||
    isPastDue(rfq.deadline)
  ) {
    return {
      key: "closed",
      label: "Closed",
      className: "bg-[#eef2f7] text-[#536275]",
    };
  }

  if (hasSupplierReply(rfq)) {
    return {
      key: "responded",
      label: "Responded",
      className: "bg-[#e9efff] text-[#4269d0]",
    };
  }

  return {
    key: "pending",
    label: "Pending",
    className: "bg-[#fff1e5] text-[#f08b38]",
  };
}

function getDeliveryLabel(rfq: BuyerRfqListItem) {
  if (rfq.preferredDeliveryDate) {
    return "Delivery by";
  }

  return "Deadline";
}

function getDeliveryValue(rfq: BuyerRfqListItem) {
  return formatDate(rfq.preferredDeliveryDate ?? rfq.deadline);
}

function getReferenceCode(rfq: BuyerRfqListItem) {
  const createdDate = new Date(rfq.createdAt);
  const year = Number.isNaN(createdDate.getTime())
    ? new Date().getFullYear()
    : createdDate.getFullYear();

  return `RFQ-${year}-${String(rfq.rfqId).padStart(3, "0")}`;
}

function getContextLine(rfq: BuyerRfqListItem) {
  if (rfq.supplierPreview?.supplierName) {
    return rfq.supplierPreview.supplierName;
  }

  if (rfq.engagements.length === 1) {
    return rfq.engagements[0].supplierName;
  }

  if (rfq.engagements.length > 1) {
    return `${rfq.engagements.length} supplier engagements`;
  }

  if (rfq.visibility === "public" && rfq.visibleMatchesCount > 0) {
    return `${rfq.visibleMatchesCount} visible supplier matches`;
  }

  if (rfq.category?.categoryName) {
    return rfq.category.categoryName;
  }

  return rfq.visibility === "public"
    ? "Public sourcing request"
    : "Restricted supplier request";
}

function getMetaTags(rfq: BuyerRfqListItem) {
  const tags = [
    toTitleCase(rfq.visibility),
    rfq.category?.categoryName,
    rfq.engagements.length > 0
      ? `${rfq.engagements.length} engagement${rfq.engagements.length === 1 ? "" : "s"}`
      : rfq.visibleMatchesCount > 0
        ? `${rfq.visibleMatchesCount} match${rfq.visibleMatchesCount === 1 ? "" : "es"}`
        : "Awaiting response",
  ];

  return tags.filter(Boolean) as string[];
}

function getSortDateValue(rfq: BuyerRfqListItem) {
  return new Date(rfq.preferredDeliveryDate ?? rfq.deadline).getTime();
}

function getRfqHref(rfq: BuyerRfqListItem) {
  return rfq.rfqType === "sourcing_board"
    ? `/buyer/sourcing-board/${rfq.rfqId}`
    : `/buyer/rfqs/${rfq.rfqId}`;
}

export function BuyerRfqsPage({ rfqs }: BuyerRfqsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<DisplayStatusKey | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const rfqStatuses = useMemo(
    () =>
      rfqs.map((rfq) => ({
        rfqId: rfq.rfqId,
        status: getDisplayStatus(rfq),
      })),
    [rfqs]
  );

  const statusById = useMemo(
    () => new Map(rfqStatuses.map((entry) => [entry.rfqId, entry.status] as const)),
    [rfqStatuses]
  );

  const filterCounts = useMemo(() => {
    return rfqStatuses.reduce(
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
      }
    );
  }, [rfqStatuses]);

  const visibleRfqs = useMemo(() => {
    const filtered = rfqs.filter((rfq) => {
      if (selectedFilter === "all") {
        return true;
      }

      return statusById.get(rfq.rfqId)?.key === selectedFilter;
    });

    const sorted = [...filtered];

    sorted.sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }

      if (sortBy === "delivery") {
        return getSortDateValue(left) - getSortDateValue(right);
      }

      if (sortBy === "quantity") {
        return right.quantity - left.quantity;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    return sorted;
  }, [rfqs, selectedFilter, sortBy, statusById]);

  return (
    <main className="space-y-5 pb-2">
      <section className="rounded-[28px] border border-[#e8edf5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
              My RFQs
            </h1>
            <p className="mt-1 text-[15px] text-[#8a96a8]">
              Track and manage all your requests for quotation.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const isActive = selectedFilter === filter.key;
                const showCount = filter.key === "all";

                return (
                  <button
                    key={filter.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                      isActive
                        ? "border-[#294773] bg-[#294773] text-white"
                        : "border-[#d9e1ec] bg-white text-[#526176] hover:border-[#c5d0df] hover:text-[#223654]"
                    }`}
                  >
                    <span>{filter.label}</span>
                    {showCount ? (
                      <span
                        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                          isActive
                            ? "bg-white/18 text-white"
                            : "bg-[#eef3f8] text-[#526176]"
                        }`}
                      >
                        {filterCounts.all}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label className="inline-flex h-11 items-center gap-3 self-start rounded-[12px] border border-[#dce4ee] bg-white px-4 text-[13px] text-[#98a3b4] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <span>Sort by</span>
              <span className="relative inline-flex items-center text-[#4c5d73]">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="appearance-none bg-transparent pr-5 font-medium outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-0 text-[#a0abba]">
                  <ChevronDownIcon />
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {rfqs.length === 0 ? (
        <section className="rounded-[24px] border border-[#e8edf5] bg-white px-6 py-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-[20px] font-semibold text-[#223654]">No RFQs yet</h2>
          <p className="mx-auto mt-2 max-w-[540px] text-[14px] leading-6 text-[#8a96a8]">
            Start from a supplier product card with Send RFQ, or post a public
            sourcing request from the sourcing board.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/buyer/search"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
            >
              Browse Suppliers
            </Link>
            <Link
              href="/buyer/sourcing-board"
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d7e0eb] bg-white px-5 text-[14px] font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
            >
              Open Sourcing Board
            </Link>
          </div>
        </section>
      ) : visibleRfqs.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#d7e1ec] bg-white px-6 py-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.03)]">
          <h2 className="text-[18px] font-semibold text-[#223654]">
            No RFQs in this view
          </h2>
          <p className="mt-2 text-[14px] text-[#8a96a8]">
            Try another status filter to see more of your requests.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7e0eb] bg-white px-4 text-[14px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
          >
            Show all RFQs
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {visibleRfqs.map((rfq) => {
            const displayStatus = statusById.get(rfq.rfqId) ?? getDisplayStatus(rfq);
            const accent = CARD_ACCENTS[rfq.rfqId % CARD_ACCENTS.length];
            const metaTags = getMetaTags(rfq);
            const supplierAvatarUrl = rfq.supplierPreview?.avatarUrl ?? null;
            const supplierName = rfq.supplierPreview?.supplierName ?? getContextLine(rfq);

            return (
              <Link
                key={rfq.rfqId}
                href={getRfqHref(rfq)}
                aria-label={`Open RFQ ${rfq.productName}`}
                className="group block cursor-pointer rounded-[22px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#294773] focus-visible:ring-offset-2"
              >
                <section className="overflow-hidden rounded-[22px] border border-[#e8edf5] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      {supplierAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={supplierAvatarUrl}
                          alt={`${supplierName} avatar`}
                          className="h-14 w-14 shrink-0 rounded-[14px] border border-[#e6edf6] object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[20px] font-semibold ${accent.panelClassName}`}
                        >
                          {getAvatarFallback(supplierName)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#223654] transition group-hover:text-[#294773]">
                          {rfq.productName}
                        </div>

                        <p className="mt-1 text-[15px] text-[#97a3b4]">
                          {getContextLine(rfq)}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#b0bac7]">
                          {metaTags.map((tag) => (
                            <span key={`${rfq.rfqId}-${tag}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 text-left lg:items-end lg:text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ${displayStatus.className}`}
                      >
                        <span className="mr-1.5 text-[11px] leading-none">&bull;</span>
                        {displayStatus.label}
                      </span>

                      <div className="text-[13px] text-[#a1acbc]">
                        <p className="font-medium">{getReferenceCode(rfq)}</p>
                        <p>{formatDate(rfq.createdAt, { month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-[#edf2f7] px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
                        Quantity
                      </p>
                      <p className="mt-1 text-[18px] font-semibold text-[#223654]">
                        {formatQuantity(rfq.quantity, rfq.unit)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
                        Target Price
                      </p>
                      <p className="mt-1 text-[18px] font-semibold text-[#223654]">
                        {formatTargetPrice(rfq.targetPricePerUnit, rfq.unit)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
                        {getDeliveryLabel(rfq)}
                      </p>
                      <p className="mt-1 text-[18px] font-semibold text-[#223654]">
                        {getDeliveryValue(rfq)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
                        RFQ Deadline
                      </p>
                      <p className="mt-1 text-[18px] font-semibold text-[#223654]">
                        {formatDate(rfq.deadline)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
                        Location
                      </p>
                      <p className="mt-1 text-[18px] font-semibold text-[#223654]">
                        {rfq.deliveryLocation || "To be shared"}
                      </p>
                    </div>
                  </div>
                </section>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
