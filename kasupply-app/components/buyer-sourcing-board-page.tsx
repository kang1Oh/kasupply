"use client";

import Link from "next/link";
import { useState } from "react";
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
    <svg viewBox="0 0 20 20" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
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
  },
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

  return `\u20b1${amount} / ${unit}`;
}

function isPastDue(deadline: string) {
  const parsed = new Date(`${deadline}T23:59:59`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
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

function getRequestState(request: BuyerRfqListItem): {
  key: Exclude<FilterKey, "all">;
  label: string;
  badgeClassName: string;
  dotClassName: string;
} {
  const normalizedStatus = request.status.toLowerCase();

  if (normalizedStatus === "cancelled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      badgeClassName: "bg-[#faecee] text-[#b35f68]",
      dotClassName: "bg-[#c7727d]",
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
      badgeClassName: "bg-[#eef0f4] text-[#5e697a]",
      dotClassName: "bg-[#667285]",
    };
  }

  return {
    key: "open",
    label: "Open",
    badgeClassName: "bg-[#edf8ef] text-[#2c8b4b]",
    dotClassName: "bg-[#2c8b4b]",
  };
}

function getSortTimestamp(request: BuyerRfqListItem, sortBy: SortOption) {
  if (sortBy === "need-by") {
    return new Date(request.preferredDeliveryDate ?? request.deadline).getTime();
  }

  return new Date(request.createdAt).getTime();
}

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-[16px] py-[14px]">
      <p className="text-[14px] font-normal uppercase tracking-[0.03em] text-[#A7AFBC]">
        {label}
      </p>
      <p className="mt-[3px] text-[16px] font-[500] leading-[1.35] text-[#394150]">
        {value}
      </p>
    </div>
  );
}

function QuotationsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[23px] w-[23px]" aria-hidden="true">
      <path
        d="M5 5.75h10A1.25 1.25 0 0 1 16.25 7v5.5A1.25 1.25 0 0 1 15 13.75H9.85L6.75 16.1v-2.35H5A1.25 1.25 0 0 1 3.75 12.5V7A1.25 1.25 0 0 1 5 5.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BuyerSourcingBoardPage({
  buyerBusinessName,
  requests,
}: BuyerSourcingBoardPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const requestStates = requests.map((request) => ({
    rfqId: request.rfqId,
    state: getRequestState(request),
  }));

  const stateById = new Map(
    requestStates.map((entry) => [entry.rfqId, entry.state] as const),
  );

  const filterCounts = requestStates.reduce(
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
    },
  );

  const visibleRequests = requests
    .filter((request) => {
      if (selectedFilter === "all") {
        return true;
      }

      return stateById.get(request.rfqId)?.key === selectedFilter;
    })
    .sort((left, right) => {
      if (sortBy === "oldest" || sortBy === "need-by") {
        return getSortTimestamp(left, sortBy) - getSortTimestamp(right, sortBy);
      }

      return getSortTimestamp(right, sortBy) - getSortTimestamp(left, sortBy);
    });

  return (
    <main className="w-full pb-[18px] pt-1">
      <section className="flex flex-col gap-[20px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[23px] font-semibold text-[#1E3A5F]">
              Sourcing Board
            </h1>
            <p className="mt-[2px] text-[16px] text-[#94A3B8]">
              Your sourcing requests and supplier quotations
            </p>
          </div>

          <Link
            href="/buyer/sourcing-board/new"
            className="inline-flex h-[40px] items-center justify-center self-start rounded-[8px] bg-[#2F6BFF] px-[18px] text-[15px] font-medium text-white transition hover:bg-[#255ae0]"
          >
            + Post Request
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-[8px]">
            {FILTER_OPTIONS.map((option) => {
              const isActive = selectedFilter === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedFilter(option.key)}
                  className={`inline-flex h-[32px] items-center gap-[7px] rounded-full border px-[16px] text-[15px] font-[500] leading-none transition ${
                    isActive
                      ? "border-[#223F68] bg-[#223F68] text-white"
                      : "border-[#C9D2DE] bg-white text-[#334155] hover:border-[#B8C4D4] hover:text-[#223654]"
                  }`}
                >
                  <span>{option.label}</span>
                  {option.key === "all" ? (
                    <span
                      className={`inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[10px] font-semibold ${
                        isActive
                          ? "bg-white text-[#223F68]"
                          : "bg-[#E7EDF6] text-[#6B7D95]"
                      }`}
                    >
                      {filterCounts.all}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-[10px] self-start">
            <span className="text-[15px] font-normal text-[#94A3B8]">Sort by</span>
            <label className="relative inline-flex h-[38px] min-w-[136px] items-center rounded-[10px] border border-[#D9E2EE] bg-white px-[14px] pr-[34px] text-[#59677A] shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="w-full appearance-none bg-transparent pr-2 text-[15px] font-medium text-[#4E5B6F] outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-[10px] text-[#b1b7c3]">
                <ChevronDownIcon />
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-[18px] space-y-[18px]">
        {requests.length === 0 ? (
          <div className="rounded-[18px] border border-[#e4e8ef] bg-white px-8 py-12 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-[22px] font-semibold text-[#304668]">
              No sourcing requests yet
            </h2>
            <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-6 text-[#9aa4b3]">
              Post a sourcing request to notify matched suppliers and start receiving
              quotations from the marketplace.
            </p>
            <Link
              href="/buyer/sourcing-board/new"
              className="mt-5 inline-flex h-[40px] items-center justify-center rounded-[10px] bg-[#2f6fec] px-[18px] text-[15px] font-medium text-white transition hover:bg-[#275fd0]"
            >
              + Post Request
            </Link>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#d5dde8] bg-white px-8 py-10 text-center shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <h2 className="text-[19px] font-semibold text-[#304668]">
              No requests in this view
            </h2>
            <p className="mt-2 text-[14px] text-[#9aa4b3]">
              Try another status filter to see the rest of your sourcing requests.
            </p>
          </div>
        ) : (
          visibleRequests.map((request) => {
            const state = stateById.get(request.rfqId) ?? getRequestState(request);

            return (
              <article
                key={request.rfqId}
                className="overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white px-[24px] py-[18px] shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-[14px]">
                      <div className="flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-full bg-[#FFC3D0] text-[22px] font-[500] leading-none text-[#CB5C7B]">
                        {getInitials(buyerBusinessName)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-[500] leading-none text-[#455060]">
                          {buyerBusinessName}
                        </p>
                        <div className="mt-[6px] flex flex-wrap items-center gap-[6px] text-[14px] text-[#A3ACB8]">
                          <span className="rounded-[5px] border border-[#D9DDD8] bg-[#EAEAE8] px-[6px] py-[2px] text-[14px] leading-none text-[#646764]">
                            {request.category?.categoryName ?? "General sourcing"}
                          </span>
                          <span>&bull;</span>
                          <span className="text-[14px]">
                            {formatDate(request.createdAt, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <h2 className="mt-[10px] text-[17px] font-[500] leading-[1.35] text-[#364152]">
                          {request.productName}
                        </h2>
                        <p className="mt-[3px] max-w-[920px] text-[15px] font-[300] leading-[1.45] text-[#7D8794]">
                          {getDescription(request)}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-[2px]">
                      <span
                        className={`inline-flex h-[30px] items-center gap-[8px] rounded-full px-[12px] text-[14px] font-medium leading-none ${state.badgeClassName}`}
                      >
                        <span
                          className={`inline-flex h-[8px] w-[8px] rounded-full ${state.dotClassName}`}
                        />
                        {state.label}
                      </span>
                    </div>
                  </div>

                  <div className="pl-0 lg:pl-[69px]">
                    <div className="overflow-hidden rounded-[12px] border border-[#E4E7EB] bg-[#F3F4F6]">
                      <div className="grid md:grid-cols-2 xl:grid-cols-4">
                        <MetricCell
                          label="Quantity"
                          value={formatQuantity(request.quantity, request.unit)}
                        />
                        <MetricCell
                          label="Budget"
                          value={formatBudget(request.targetPricePerUnit, request.unit)}
                        />
                        <MetricCell
                          label="Needed By"
                          value={formatDate(request.preferredDeliveryDate)}
                        />
                        <MetricCell
                          label="Location"
                          value={request.deliveryLocation || "To be confirmed"}
                        />
                      </div>
                    </div>

                    <div className="mt-[14px] flex flex-col gap-[10px] border-t border-[#E9EDF3] pt-[12px] sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-[8px] text-[14px] font-normal text-[#B0B7C3]">
                        <QuotationsIcon />
                        <span>
                          {request.quotationCount} quotation
                          {request.quotationCount === 1 ? "" : "s"} received
                        </span>
                      </div>

                      <Link
                        href={`/buyer/sourcing-board/${request.rfqId}`}
                        className="inline-flex items-center gap-[4px] text-[16px] font-medium text-[#3E70F5] transition hover:text-[#2f62e8]"
                      >
                        <span>View</span>
                        <span className="text-[16px] leading-none">&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
