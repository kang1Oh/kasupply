"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BuyerRfqListItem } from "@/lib/buyer/rfq-workflows";

type BuyerSourcingBoardPageProps = {
  buyerBusinessName: string;
  requests: BuyerRfqListItem[];
};

type FilterKey = "all" | "open" | "closed" | "cancelled";
type SortOption = "newest" | "oldest" | "need-by";

const FILTER_OPTIONS: Array<{
  key: FilterKey;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
}> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "need-by", label: "Need By" },
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

function MessageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.75 5.5h10.5a1.75 1.75 0 0 1 1.75 1.75v6a1.75 1.75 0 0 1-1.75 1.75H9l-3.75 2v-2H4.75A1.75 1.75 0 0 1 3 13.25v-6A1.75 1.75 0 0 1 4.75 5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.5 10h11m-4-4 4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
) {
  if (!value) {
    return "-";
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

function formatBudget(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) {
    return "Open budget";
  }

  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `P${amount} / ${unit}`;
}

function isPastDue(deadline: string) {
  const parsed = new Date(`${deadline}T23:59:59`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
}

function getRequestState(request: BuyerRfqListItem): {
  key: Exclude<FilterKey, "all">;
  label: string;
  className: string;
} {
  const normalizedStatus = request.status.toLowerCase();

  if (normalizedStatus === "cancelled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      className: "bg-[#f5eaee] text-[#a15769]",
    };
  }

  if (
    normalizedStatus === "closed" ||
    normalizedStatus === "fulfilled" ||
    isPastDue(request.deadline)
  ) {
    return {
      key: "closed",
      label: "Closed",
      className: "bg-[#eef2f7] text-[#536275]",
    };
  }

  return {
    key: "open",
    label: "Open",
    className: "bg-[#edf8ef] text-[#2f7a45]",
  };
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "SB";
}

function getDescription(request: BuyerRfqListItem) {
  return request.specifications || "No additional specifications provided yet.";
}

function getNeedByValue(request: BuyerRfqListItem) {
  return formatDate(request.preferredDeliveryDate ?? null);
}

function getSortTimestamp(request: BuyerRfqListItem, sortBy: SortOption) {
  if (sortBy === "need-by") {
    return new Date(request.preferredDeliveryDate ?? request.deadline).getTime();
  }

  return new Date(request.createdAt).getTime();
}

function SourcingMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-[#223654]">{value}</p>
    </div>
  );
}

export function BuyerSourcingBoardPage({
  buyerBusinessName,
  requests,
}: BuyerSourcingBoardPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const requestStates = useMemo(
    () =>
      requests.map((request) => ({
        rfqId: request.rfqId,
        state: getRequestState(request),
      })),
    [requests]
  );

  const stateById = useMemo(
    () => new Map(requestStates.map((entry) => [entry.rfqId, entry.state] as const)),
    [requestStates]
  );

  const filterCounts = useMemo(
    () =>
      requestStates.reduce(
        (counts, entry) => {
          counts.all += 1;
          counts[entry.state.key] += 1;
          return counts;
        },
        {
          all: 0,
          open: 0,
          closed: 0,
          cancelled: 0,
        }
      ),
    [requestStates]
  );

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (selectedFilter === "all") {
        return true;
      }

      return stateById.get(request.rfqId)?.key === selectedFilter;
    });

    const sorted = [...filtered];

    sorted.sort((left, right) => {
      if (sortBy === "oldest") {
        return getSortTimestamp(left, sortBy) - getSortTimestamp(right, sortBy);
      }

      if (sortBy === "need-by") {
        return getSortTimestamp(left, sortBy) - getSortTimestamp(right, sortBy);
      }

      return getSortTimestamp(right, sortBy) - getSortTimestamp(left, sortBy);
    });

    return sorted;
  }, [requests, selectedFilter, sortBy, stateById]);

  return (
    <main className="mx-auto max-w-[1120px] space-y-5 px-6 py-8 pb-2">
      <section className="rounded-[28px] border border-[#e8edf5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
                Sourcing Board
              </h1>
              <p className="mt-1 text-[15px] text-[#8a96a8]">
                Your sourcing requests and supplier quotations.
              </p>
            </div>

            <Link
              href="/buyer/sourcing-board/new"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2f6fed] px-5 text-[14px] font-semibold text-white transition hover:bg-[#255fd0]"
            >
              + Post Request
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isActive = selectedFilter === option.key;
                const showCount = option.key === "all";

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedFilter(option.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                      isActive
                        ? "border-[#294773] bg-[#294773] text-white"
                        : "border-[#d9e1ec] bg-white text-[#526176] hover:border-[#c5d0df] hover:text-[#223654]"
                    }`}
                  >
                    <span>{option.label}</span>
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

      {requests.length === 0 ? (
        <section className="rounded-[24px] border border-[#e8edf5] bg-white px-6 py-10 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-[20px] font-semibold text-[#223654]">
            No sourcing requests yet
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-[14px] leading-6 text-[#8a96a8]">
            Post a sourcing request to notify matched suppliers and start receiving
            quotations from across the platform.
          </p>
          <Link
            href="/buyer/sourcing-board/new"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
          >
            Post Your First Request
          </Link>
        </section>
      ) : visibleRequests.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#d7e1ec] bg-white px-6 py-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.03)]">
          <h2 className="text-[18px] font-semibold text-[#223654]">
            No requests in this view
          </h2>
          <p className="mt-2 text-[14px] text-[#8a96a8]">
            Try another filter to see the rest of your sourcing requests.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7e0eb] bg-white px-4 text-[14px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
          >
            Show all requests
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {visibleRequests.map((request) => {
            const state = stateById.get(request.rfqId) ?? getRequestState(request);

            return (
              <section
                key={request.rfqId}
                className="overflow-hidden rounded-[22px] border border-[#e8edf5] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#ffe8ef] text-[18px] font-semibold text-[#c95073]">
                        {getInitials(buyerBusinessName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[18px] font-semibold text-[#223654]">
                            {buyerBusinessName}
                          </p>
                          <p className="text-[13px] text-[#97a3b4]">
                            {request.category?.categoryName ?? "General sourcing"}
                            <span className="mx-1.5 text-[#c1c8d2]">&bull;</span>
                            {formatDate(request.createdAt, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>

                        <h2 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[#223654]">
                          {request.productName}
                        </h2>

                        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#8a96a8]">
                          {getDescription(request)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ${state.className}`}
                      >
                        <span className="mr-1.5 text-[10px] leading-none">&bull;</span>
                        {state.label}
                      </span>

                      <p className="text-[12px] text-[#a1acbc]">
                        RFQ #{request.rfqId}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SourcingMetric
                      label="Quantity"
                      value={formatQuantity(request.quantity, request.unit)}
                    />
                    <SourcingMetric
                      label="Budget"
                      value={formatBudget(request.targetPricePerUnit, request.unit)}
                    />
                    <SourcingMetric
                      label="Needed By"
                      value={getNeedByValue(request)}
                    />
                    <SourcingMetric
                      label="Location"
                      value={request.deliveryLocation || "To be confirmed"}
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[#edf2f7] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex items-center gap-2 text-[13px] text-[#9aa5b6]">
                      <MessageIcon />
                      <span>
                        {request.quotationCount} quotation
                        {request.quotationCount === 1 ? "" : "s"} received
                      </span>
                    </div>

                    <Link
                      href={`/buyer/sourcing-board/${request.rfqId}`}
                      className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#2f6fed] transition hover:text-[#255fd0]"
                    >
                      View Details
                      <ArrowRightIcon />
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
