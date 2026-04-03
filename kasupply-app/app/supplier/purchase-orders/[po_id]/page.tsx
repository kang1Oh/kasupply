"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  getSupplierPurchaseOrderDetail,
  type PurchaseOrderView,
} from "../data";
import {
  updatePurchaseOrderDeliveryFee,
  updatePurchaseOrderStatus,
} from "../actions";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[16px] w-[16px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4.75a4 4 0 0 0-4 4v2.17c0 .46-.13.9-.37 1.3l-1.1 1.82c-.44.73.08 1.66.93 1.66h9.08c.85 0 1.37-.93.93-1.66l-1.1-1.82c-.24-.4-.37-.84-.37-1.3V8.75a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M10.25 18a1.75 1.75 0 0 0 3.5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[16px] w-[16px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.25 7.25h9.5a2 2 0 0 1 2 2v6.02a2 2 0 0 1-2 2h-5.08l-2.92 2.48c-.65.55-1.65.09-1.65-.76v-1.72H7.25a2 2 0 0 1-2-2V9.25a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Not set";
  }

  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) {
    return "Not set";
  }

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) {
    return "-";
  }

  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStatusBadge(status: PurchaseOrderView["status"]) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        className: "bg-[#EEF4FF] text-[#356CF9]",
      };
    case "processing":
      return {
        label: "Processing",
        className: "bg-[#FFF1E7] text-[#FF8A2A]",
      };
    case "shipped":
      return {
        label: "Shipped",
        className: "bg-[#F5E8FF] text-[#A54FF6]",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-[#E9F9EE] text-[#27814A]",
      };
    case "cancelled":
      return {
        label: "Closed",
        className: "bg-[#EFF2F6] text-[#6B7280]",
      };
    default:
      return {
        label: "Confirmed",
        className: "bg-[#EEF4FF] text-[#356CF9]",
      };
  }
}

function getActiveStep(status: PurchaseOrderView["status"]) {
  switch (status) {
    case "confirmed":
      return 2;
    case "processing":
      return 3;
    case "shipped":
      return 4;
    case "completed":
      return 5;
    case "cancelled":
      return 4;
    default:
      return 2;
  }
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-[#E9EEF5] px-[22px] py-[14px]">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]">
          {title}
        </h2>
        {right}
      </div>
      <div className="px-[22px] py-[18px]">{children}</div>
    </section>
  );
}

