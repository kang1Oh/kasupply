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
      <p className="text-[11px] font-medium uppercase leading-none tracking-[0.02em] text-[#c0c5ce]">
        {label}
      </p>
      <p className="mt-[6px] text-[15px] font-semibold leading-none text-[#444f60]">
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
    <section className="mx-auto w-full max-w-[1040px] pb-5 pt-1">
      <section className="pb-5">
        <h1 className="text-[36px] font-semibold tracking-[-0.04em] text-[#27456e]">
          Purchase Orders
        </h1>
        <p className="mt-1 text-[15px] font-normal leading-6 text-[#a6adba]">
          Track and manage all your orders from suppliers.
        </p>
      </section>

      <section className="flex items-center justify-between gap-4 pb-5">
        <div className="flex flex-wrap items-center gap-[9px]">
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedFilter(filter.key)}
                className={`inline-flex h-[34px] items-center rounded-full border px-[16px] text-[13px] font-medium leading-none transition ${
                  isActive
                    ? "border-[#213f69] bg-[#213f69] text-white"
                    : "border-[#cfd6e2] bg-white text-[#929aa8] hover:border-[#c4cfdd] hover:text-[#38495f]"
                }`}
              >
                <span>{filter.label}</span>
                {filter.key === "all" ? (
                  <span className="ml-[7px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-white/18 px-[4px] text-[10px] font-semibold text-white">
                    {filterCounts.all}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-[10px] text-[13px] text-[#b1b7c3]">
          <span>Sort by</span>
          <span className="relative flex h-[34px] min-w-[116px] items-center rounded-[8px] border border-[#e3e7ee] bg-white px-[12px] text-[#59677a] shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full appearance-none bg-transparent pr-5 text-[12px] font-medium text-[#4e5b6f] outline-none"
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
        <section className="rounded-[14px] border border-dashed border-[#d9e0ea] bg-white px-6 py-10 text-center text-[14px] text-[#98a2b2]">
          No purchase orders found yet.
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className="rounded-[14px] border border-dashed border-[#d9e0ea] bg-white px-6 py-10 text-center text-[14px] text-[#98a2b2]">
          No purchase orders found for this filter.
        </section>
      ) : (
        <section className="space-y-3.5">
          {visibleOrders.map((order) => {
            const accent = CARD_ACCENTS[order.poId % CARD_ACCENTS.length];
            const statusBadge = getStatusBadge(order.status);
            const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";

            return (
              <Link
                key={order.poId}
                href={`/buyer/purchase-orders/${order.poId}`}
                aria-label={`Open purchase order ${getPurchaseOrderCode(order)}`}
                className="group block rounded-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#213f69] focus-visible:ring-offset-2"
              >
                <article className="overflow-hidden rounded-[14px] border border-[#e8ebf0] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)] transition group-hover:border-[#dfe5ee] group-hover:shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-4 px-[18px] py-[16px]">
                    <div className="flex min-w-0 items-center gap-[12px]">
                      <div
                        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-[19px] font-medium leading-none ${accent.panelClassName}`}
                      >
                        {getInitials(supplierName)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold leading-5 text-[#5f6a7b]">
                          {getPurchaseOrderCode(order)}
                        </p>
                        <p className="truncate text-[13px] leading-5 text-[#a7afbc]">
                          {supplierName}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[17px] font-semibold leading-none tracking-[-0.03em] text-[#39485b]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="mt-[7px] text-[12px] font-normal leading-none text-[#b2b8c4]">
                        Order Total
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#edf0f4] px-[18px] py-[12px]">
                    <div className="grid grid-cols-[1.15fr_0.8fr_0.9fr_0.9fr_auto] items-end gap-[18px]">
                      <OrderMetric label="Item" value={order.productName} />
                      <OrderMetric label="Quantity" value={order.quantityLabel} />
                      <OrderMetric label="Order Date" value={formatDate(order.createdAt)} />
                      <OrderMetric
                        label="Est. Delivery"
                        value={getEstimatedDeliveryLabel(order)}
                      />

                      <div className="flex justify-end">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-[10px] py-[5px] text-[12px] font-medium leading-none ${statusBadge.className}`}
                        >
                          <span
                            className={`h-[7px] w-[7px] rounded-full ${statusBadge.dotClassName}`}
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
