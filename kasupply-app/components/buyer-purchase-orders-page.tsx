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

type StatusFilter = "all" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";
type SortOption = "newest" | "oldest" | "delivery" | "highest_total";

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
  { value: "delivery", label: "Nearest Delivery" },
  { value: "highest_total", label: "Highest Total" },
];

const CARD_ACCENTS = [
  { panelClassName: "bg-[#edf8ef] text-[#2f7a45]" },
  { panelClassName: "bg-[#fff0ea] text-[#e25f42]" },
  { panelClassName: "bg-[#e8efff] text-[#416eb7]" },
  { panelClassName: "bg-[#fff7d8] text-[#b99114]" },
  { panelClassName: "bg-[#fde7ff] text-[#c457db]" },
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
  if (!order.createdAt) {
    return order.poNumber;
  }

  const createdAt = new Date(order.createdAt);
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

function getSortTimestamp(order: PurchaseOrderListItem, sortBy: SortOption) {
  if (sortBy === "delivery") {
    if (order.preferredDeliveryDate) {
      const deliveryTime = new Date(order.preferredDeliveryDate).getTime();
      return Number.isNaN(deliveryTime) ? Number.MAX_SAFE_INTEGER : deliveryTime;
    }

    return Number.MAX_SAFE_INTEGER;
  }

  const createdTime = new Date(order.createdAt || "").getTime();
  return Number.isNaN(createdTime) ? 0 : createdTime;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        className: "border-[#d8e4ff] bg-[#eef4ff] text-[#4f78d2]",
        dotClassName: "bg-[#4f78d2]",
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
        className: "border-[#d7f0dd] bg-[#edf8ef] text-[#2f7a45]",
        dotClassName: "bg-[#2f7a45]",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "border-[#dde3eb] bg-[#eef2f7] text-[#6b7788]",
        dotClassName: "bg-[#6b7788]",
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-semibold leading-tight text-[#223654]">
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
        return getSortTimestamp(left, sortBy) - getSortTimestamp(right, sortBy);
      }

      if (sortBy === "delivery") {
        return getSortTimestamp(left, sortBy) - getSortTimestamp(right, sortBy);
      }

      if (sortBy === "highest_total") {
        return (right.totalAmount ?? 0) - (left.totalAmount ?? 0);
      }

      return getSortTimestamp(right, sortBy) - getSortTimestamp(left, sortBy);
    });

    return sorted;
  }, [orders, selectedFilter, sortBy]);

  return (
    <section className="space-y-5">
      <section className="rounded-[28px] border border-[#e8edf5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
              Purchase Orders
            </h1>
            <p className="mt-1 text-[15px] text-[#8a96a8]">
              Track and manage all your orders from suppliers.
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

      {orders.length === 0 ? (
        <section className="rounded-[24px] border border-[#e8edf5] bg-white px-6 py-10 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-[20px] font-semibold text-[#223654]">
            No purchase orders yet
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-[14px] leading-6 text-[#8a96a8]">
            Confirm an accepted quotation and your supplier orders will appear here
            for tracking and coordination.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/buyer/rfqs"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
            >
              View My RFQs
            </Link>
            <Link
              href="/buyer/sourcing-board"
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d7e0eb] bg-white px-5 text-[14px] font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
            >
              Open Sourcing Board
            </Link>
          </div>
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#d7e1ec] bg-white px-6 py-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.03)]">
          <h2 className="text-[18px] font-semibold text-[#223654]">
            No orders in this view
          </h2>
          <p className="mt-2 text-[14px] text-[#8a96a8]">
            Try another status filter to see the rest of your purchase orders.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7e0eb] bg-white px-4 text-[14px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
          >
            Show all orders
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => {
            const accent = CARD_ACCENTS[order.poId % CARD_ACCENTS.length];
            const statusBadge = getStatusBadge(order.status);
            const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";

            return (
              <Link
                key={order.poId}
                href={`/buyer/purchase-orders/${order.poId}`}
                aria-label={`Open purchase order ${getPurchaseOrderCode(order)}`}
                className="group block rounded-[22px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#294773] focus-visible:ring-offset-2"
              >
                <article className="overflow-hidden rounded-[22px] border border-[#e8edf5] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[20px] font-semibold ${accent.panelClassName}`}
                      >
                        {getInitials(supplierName)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[21px] font-semibold leading-tight tracking-[-0.03em] text-[#223654] transition group-hover:text-[#294773]">
                          {getPurchaseOrderCode(order)}
                        </p>
                        <p className="mt-1 text-[15px] text-[#97a3b4]">{supplierName}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-1 text-left lg:items-end lg:text-right">
                      <p className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-[12px] text-[#b0bac7]">Order Total</p>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-[#edf2f7] px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_auto] xl:items-end">
                    <OrderMetric label="Item" value={order.productName} />
                    <OrderMetric label="Quantity" value={order.quantityLabel} />
                    <OrderMetric label="Order Date" value={formatDate(order.createdAt)} />
                    <OrderMetric
                      label="Est. Delivery"
                      value={getEstimatedDeliveryLabel(order)}
                    />

                    <div className="flex xl:justify-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold ${statusBadge.className}`}
                      >
                        <span
                          className={`mr-2 inline-flex h-2.5 w-2.5 rounded-full ${statusBadge.dotClassName}`}
                        />
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-[#f3f6fa] px-4 py-3 sm:px-5">
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#2f6fed] transition group-hover:text-[#255fd0]">
                      View Details
                      <ArrowRightIcon />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