function Tracker({
  steps,
}: {
  steps: Array<{
    label: string;
    date: string;
    state: "completed" | "active" | "pending";
  }>;
}) {
  return (
    <div className="rounded-[16px] border border-[#E5ECF5] bg-white px-[20px] py-[18px]">
      <div className="grid grid-cols-4 items-start gap-[14px]">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = step.state === "completed";
          const isActive = step.state === "active";
          const circleClass = isCompleted
            ? "border-[#1F436E] bg-[#1F436E] text-white"
            : isActive
              ? "border-[#2F6BFF] bg-[#2F6BFF] text-white"
              : "border-[#B8C1CD] bg-[#B8C1CD] text-white";
          const labelClass = isCompleted
            ? "text-[#1F436E]"
            : isActive
              ? "text-[#2F6BFF]"
              : "text-[#9AA5B5]";
          const lineClass =
            index === 0
              ? ""
              : isCompleted || isActive
                ? "bg-[#2F6BFF]"
                : "bg-[#C9D2DD]";

          return (
            <div key={step.label} className="relative flex flex-col items-center text-center">
              {index > 0 ? (
                <span
                  className={`absolute left-[-50%] top-[14px] h-[2px] w-full ${lineClass}`}
                />
              ) : null}
              <div
                className={`relative z-[1] flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[13px] font-semibold ${circleClass}`}
              >
                {isCompleted ? "✓" : stepNumber}
              </div>
              <p className={`mt-[10px] text-[11px] font-semibold uppercase ${labelClass}`}>
                {step.label}
              </p>
              <p className="mt-[2px] text-[11px] text-[#9AA5B5]">{step.date}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function SupplierPurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ po_id: string }>;
}) {
  const { po_id } = await params;
  const poId = Number(po_id);

  if (!Number.isFinite(poId)) {
    notFound();
  }

  const order = await getSupplierPurchaseOrderDetail(poId);

  if (!order) {
    notFound();
  }

  const buyerName = order.buyerInfo?.businessName ?? order.buyer;
  const buyerSubtitle = order.buyerInfo?.location ?? "Buyer";
  const buyerInitials = getInitials(buyerName || "BU");
  const subtotal = order.subtotal ?? order.totalAmount - (order.deliveryFee ?? 0);
  const total = order.totalAmount;
  const expectedDelivery = order.preferredDeliveryDate ?? order.deadline;
  const hasBuyerReceipt = Boolean(order.receiptFileUrl || order.receiptFilePath);
  const statusBadge = getStatusBadge(order.status);
  const activeStep = getActiveStep(order.status);
  const notes =
    order.additionalNotes ??
    order.specifications ??
    order.quotationNotes ??
    "No buyer notes provided.";
  const deliveryFeeValue =
    order.deliveryFee === null || order.deliveryFee === undefined
      ? ""
      : String(order.deliveryFee);
  const messageHref = order.conversationId
    ? `/supplier/messages?conversationId=${order.conversationId}`
    : "/supplier/messages";
  const purchaseOrderProgressSteps = [
    {
      label: "Confirmed",
      date: formatDateTime(order.orderDate),
      state: activeStep > 1 ? "completed" : "active",
    },
    {
      label: "Processing",
      date:
        order.status === "confirmed"
          ? "-"
          : formatDateTime(order.orderDate),
      state:
        activeStep === 2
          ? "active"
          : activeStep > 2
            ? "completed"
            : "pending",
    },
    {
      label: "Shipped",
      date:
        order.status === "shipped" || order.status === "completed"
          ? formatDateTime(expectedDelivery ?? order.orderDate)
          : "-",
      state:
        activeStep === 3
          ? "active"
          : activeStep > 3
            ? "completed"
            : "pending",
    },
    {
      label: "Completed",
      date:
        order.status === "completed"
          ? formatDateTime(order.completedAt ?? expectedDelivery ?? order.orderDate)
          : "-",
      state:
        order.status === "completed"
          ? "completed"
          : activeStep === 4
            ? "active"
            : "pending",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      <div className="border-b border-[#E2EAF3] bg-white px-[20px] py-[10px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px] text-[12px] text-[#9AA5B5]">
            <Link href="/supplier/dashboard" className="transition hover:text-[#1F436E]">
              KaSupply
            </Link>
            <span>›</span>
            <Link
              href="/supplier/purchase-orders"
              className="transition hover:text-[#1F436E]"
            >
              Purchase Orders
            </Link>
            <span>›</span>
            <span className="font-semibold text-[#3A4B66]">{order.poNumber}</span>
          </div>
          <div className="flex items-center gap-[10px] text-[#A9B3C4]">
            <button
              type="button"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[#E6ECF3] bg-white transition hover:border-[#D4DCE6] hover:text-[#1F436E]"
            >
              <BellIcon />
            </button>
            <button
              type="button"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[#E6ECF3] bg-white transition hover:border-[#D4DCE6] hover:text-[#1F436E]"
            >
              <MessageIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="px-[24px] py-[22px]">
        <div className="space-y-[14px] rounded-[20px] border border-[#E4ECF5] bg-white p-[22px] shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-[16px]">
            <div>
              <h1 className="text-[16px] font-semibold text-[#243B68]">{order.poNumber}</h1>
              <p className="mt-[4px] text-[13px] text-[#A4AFBF]">
                Placed on {formatDate(order.orderDate)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-[12px] py-[6px] text-[12px] font-semibold ${statusBadge.className}`}
            >
              • {statusBadge.label}
            </span>
          </div>

          <Tracker
            steps={
              purchaseOrderProgressSteps as unknown as Array<{
                label: string;
                date: string;
                state: "completed" | "active" | "pending";
              }>
            }
          />
        </div>

        <div className="mt-[14px] space-y-[14px]">
          <SectionCard title="Buyer Info">
            <div className="flex items-center gap-[14px] rounded-[14px] border border-[#EEF3F8] bg-white px-[10px] py-[10px]">
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-[#EFFBF2] text-[24px] font-semibold text-[#27814A]">
                {buyerInitials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-[10px]">
                  <h2 className="truncate text-[14px] font-semibold text-[#324766]">
                    {buyerName}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-[#7BC79D] px-[8px] py-[2px] text-[11px] font-medium text-[#27814A]">
                    ✓ Verified
                  </span>
                </div>
                <p className="mt-[3px] text-[12px] text-[#99A7B8]">{buyerSubtitle}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Order Summary">
            <div className="overflow-hidden rounded-[14px] border border-[#EEF2F7]">
              <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_0.8fr] gap-[12px] border-b border-[#EDF2F7] px-[14px] py-[10px] text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>
              <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_0.8fr] gap-[12px] border-b border-[#EDF2F7] px-[14px] py-[14px] text-[14px] text-[#334155]">
                <span className="font-medium text-[#1F2F4A]">{order.productName}</span>
                <span className="text-right">{order.quantityLabel}</span>
                <span className="text-right">
                  {formatCurrency(order.pricePerUnit)}
                  {order.unit ? ` / ${order.unit}` : ""}
                </span>
                <span className="text-right font-medium text-[#1F2F4A]">
                  {formatCurrency(order.totalAmount - (order.deliveryFee ?? 0))}
                </span>
              </div>
              <div className="space-y-[6px] px-[14px] py-[14px] text-[13px]">
                <div className="flex items-center justify-between text-[#A4AFBF]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#A4AFBF]">
                  <span>Delivery Fee</span>
                  <span>
                    {order.deliveryFee === null || order.deliveryFee === undefined
                      ? "Not yet set"
                      : formatCurrency(order.deliveryFee)}
                  </span>
                </div>
                <div className="mt-[10px] flex items-center justify-between border-t border-[#EDF2F7] pt-[10px] text-[14px] font-semibold text-[#1F2F4A]">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {order.status === "confirmed" ? (
            <SectionCard title="Set Delivery Fee">
              <form action={updatePurchaseOrderDeliveryFee} className="space-y-[12px]">
                <input type="hidden" name="po_id" value={order.poId} />
                <div className="grid gap-[12px] md:grid-cols-[1fr_220px] md:items-end">
                  <div>
                    <label className="block text-[13px] font-medium text-[#324766]">
                      Delivery fee
                    </label>
                    <p className="mt-[4px] text-[12px] text-[#A4AFBF]">
                      Leave blank if delivery is free.
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    name="delivery_fee"
                    defaultValue={deliveryFeeValue}
                    placeholder="₱ 0.00"
                    className="h-[40px] rounded-[10px] border border-[#D7E2EE] px-[12px] text-[14px] text-[#243B68] outline-none transition focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/10"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-[38px] items-center justify-center rounded-[10px] bg-[#1F436E] px-[16px] text-[13px] font-semibold text-white transition hover:bg-[#19385B]"
                  >
                    Save Delivery Fee
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard title="More Details">
            <div className="grid gap-[18px] md:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Deliver To
                </p>
                <p className="mt-[5px] text-[14px] text-[#243B68]">
                  {order.deliveryLocation || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Expected Delivery
                </p>
                <p className="mt-[5px] text-[14px] text-[#243B68]">
                  {formatDate(expectedDelivery)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Payment Method
                </p>
                <p className="mt-[5px] text-[14px] text-[#243B68]">
                  {order.paymentMethod || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Payment Terms
                </p>
                <p className="mt-[5px] text-[14px] text-[#243B68]">
                  {order.termsAndConditions || "Not set"}
                </p>
              </div>
            </div>
            <div className="mt-[18px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A4AFBF]">
                Notes from Buyer
              </p>
              <p className="mt-[5px] text-[14px] leading-[1.6] text-[#243B68]">{notes}</p>
            </div>
          </SectionCard>

          {order.status === "processing" ? (
            <div className="rounded-[14px] border border-[#FFD4B3] bg-[#FFF8F2] px-[16px] py-[14px]">
              <div className="flex items-start gap-[12px]">
                <div className="mt-[1px] flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#FF8A2A] text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                    <path
                      d="M7 12h10M12 7l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#FF8A2A]">Order is being processed</p>
                  <p className="mt-[4px] text-[12px] text-[#A27242]">
                    You are currently preparing this order. Mark as shipped once it has been dispatched to the buyer.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {order.status === "shipped" ? (
            hasBuyerReceipt ? (
              <div className="rounded-[14px] border border-[#8ED2A8] bg-[#F4FFF8] px-[16px] py-[14px]">
                <div className="flex items-start gap-[12px]">
                  <div className="mt-[1px] flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#27814A] text-white">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                      <path
                        d="m7 12 3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#27814A]">Order completed successfully</p>
                    <p className="mt-[4px] text-[12px] text-[#5A8A69]">
                      This order was fulfilled and marked complete on {formatDate(order.completedAt ?? order.orderDate)}. Total payment collected via COD: {formatCurrency(total)}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[14px] border border-[#C9B7FF] bg-[#FBF8FF] px-[16px] py-[14px]">
                <div className="flex items-start gap-[12px]">
                  <div className="mt-[1px] flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#6F3DF4] text-white">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                      <path
                        d="M7 7h6v6H7zM13 10h2.5l2 2v4H15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="9.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="17" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#6F3DF4]">Order on its way</p>
                    <p className="mt-[4px] text-[12px] text-[#8E75C9]">
                      Order was dispatched on {formatDate(expectedDelivery ?? order.orderDate)}. Waiting for the buyer to confirm receipt.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : null}

          {order.receiptFileUrl ? (
            <SectionCard title="Payment Receipt">
              <div className="flex items-center justify-between gap-[14px]">
                <div>
                  <p className="text-[13px] text-[#243B68]">Uploaded by buyer upon order placement</p>
                  <p className="mt-[4px] text-[12px] text-[#A4AFBF]">
                    Review the uploaded receipt before final completion.
                  </p>
                </div>
                <a
                  href={order.receiptFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[38px] items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white px-[18px] text-[13px] font-medium text-[#516276] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
                >
                  View Receipt
                </a>
              </div>
            </SectionCard>
          ) : null}

          {order.status === "completed" ? (
            <div className="rounded-[14px] border border-[#8ED2A8] bg-[#F4FFF8] px-[16px] py-[14px]">
              <div className="flex items-start gap-[12px]">
                <div className="mt-[1px] flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#27814A] text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                    <path
                      d="m7 12 3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#27814A]">Order completed successfully</p>
                  <p className="mt-[4px] text-[12px] text-[#5A8A69]">
                    This order was fulfilled and marked complete on {formatDate(order.completedAt ?? order.orderDate)}. Total payment collected via COD: {formatCurrency(total)}.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-[12px] md:grid-cols-2">
            {order.status === "confirmed" ? (
              <>
                <form action={updatePurchaseOrderStatus}>
                  <input type="hidden" name="po_id" value={order.poId} />
                  <input type="hidden" name="status" value="processing" />
                  <button
                    type="submit"
                    className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
                  >
                    Mark as Processing
                  </button>
                </form>
                <form action={updatePurchaseOrderStatus}>
                  <input type="hidden" name="po_id" value={order.poId} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                    type="submit"
                    className="flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#FF5B47] bg-white text-[14px] font-semibold text-[#FF5B47] transition hover:bg-[#FFF5F4]"
                  >
                    Cancel Order
                  </button>
                </form>
              </>
            ) : null}

            {order.status === "processing" ? (
              <>
                <form action={updatePurchaseOrderStatus}>
                  <input type="hidden" name="po_id" value={order.poId} />
                  <input type="hidden" name="status" value="shipped" />
                  <button
                    type="submit"
                    className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
                  >
                    Mark as Shipped
                  </button>
                </form>
                <form action={updatePurchaseOrderStatus}>
                  <input type="hidden" name="po_id" value={order.poId} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                    type="submit"
                    className="flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#FF5B47] bg-white text-[14px] font-semibold text-[#FF5B47] transition hover:bg-[#FFF5F4]"
                  >
                    Cancel Order
                  </button>
                </form>
              </>
            ) : null}

            {order.status === "shipped" ? (
              <>
                <form action={updatePurchaseOrderStatus}>
                  <input type="hidden" name="po_id" value={order.poId} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    type="submit"
                    className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
                  >
                    Mark as Completed
                  </button>
                </form>
                <Link
                  href="/supplier/purchase-orders"
                  className="flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
                >
                  Back to Orders
                </Link>
              </>
            ) : null}

            {order.status === "completed" ? (
              <Link
                href="/supplier/purchase-orders"
                className="flex h-[44px] items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68] md:col-span-2"
              >
                Back to Orders
              </Link>
            ) : null}

            {order.status === "cancelled" ? (
              <Link
                href="/supplier/purchase-orders"
                className="flex h-[44px] items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
              >
                Back to Orders
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
