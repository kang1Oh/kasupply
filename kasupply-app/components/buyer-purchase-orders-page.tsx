"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PurchaseOrderListItem = {
  poId: number;
  poNumber: string;
  productName: string;
  quantityLabel: string;
  totalAmount: number | null;
  status: string;
  createdAt: string | null;
  preferredDeliveryDate: string | null;
  leadTime: string | null;
  supplierInfo: {
    businessName: string;
  } | null;
};

type StatusFilter =
  | "all"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";
type SortOption = "newest" | "oldest";

const STATUS_FILTERS: Array<{
  key: StatusFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
}> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

const CARD_ACCENTS = [
  { panelClassName: "bg-[#eefaf3] text-[#4a9a70]" },
  { panelClassName: "bg-[#fff0ea] text-[#ff5a44]" },
  { panelClassName: "bg-[#e8efff] text-[#396cf0]" },
  { panelClassName: "bg-[#fff6b8] text-[#b89618]" },
  { panelClassName: "bg-[#f8d7ff] text-[#cc57df]" },
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

function getInitials(value: string | null | undefined) {
  const initials = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "PO";
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "To confirm";
  }

  const hasDecimals = !Number.isInteger(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  if (!value) {
    return "To confirm";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPurchaseOrderCode(order: PurchaseOrderListItem) {
  const createdAt = new Date(order.createdAt || "");
  const year = Number.isNaN(createdAt.getTime())
    ? new Date().getFullYear()
    : createdAt.getFullYear();

  return `PO-${year}-${String(order.poId).padStart(4, "0")}`;
}

function getEstimatedDeliveryLabel(order: PurchaseOrderListItem) {
  if (order.preferredDeliveryDate) {
    return formatDate(order.preferredDeliveryDate);
  }

  if (order.leadTime) {
    return order.leadTime;
  }

  return "To confirm";
}

function getSortTimestamp(order: PurchaseOrderListItem) {
  const createdTime = new Date(order.createdAt || "").getTime();
  return Number.isNaN(createdTime) ? 0 : createdTime;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        className: "border-[#d8e4ff] bg-[#eef4ff] text-[#3e70f5]",
        dotClassName: "bg-[#3e70f5]",
      };
    case "processing":
      return {
        label: "Processing",
        className: "border-[#ffe2cc] bg-[#fff2e7] text-[#f08b38]",
        dotClassName: "bg-[#f08b38]",
      };
    case "shipped":
      return {
        label: "Shipped",
        className: "border-[#ead7fb] bg-[#f7efff] text-[#a15bd3]",
        dotClassName: "bg-[#a15bd3]",
      };
    case "completed":
      return {
        label: "Completed",
        className: "border-[#d7f0dd] bg-[#edf8ef] text-[#2f8d4d]",
        dotClassName: "bg-[#2f8d4d]",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "border-[#dde3eb] bg-[#eef2f7] text-[#5b6472]",
        dotClassName: "bg-[#5b6472]",
      };
    default:
      return {
        label: toTitleCase(status),
        className: "border-[#dde3eb] bg-[#f8fafc] text-[#526176]",
        dotClassName: "bg-[#526176]",
      };
  }
}

function OrderMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[13px] font-normal uppercase tracking-[0.03em] text-[#BEC5D1]">
        {label}
      </p>
      <p className="mt-[5px] text-[18px] font-[500] leading-none text-[#404B5E]">
        {value}
      </p>
    </div>
  );
}

