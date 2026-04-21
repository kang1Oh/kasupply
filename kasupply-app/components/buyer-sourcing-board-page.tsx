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

function MessageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" aria-hidden="true">
      <path
        d="M4.75 5.25h10.5A1.75 1.75 0 0 1 17 7v5.75a1.75 1.75 0 0 1-1.75 1.75H9.35L5.5 16.55V14.5H4.75A1.75 1.75 0 0 1 3 12.75V7a1.75 1.75 0 0 1 1.75-1.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
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

  return `P${amount} / ${unit}`;
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
    <div className="min-w-0 px-[18px] py-[13px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#a3acb8]">
        {label}
      </p>
      <p className="mt-[5px] text-[14px] font-semibold leading-[1.35] text-[#374151]">
        {value}
      </p>
    </div>
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
    <main className="mx-auto max-w-[1120px] px-6 py-9">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[37px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#27456f]">
              Sourcing Board
            </h1>
            <p className="mt-[6px] text-[15px] font-normal text-[#a0aaba]">
              Your sourcing requests and supplier quotations
            </p>
          </div>

          <Link
            href="/buyer/sourcing-board/new"
            className="inline-flex h-[40px] items-center justify-center self-start rounded-[10px] bg-[#2f6fec] px-[18px] text-[15px] font-medium text-white transition hover:bg-[#275fd0]"
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
                  className={`inline-flex h-[33px] items-center gap-[7px] rounded-full border px-[16px] text-[14px] font-medium transition ${
                    isActive
                      ? "border-[#294773] bg-[#294773] text-white"
                      : "border-[#ccd6e2] bg-white text-[#2f3f52] hover:border-[#b9c6d7]"
                  }`}
                >
                  <span>{option.label}</span>
                  {option.key === "all" ? (
                    <span
                      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10px] font-semibold ${
                        isActive
                          ? "bg-white text-[#294773]"
                          : "bg-[#eef2f7] text-[#536275]"
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
            <span className="text-[13px] text-[#a5aebc]">Sort by</span>
            <label className="relative inline-flex h-[34px] items-center rounded-[10px] border border-[#e0e6ee] bg-white px-[12px] pr-[32px] text-[13px] text-[#556273] shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="appearance-none bg-transparent pr-2 font-medium outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-[12px] text-[#b0b8c5]">
                <ChevronDownIcon />
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-5 space-y-[12px]">
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
                className="overflow-hidden rounded-[18px] border border-[#e4e8ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="px-[18px] py-[16px] sm:px-[18px]">
                  <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-[12px]">
                      <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#ffc3d0] text-[18px] font-medium text-[#cb5c7b]">
                        {getInitials(buyerBusinessName)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-[#394150]">
                          {buyerBusinessName}
                        </p>

                        <div className="mt-[3px] flex flex-wrap items-center gap-[7px] text-[12px] text-[#a0a8b4]">
                          <span className="inline-flex rounded-[5px] border border-[#e6ebf1] bg-[#f8f9fb] px-[6px] py-[2px] text-[11px] font-medium text-[#7d8794]">
                            {request.category?.categoryName ?? "General sourcing"}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {formatDate(request.createdAt, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex h-[28px] items-center self-start rounded-full px-[10px] text-[13px] font-medium ${state.badgeClassName}`}
                    >
                      <span
                        className={`mr-[7px] inline-flex h-[7px] w-[7px] rounded-full ${state.dotClassName}`}
                      />
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-[2px] pl-0 lg:pl-[56px]">
                    <h2 className="text-[17px] font-semibold leading-[1.4] text-[#364152]">
                      {request.productName}
                    </h2>

                    <p className="[display:-webkit-box] overflow-hidden text-[15px] leading-[1.48] text-[#7d8794] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {getDescription(request)}
                    </p>

                    <div className="mt-[12px] overflow-hidden rounded-[12px] border border-[#e4e7eb] bg-[#f3f4f6]">
                      <div className="grid md:grid-cols-2 xl:grid-cols-4">
                        <MetricCell
                          label="Quantity"
                          value={formatQuantity(request.quantity, request.unit)}
                        />
                        <MetricCell
                          label="Budget"
                          value={formatBudget(
                            request.targetPricePerUnit,
                            request.unit,
                          )}
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

                    <div className="mt-[10px] flex flex-col gap-[10px] border-t border-[#edf1f5] pt-[12px] sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-[7px] text-[13px] text-[#adb4bf]">
                        <MessageIcon />
                        <span>
                          {request.quotationCount} quotation
                          {request.quotationCount === 1 ? "" : "s"} received
                        </span>
                      </div>

                      <Link
                        href={`/buyer/sourcing-board/${request.rfqId}`}
                        className="inline-flex items-center justify-end text-[15px] font-medium text-[#2f6fec] transition hover:text-[#275fd0]"
                      >
                        View &rarr;
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
