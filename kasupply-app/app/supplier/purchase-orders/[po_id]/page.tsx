"use server";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  getSupplierPurchaseOrderDetail,
  type PurchaseOrderView,
} from "../data";
import {
  updatePurchaseOrderStatus,
} from "../actions";
import { PurchaseOrderDetailActions } from "./detail-actions";

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

function formatPurchaseOrderDisplayNumber(
  poId: number | null | undefined,
  createdAt: string | null | undefined,
) {
  if (poId == null || Number.isNaN(poId)) {
    return "PO-Not set";
  }

  const parsed = createdAt ? new Date(createdAt) : null;
  const year =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();

  return `PO-${year}-${String(poId).padStart(4, "0")}`;
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
        dotClassName: "bg-[#356CF9]",
      };
    case "processing":
      return {
        label: "Processing",
        className: "bg-[#FFF1E7] text-[#FF8A2A]",
        dotClassName: "bg-[#FF8A2A]",
      };
    case "shipped":
      return {
        label: "Shipped",
        className: "bg-[#F5E8FF] text-[#A54FF6]",
        dotClassName: "bg-[#A54FF6]",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-[#E9F9EE] text-[#27814A]",
        dotClassName: "bg-[#27814A]",
      };
    case "cancelled":
      return {
        label: "Closed",
        className: "bg-[#EFF2F6] text-[#6B7280]",
        dotClassName: "bg-[#6B7280]",
      };
    default:
      return {
        label: "Confirmed",
        className: "bg-[#EEF4FF] text-[#356CF9]",
        dotClassName: "bg-[#356CF9]",
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
  titleClassName,
  children,
}: {
  title: string;
  right?: ReactNode;
  titleClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-[#E9EEF5] px-[22px] py-[14px]">
        <h2
          className={
            titleClassName ??
            "text-[17px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]"
          }
        >
          {title}
        </h2>
        {right}
      </div>
      <div className="px-[22px] py-[25px]">{children}</div>
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
    <div className="flex items-center justify-center">
      <div className="grid w-full max-w-[1180px] grid-cols-4 items-start gap-0">
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
          const previousStep = index > 0 ? steps[index - 1] : null;
          const lineClass =
            previousStep?.state === "completed" ? "bg-[#1F436E]" : "bg-[#C9D2DD]";
          const trailingLineClass =
            step.state === "completed" || isActive ? "bg-[#1F436E]" : "bg-[#C9D2DD]";

          return (
            <div key={step.label} className="relative flex flex-col items-center px-[8px] text-center">
              {index > 0 ? (
                <span
                  className={`absolute top-[18px] h-[1.5px] rounded-full ${lineClass}`}
                  style={{ left: "calc(-50% + 24px)", width: "calc(100% - 48px)" }}
                />
              ) : null}
              {index === 0 ? (
                <span
                  className="absolute top-[18px] h-[1.5px] w-[40px] rounded-full bg-[#1F436E]"
                  style={{ left: "calc(50% - 64px)" }}
                />
              ) : null}
              {index === steps.length - 1 ? (
                <span
                  className={`absolute top-[18px] h-[1.5px] w-[40px] rounded-full ${trailingLineClass}`}
                  style={{ right: "calc(50% - 64px)" }}
                />
              ) : null}
              <div
                className={`relative z-[1] flex h-[44px] w-[44px] items-center justify-center rounded-full border text-[15px] font-medium ${circleClass} ${isCompleted ? "text-transparent" : ""}`}
              >
                {isCompleted ? (
                  <svg viewBox="0 0 24 24" className="h-[28px] w-[28px]" fill="none" aria-hidden="true">
                    <path
                      d="m7 12 3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <p className={`mt-[12px] text-[15px] font-semibold uppercase ${labelClass}`}>
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
  const poDisplayNumber = formatPurchaseOrderDisplayNumber(order.poId, order.orderDate);
  const total = order.totalAmount ?? 0;
  const subtotal = order.subtotal ?? total - (order.deliveryFee ?? 0);
  const expectedDelivery = order.preferredDeliveryDate ?? order.deadline;
  const hasBuyerReceipt = Boolean(order.receiptFileUrl || order.receiptFilePath);
  const statusBadge = getStatusBadge(order.status);
  const activeStep = getActiveStep(order.status);
  const notes =
    order.additionalNotes ??
    order.specifications ??
    order.quotationNotes ??
    "No buyer notes provided.";
  const paymentSummarySuffix = order.paymentMethod
    ? ` via ${order.paymentMethod}`
    : "";
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
    <div className="-m-6 min-h-screen bg-[#F7F9FC]">
      <div className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[14px] text-[#A4ACB9]">
            <span className="font-normal">KaSupply</span>
            <span>›</span>
            <Link
              href="/supplier/purchase-orders"
              className="transition hover:text-[#1F436E]"
            >
              Purchase Orders
            </Link>
            <span>›</span>
            <span className="font-semibold text-[#506073]">{poDisplayNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#E6ECF3] bg-[#FBFCFE] text-[#B1B8C5]"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#E6ECF3] bg-[#FBFCFE] text-[#B1B8C5]"
              aria-label="Messages"
            >
              <MessageIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="px-[20px] py-[18px]">
        <section>
          <div className="flex flex-col gap-[8px] px-[6px] py-[4px] lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-[#223654]">{poDisplayNumber}</h1>
              <p className="text-[15px] text-[#A0A9B8]">
                Placed on {formatDate(order.orderDate)}
              </p>
            </div>
            <span
              className={`inline-flex h-[30px] items-center gap-[8px] rounded-full px-[14px] text-[15px] font-medium ${statusBadge.className}`}
            >
              • {statusBadge.label}
            </span>
          </div>

          <div className="mt-[12px] rounded-[18px] border border-[#E4ECF5] bg-white px-[28px] py-[24px] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
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
        </section>

        <div className="mt-[14px] space-y-[14px]">
          <SectionCard title="Buyer Info">
            <div className="flex items-start gap-[14px]">
              <div className="mt-[2px] flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#EDF9F1] text-[18px] font-medium text-[#2E8B57]">
                {buyerInitials}
              </div>
              <div className="min-w-0 pt-[1px]">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <h2 className="truncate text-[15px] font-semibold text-[#223654]">
                    {buyerName}
                  </h2>
                  <span className="inline-flex h-[22px] items-center rounded-[6px] border border-[#B8E0C7] bg-[#F4FCF7] px-[8px] text-[10px] font-semibold text-[#2F8C57]">
                    ✓ Verified
                  </span>
                </div>
                <p className="mt-[2px] text-[14px] text-[#8E99AB]">
                  {buyerSubtitle || "Buyer profile details not available"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Order Summary"
            titleClassName="text-[17px] font-semibold uppercase tracking-[0.01em] text-[#223F68]"
          >
            <div>
              <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] gap-[8px] border-b border-[#EDF2F7] px-[14px] pb-[12px] pt-[3px] text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>
              <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] gap-[8px] border-b border-[#EDF2F7] px-[14px] py-[18px] text-[15px] text-[#334155]">
                <span className="text-[16px] font-medium text-[#374151]">{order.productName}</span>
                <span className="text-center font-normal text-[#8E99AB]">{order.quantityLabel}</span>
                <span className="text-right font-normal text-[#8E99AB]">
                  {formatCurrency(order.pricePerUnit)}
                  {order.unit ? ` / ${order.unit}` : ""}
                </span>
                <span className="text-right font-normal text-[#374151]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="space-y-[8px] px-[14px] py-[16px]">
                <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                  <span className="col-span-3 text-[15px]">Subtotal</span>
                  <span className="text-right text-[15px]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                  <span className="col-span-3 text-[15px]">Delivery Fee</span>
                  <span className="text-right text-[15px]">
                    {order.deliveryFee === null || order.deliveryFee === undefined
                      ? "Not yet set"
                      : formatCurrency(order.deliveryFee)}
                  </span>
                </div>
                <div className="mt-[14px] grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] border-t border-[#EDF2F7] pt-[14px] text-[15px] font-semibold text-[#334155]">
                  <span className="col-span-3">TOTAL</span>
                  <span className="text-right text-[17px] font-semibold">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {order.status === "confirmed" ? (
            <SectionCard title="Set Delivery Fee">
              <div className="flex flex-col gap-[16px] md:flex-row md:items-start md:justify-between md:gap-[24px]">
                <div className="min-w-0 pt-[2px]">
                  <p className="text-[16px] font-normal text-[#2C3E58]">Delivery fee</p>
                  <p className="mt-[2px] font-normal text-[14px] text-[#A0A9B8]">
                    Leave blank if delivery is free.
                  </p>
                </div>
                <div className="w-full max-w-[420px]">
                  <label className="sr-only" htmlFor="delivery-fee">
                    Delivery fee
                  </label>
                  <input
                    id="delivery-fee"
                    form="purchase-order-processing-form"
                    name="delivery_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={order.deliveryFee ?? ""}
                    placeholder="₱ 0.00"
                    className="h-[48px] w-full rounded-[12px] border border-[#B8C1CD] bg-white px-[18px] text-[17px] font-normal text-[#223654] outline-none transition placeholder:text-[#C3CAD5] focus:border-[#1F436E]"
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="More Details">
            <div className="grid gap-[18px] md:grid-cols-2">
              <div>
                <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Deliver To
                </p>
                <p className="mt-[2px] font-normal text-[16px] text-[#374151]">
                  {order.deliveryLocation || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Expected Delivery
                </p>
                <p className="mt-[2px] font-normal text-[16px] text-[#374151]">
                  {formatDate(expectedDelivery)}
                </p>
              </div>
              <div>
                <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Payment Method
                </p>
                <p className="mt-[2px] font-normal text-[16px] text-[#374151]">
                  {order.paymentMethod || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Payment Terms
                </p>
                <p className="mt-[2px] font-normal text-[16px] text-[#374151]">
                  {order.termsAndConditions || "Not set"}
                </p>
              </div>
            </div>
            <div className="mt-[18px]">
              <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                Notes from Buyer
              </p>
              <p className="mt-[2px] font-normal text-[16px] leading-[1.6] text-[#374151]">{notes}</p>
            </div>
          </SectionCard>

          {order.status === "processing" ? (
            <div className="rounded-[14px] border border-[#FF8A2A] bg-[#FDFFFE] px-[14px] py-[12px]">
              <div className="flex items-start gap-[10px]">
                <div className="mt-[1px] flex h-[44px] w-[44px] items-center justify-center rounded-[7px] bg-[#FF7A1A] text-white">
                  <Image
                    src="/icons/order_processed.svg"
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px]"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#FF6B00]">Order is being processed</p>
                  <p className="text-[13px] font-normal leading-[1.45] text-[#A2A8B3]">
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
                  <div className="mt-[1px] flex h-[44px] w-[44px] items-center justify-center rounded-[7px] bg-[#27814A] text-white">
                    <Image
                      src="/icons/order_arrived.svg"
                      alt=""
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#27814A]">Order completed successfully</p>
                    <p className="text-[13px] font-normal leading-[1.45] text-[#A2A8B3]">
                      This order was fulfilled and marked complete on {formatDate(order.completedAt ?? order.orderDate)}. Total payment collected{paymentSummarySuffix}: {formatCurrency(total)}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[14px] border border-[#4E13B3] bg-[#FBF8FF] px-[16px] py-[14px]">
                <div className="flex items-start gap-[12px]">
                  <div className="mt-[1px] flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#4E13B3] text-white">
                    <Image
                      src="/icons/order_arrived.svg"
                      alt=""
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#4E13B3]">Order on its way</p>
                    <p className="text-[13px] font-normal leading-[1.45] text-[#A2A8B3]">
                      Order was dispatched on {formatDate(expectedDelivery ?? order.orderDate)}. Waiting for the buyer to confirm receipt.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : null}

          {order.receiptFileUrl ? (
            <div className="rounded-[18px] border border-[#E4ECF5] bg-white px-[28px] py-[26px] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-[18px] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[18px] font-medium text-[#334155]">Payment Receipt</p>
                  <p className="text-[15px] font-normal text-[#B0B7C3]">
                    Uploaded by buyer upon order placement
                  </p>
                </div>
                <a
                  href={order.receiptFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[48px] items-center justify-center rounded-[10px] border border-[#AEB8C7] bg-white px-[30px] text-[15px] font-medium text-[#455468] transition hover:border-[#8F9CAF] hover:text-[#243B68]"
                >
                  View Receipt
                </a>
              </div>
            </div>
          ) : null}

          {order.status === "completed" ? (
            <div className="rounded-[14px] border border-[#8ED2A8] bg-[#F4FFF8] px-[16px] py-[14px]">
              <div className="flex items-start gap-[12px]">
                <div className="mt-[1px] flex h-[44px] w-[44px] items-center justify-center rounded-[7px] bg-[#27814A] text-white">
                  <Image
                    src="/icons/order_arrived.svg"
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px]"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#27814A]">Order completed successfully</p>
                  <p className="text-[13px] font-normal leading-[1.45] text-[#A2A8B3]">
                    This order was fulfilled and marked complete on {formatDate(order.completedAt ?? order.orderDate)}. Total payment collected{paymentSummarySuffix}: {formatCurrency(total)}.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {(order.status === "confirmed" || order.status === "processing") ? (
            <PurchaseOrderDetailActions
              poId={order.poId}
              status={order.status}
              updateStatusAction={updatePurchaseOrderStatus}
            />
          ) : null}

          {order.status === "shipped" ? (
            <div className="grid gap-[12px] md:grid-cols-2">
              <PurchaseOrderDetailActions
                poId={order.poId}
                status="shipped"
                updateStatusAction={updatePurchaseOrderStatus}
              />
              <Link
                href="/supplier/purchase-orders"
                className="flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
              >
                Back to Orders
              </Link>
            </div>
          ) : null}

          {order.status === "completed" || order.status === "cancelled" ? (
            <div className="grid gap-[12px] md:grid-cols-2">
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