export function BuyerPurchaseOrdersPage({
  orders,
}: {
  orders: PurchaseOrderListItem[];
}) {
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const filterCounts = useMemo(
    () =>
      orders.reduce(
        (counts, order) => {
          counts.all += 1;

          if (order.status in counts) {
            counts[order.status as Exclude<StatusFilter, "all">] += 1;
          }

          return counts;
        },
        {
          all: 0,
          confirmed: 0,
          processing: 0,
          shipped: 0,
          completed: 0,
          cancelled: 0,
        },
      ),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      if (selectedFilter === "all") {
        return true;
      }

      return order.status === selectedFilter;
    });

    const sorted = [...filtered];

    sorted.sort((left, right) => {
      if (sortBy === "oldest") {
        return getSortTimestamp(left) - getSortTimestamp(right);
      }

      return getSortTimestamp(right) - getSortTimestamp(left);
    });

    return sorted;
  }, [orders, selectedFilter, sortBy]);

  return (
    <section className="w-full pb-[18px] pt-1">
      <section className="pb-[24px]">
        <h1 className="text-[23px] font-semibold text-[#1E3A5F]">
          Purchase Orders
        </h1>
        <p className="mt-[2px] text-[16px] text-[#94A3B8]">
          Track and manage all your orders from suppliers.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-[20px] pb-[24px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedFilter(filter.key)}
                className={`inline-flex h-[32px] items-center rounded-full border px-[16px] text-[15px] font-[500] leading-none transition ${
                  isActive
                    ? "border-[#223F68] bg-[#223F68] text-white"
                    : "border-[#C9D2DE] bg-white text-[#334155] hover:border-[#B8C4D4] hover:text-[#223654]"
                }`}
              >
                <span>{filter.label}</span>
                {filter.key === "all" ? (
                  <span
                    className={`ml-[8px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[10px] font-semibold leading-none ${
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

        <label className="flex items-center gap-[10px] text-[15px] font-normal text-[#94A3B8]">
          <span>Sort by</span>
          <span className="relative flex h-[38px] min-w-[136px] items-center rounded-[10px] border border-[#D9E2EE] bg-white px-[14px] text-[#59677A] shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full appearance-none bg-transparent pr-5 text-[15px] font-medium text-[#4E5B6F] outline-none"
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
          </span>
        </label>
      </section>

      {orders.length === 0 ? (
        <section className="rounded-[22px] border border-dashed border-[#D8E2EE] bg-white px-[24px] py-[34px] text-center text-[15px] text-[#8FA0B5]">
          No purchase orders found yet.
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className="rounded-[22px] border border-dashed border-[#D8E2EE] bg-white px-[24px] py-[34px] text-center text-[15px] text-[#8FA0B5]">
          No purchase orders found for this filter.
        </section>
      ) : (
        <section className="space-y-[18px]">
          {visibleOrders.map((order, index) => {
            const statusBadge = getStatusBadge(order.status);
            const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";

            return (
              <Link
                key={order.poId}
                href={`/buyer/purchase-orders/${order.poId}`}
                aria-label={`Open purchase order ${getPurchaseOrderCode(order)}`}
                className="group block rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#213f69] focus-visible:ring-offset-2"
              >
                <article className="overflow-hidden rounded-[20px] border border-[#E3E8EF] bg-white px-[26px] py-[24px] shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition group-hover:border-[#d7dee8] group-hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-[24px]">
                    <div className="flex min-w-0 items-start gap-[16px]">
                      <div
                        className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[16px] text-[24px] font-medium leading-none ${
                          CARD_ACCENTS[index % CARD_ACCENTS.length].panelClassName
                        }`}
                      >
                        <span className="text-[22px] font-medium">
                          {getInitials(supplierName)}
                        </span>
                      </div>

                      <div className="min-w-0 pt-[4px]">
                        <p className="truncate text-[18px] font-[500] leading-none text-[#6C778A]">
                          {getPurchaseOrderCode(order)}
                        </p>
                        <p className="mt-[6px] truncate text-[16px] font-normal leading-none text-[#A8B0BD]">
                          {supplierName}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-[2px] text-right">
                      <p className="text-[23px] font-[500] leading-none text-[#374151]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="mt-[6px] text-[14px] font-normal leading-none text-[#A9B1BF]">
                        Order Total
                      </p>
                    </div>
                  </div>

                  <div className="-mx-[26px] mt-[18px] border-t border-[#E9EDF3] px-[26px] pt-[18px]">
                    <div className="grid gap-y-[16px] md:grid-cols-[1.2fr_0.8fr_0.95fr_0.95fr_auto] md:items-end">
                      <OrderMetric label="Item" value={order.productName} />
                      <OrderMetric label="Quantity" value={order.quantityLabel} />
                      <OrderMetric label="Order Date" value={formatDate(order.createdAt)} />
                      <OrderMetric
                        label="Est. Delivery"
                        value={getEstimatedDeliveryLabel(order)}
                      />

                      <div className="flex justify-end">
                        <span
                          className={`inline-flex h-[34px] items-center gap-[8px] rounded-full px-[14px] text-[14px] font-[500] leading-none ${statusBadge.className}`}
                        >
                          <span
                            className={`h-[10px] w-[10px] rounded-full ${statusBadge.dotClassName}`}
                          />
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </section>
  );
}
