import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";
import { getSupplierPurchaseOrders } from "./data";

function SummaryCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[#EEF2F7] bg-white px-[22px] py-[16px] shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <p className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#A8B0BE]">
        {title}
      </p>
      <p className="mt-[10px] text-[17px] font-semibold text-[#253758]">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "Not available";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("PHP", "₱");
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "PO";
}

function getInitialsClassName(index: number) {
  const variants = [
    "bg-[#EEF9F2] text-[#2E8B57]",
    "bg-[#FFF1EA] text-[#FF734A]",
    "bg-[#F7E8FF] text-[#B35BE2]",
    "bg-[#E9FBFF] text-[#3AA6BD]",
  ];

  return variants[index % variants.length] ?? variants[0];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        className: "bg-[#EEF4FF] text-[#5F8EFF]",
      };
    case "processing":
      return {
        label: "Processing",
        className: "bg-[#FFF2E9] text-[#FF8B42]",
      };
    case "shipped":
      return {
        label: "Shipped",
        className: "bg-[#F8E8FF] text-[#D060FF]",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-[#ECF8F1] text-[#2A8A57]",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-[#FFF1EE] text-[#F16352]",
      };
    default:
      return {
        label: "Pending",
        className: "bg-[#EEF1F5] text-[#8793A7]",
      };
  }
}

function getPrimaryAction(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "Mark as Processing",
        className: "bg-[#233F68] text-white",
      };
    case "processing":
      return {
        label: "Mark as Shipped",
        className: "bg-[#233F68] text-white",
      };
    default:
      return null;
  }
}

export default async function SupplierPurchaseOrdersPage() {
  const { orders } = await getSupplierPurchaseOrders();

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order) =>
    ["confirmed", "processing"].includes(order.status),
  ).length;
  const inTransitOrders = orders.filter((order) => order.status === "shipped").length;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const activeOrders = orders.filter((order) =>
    ["confirmed", "processing", "shipped"].includes(order.status),
  ).length;

  return (
    <main className="-m-6 min-h-screen bg-[#F7F9FC]">
      <section className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[12px] text-[#A4ACBA]">
            <span>KaSupply</span>
            <span className="text-[#CBD2DE]">/</span>
            <span className="font-semibold text-[#506073]">Purchase Orders</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
              aria-label="Notifications"
            >
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
              aria-label="Messages"
            >
              <MessageSquare className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </section>

      <section className="px-[16px] py-[18px]">
        <div className="mx-auto max-w-[980px]">
          <div>
            <h1 className="text-[18px] font-semibold text-[#223654]">Purchase Orders</h1>
            <p className="mt-[3px] text-[12px] text-[#A0A9B8]">
              {activeOrders} active orders to fulfill
            </p>
          </div>

          <div className="mt-[18px] grid gap-[14px] md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Total Orders" value={totalOrders} accent="bg-[#A54BFF]" />
            <SummaryCard title="Pending Orders" value={pendingOrders} accent="bg-[#3E73FF]" />
            <SummaryCard title="In Transit" value={inTransitOrders} accent="bg-[#FF8A3D]" />
            <SummaryCard title="Completed" value={completedOrders} accent="bg-[#2F8C57]" />
          </div>

          <div className="mt-[18px]">
            <h2 className="text-[14px] font-semibold text-[#223654]">All Orders</h2>
          </div>

          <div className="mt-[12px] space-y-[12px]">
            {orders.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#D8E2EE] bg-white px-[18px] py-[28px] text-center text-[13px] text-[#8FA0B5]">
                No purchase orders found for this supplier yet.
              </div>
            ) : (
              orders.map((order, index) => {
                const statusBadge = getStatusBadge(order.status);
                const primaryAction = getPrimaryAction(order.status);

                return (
                  <article
                    key={order.poId}
                    className="rounded-[18px] border border-[#E6ECF3] bg-white px-[18px] py-[16px] shadow-[0_3px_10px_rgba(15,23,42,0.025)]"
                  >
                    <div className="flex items-start justify-between gap-[16px]">
                      <div className="flex min-w-0 items-start gap-[12px]">
                        <div
                          className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px] text-[18px] font-medium ${getInitialsClassName(index)}`}
                        >
                          {getInitials(order.buyer)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <p className="text-[15px] font-medium text-[#516074]">
                              {order.poNumber}
                            </p>
                            <span
                              className={`inline-flex h-[20px] items-center rounded-full px-[8px] text-[9px] font-semibold uppercase tracking-[0.02em] ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="mt-[2px] text-[13px] font-medium text-[#6C788B]">
                            {order.buyer}
                          </p>
                          <p className="mt-[2px] text-[12px] text-[#A5AFBD]">
                            Ordered on {formatDate(order.orderDate)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#B0B8C5]">
                          Total Amount
                        </p>
                        <p className="mt-[4px] text-[15px] font-semibold text-[#243653]">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-[14px] grid gap-y-[12px] border-t border-[#EDF1F6] pt-[14px] md:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#A7AFBD]">
                          Item
                        </p>
                        <p className="mt-[4px] text-[13px] font-medium text-[#243653]">
                          {order.productName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#A7AFBD]">
                          Quantity
                        </p>
                        <p className="mt-[4px] text-[13px] font-medium text-[#243653]">
                          {order.quantityLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#A7AFBD]">
                          Deliver By
                        </p>
                        <p className="mt-[4px] text-[13px] font-medium text-[#243653]">
                          {formatDate(order.preferredDeliveryDate ?? order.deadline)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#A7AFBD]">
                          Payment Method
                        </p>
                        <p className="mt-[4px] text-[13px] font-medium text-[#243653]">
                          {order.paymentMethod ?? "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-[16px] flex items-center gap-[10px]">
                      {primaryAction ? (
                        <button
                          type="button"
                          className={`inline-flex h-[40px] flex-1 items-center justify-center rounded-[8px] px-[16px] text-[12px] font-medium ${primaryAction.className}`}
                        >
                          {primaryAction.label}
                        </button>
                      ) : null}

                      <Link
                        href={`/supplier/purchase-orders/${order.poId}`}
                        className={`inline-flex h-[40px] items-center justify-center rounded-[8px] border px-[16px] text-[12px] font-medium ${
                          primaryAction
                            ? "min-w-[222px] border-[#D9E2EE] bg-white text-[#7B879A]"
                            : "w-full border-[#E3E8F0] bg-white text-[#9DA8B9]"
                        }`}
                      >
                        View Details
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-[14px] flex flex-col gap-[10px] text-[11px] text-[#9EA8B7] md:flex-row md:items-center md:justify-between">
            <p>
              {orders.length === 0
                ? "Showing 0 of 0 results"
                : `Showing 1-${orders.length} of ${orders.length} results`}
            </p>

            <div className="flex items-center gap-[14px] text-[12px] text-[#65748B]">
              <button type="button" className="text-[#A8B0BE]">
                ← Previous
              </button>
              <div className="flex items-center gap-[10px]">
                <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#233F68] text-white">
                  1
                </span>
              </div>
              <button type="button" className="text-[#223654]">
                Next →
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
