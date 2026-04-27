import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModalShell } from "@/components/modals";
import { cancelPurchaseOrder, uploadPurchaseOrderReceipt } from "../actions";
import { getBuyerPurchaseOrderDetail, getBuyerPurchaseOrderReviewDraft } from "../data";
import { CompletedOrderActions } from "./completed-order-actions";
import { ReceiptUploadDetailPanel } from "./receipt-upload-detail-panel";
import { ReceiptUploadWidget } from "./receipt-upload-widget";

const BUYER_SUPPLIER_SUBTITLE_CLASS =
  "mt-[8px] truncate text-[14px] font-normal leading-none text-[#a7aebb]";
const BUYER_SUPPLIER_PROFILE_BUTTON_CLASS =
  "inline-flex h-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[#e2e5ea] bg-white px-[18px] text-[13px] font-semibold text-[#5f6877] transition hover:bg-[#f8fafc]";
const BUYER_SUPPLIER_ROW_CLASS = "flex min-w-0 items-center gap-[12px]";
const BUYER_SUPPLIER_AVATAR_CLASS =
  "flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#eefaf3] text-[22px] font-medium leading-none text-[#4f9b72]";
const BUYER_PO_CANCEL_BUTTON_CLASS =
  "inline-flex h-[44px] items-center justify-center px-[12px] text-[15px] font-medium leading-none text-[#ff3b30] transition hover:text-[#e5352b]";
const BUYER_PO_PRIMARY_DISABLED_BUTTON_CLASS =
  "inline-flex h-[44px] min-w-[198px] items-center justify-center rounded-[12px] bg-[#b7c2d3] px-[20px] text-[15px] font-medium leading-none text-white";

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Not available";

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
    month: "long",
    day: "numeric",
  },
) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

function formatStepTimestamp(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function toTitleCase(value: string | null) {
  return String(value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBusinessType(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split(/[_\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function buildSupplierSubtitle(
  businessType: string | null | undefined,
  location: string | null | undefined,
) {
  return [formatBusinessType(businessType), location].filter(Boolean).join(" \u00b7 ");
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

function getPurchaseOrderCode(poId: number, createdAt: string | null) {
  if (!createdAt) {
    return `PO-${String(poId).padStart(4, "0")}`;
  }

  const parsed = new Date(createdAt);
  const year = Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();

  return `PO-${year}-${String(poId).padStart(4, "0")}`;
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-[#ffe2cc] bg-[#fff2e7] text-[#f08b38]";
    case "processing":
      return "border-[#ffe2cc] bg-[#fff2e7] text-[#f08b38]";
    case "shipped":
      return "border-[#ead7fb] bg-[#f7efff] text-[#a15bd3]";
    case "completed":
      return "border-[#d7f0dd] bg-[#edf8ef] text-[#2f7a45]";
    case "cancelled":
      return "border-[#ffd9d6] bg-[#fff1f0] text-[#e05547]";
    default:
      return "border-[#dde3eb] bg-[#f8fafc] text-[#526176]";
  }
}

function getFileName(path: string | null) {
  if (!path) return "receipt";
  return path.split("/").pop() || "receipt";
}

function buildDetailHref(
  poId: number,
  params: Record<string, string | null | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/buyer/purchase-orders/${poId}?${query}` : `/buyer/purchase-orders/${poId}`;
}

function isImageFile(url: string | null) {
  if (!url) return false;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#E9EEF5] px-[22px] py-[14px]">
        <p className="text-[17px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]">
          {title}
        </p>
      </div>
      <div className="px-[22px] py-[25px]">{children}</div>
    </section>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
        {label}
      </p>
      <div className="mt-[2px] text-[16px] font-normal leading-[1.6] text-[#374151]">
        {value}
      </div>
    </div>
  );
}

function SupplierInfoCard({
  supplierName,
  supplierSubtitle,
  supplierProfileHref,
  supplierVerified,
}: {
  supplierName: string;
  supplierSubtitle: string;
  supplierProfileHref: string;
  supplierVerified: boolean;
}) {
  return (
    <SectionCard title="Supplier Info">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={BUYER_SUPPLIER_ROW_CLASS}>
          <div className={BUYER_SUPPLIER_AVATAR_CLASS}>{getInitials(supplierName)}</div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[8px]">
              <p className="text-[15px] font-semibold text-[#223654]">{supplierName}</p>
              {supplierVerified ? <VerifiedBadge /> : null}
            </div>

            <p className={BUYER_SUPPLIER_SUBTITLE_CLASS}>
              {supplierSubtitle || "Supplier details will appear once available."}
            </p>
          </div>
        </div>

        <Link href={supplierProfileHref} className={BUYER_SUPPLIER_PROFILE_BUTTON_CLASS}>
          View Profile
        </Link>
      </div>
    </SectionCard>
  );
}

function OrderSummaryCard({
  productName,
  quantityLabel,
  pricePerUnit,
  unit,
  subtotal,
  deliveryFeeLabel,
  totalAmount,
}: {
  productName: string;
  quantityLabel: string;
  pricePerUnit: number | null;
  unit: string | null;
  subtotal: number | null;
  deliveryFeeLabel: string;
  totalAmount: number | null;
}) {
  return (
    <SectionCard title="Order Summary">
      <div>
        <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] gap-[8px] border-b border-[#EDF2F7] px-[14px] pb-[12px] pt-[3px] text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Total</span>
        </div>

        <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] gap-[8px] border-b border-[#EDF2F7] px-[14px] py-[18px] text-[15px] text-[#334155]">
          <span className="text-[16px] font-medium text-[#374151]">{productName}</span>
          <span className="text-center font-normal text-[#8E99AB]">{quantityLabel}</span>
          <span className="text-right font-normal text-[#8E99AB]">
            {formatUnitPrice(pricePerUnit, unit)}
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
            <span className="text-right text-[15px]">{deliveryFeeLabel}</span>
          </div>
          <div className="mt-[14px] grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] border-t border-[#EDF2F7] pt-[14px] text-[15px] font-semibold text-[#334155]">
            <span className="col-span-3">TOTAL</span>
            <span className="text-right text-[17px] font-semibold">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function MoreDetailsCard({
  deliveryLocation,
  preferredDeliveryDate,
  deadline,
  paymentMethod,
  termsAndConditions,
  notes,
}: {
  deliveryLocation: string | null;
  preferredDeliveryDate: string | null;
  deadline: string | null;
  paymentMethod: string | null;
  termsAndConditions: string | null;
  notes: string;
}) {
  return (
    <SectionCard title="More Details">
      <div className="grid gap-5 md:grid-cols-2">
        <DetailMetric label="Deliver To" value={deliveryLocation || "Not specified"} />
        <DetailMetric
          label="Expected Delivery"
          value={formatDate(preferredDeliveryDate ?? deadline)}
        />
        <DetailMetric label="Payment Method" value={paymentMethod || "Not specified"} />
        <DetailMetric
          label="Payment Terms"
          value={termsAndConditions || "Not specified"}
        />
      </div>

      <div className="mt-[18px]">
        <DetailMetric label="Notes From Buyer" value={notes} />
      </div>
    </SectionCard>
  );
}

function formatUnitPrice(value: number | null, unit: string | null) {
  if (value === null || Number.isNaN(value)) {
    return "Not available";
  }

  const formatted = formatCurrency(value);
  return unit ? `${formatted} / ${unit}` : formatted;
}

function VerifiedBadge() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full border border-[#94cfaa] bg-[#f5fbf6] px-[6px] text-[10px] font-semibold leading-none text-[#4f996e]">
      Verified
    </span>
  );
}

function PurchaseOrderTracker({
  steps,
  activeStepIcon = "number",
  activeStepTone = "blue",
}: {
  steps: Array<{
    label: string;
    date: string;
    state: "completed" | "active" | "pending";
  }>;
  activeStepIcon?: "number" | "check";
  activeStepTone?: "blue" | "navy";
}) {
  return (
    <section className="rounded-[18px] border border-[#E4ECF5] bg-white px-[28px] py-[24px] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-center">
        <div className="grid w-full max-w-[1180px] grid-cols-4 items-start gap-0">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = step.state === "completed";
            const isActive = step.state === "active";
            const activeCircleClass =
              activeStepTone === "navy"
                ? "border-[#1F436E] bg-[#1F436E] text-white"
                : "border-[#2F6BFF] bg-[#2F6BFF] text-white";
            const activeLabelClass =
              activeStepTone === "navy" ? "text-[#1F436E]" : "text-[#2F6BFF]";
            const circleClass = isCompleted
              ? "border-[#1F436E] bg-[#1F436E] text-white"
              : isActive
                ? activeCircleClass
                : "border-[#B8C1CD] bg-[#B8C1CD] text-white";
            const labelClass = isCompleted
              ? "text-[#1F436E]"
              : isActive
                ? activeLabelClass
                : "text-[#9AA5B5]";
            const lineClass = "bg-[#C9D2DD]";
            const trailingLineClass = "bg-[#C9D2DD]";

            return (
              <div
                key={step.label}
                className="relative flex flex-col items-center px-[8px] text-center"
              >
                {index > 0 ? (
                  <span
                    className={`absolute top-[18px] h-[1.5px] rounded-full ${lineClass}`}
                    style={{ left: "calc(-50% + 24px)", width: "calc(100% - 48px)" }}
                  />
                ) : null}
                {index === 0 ? (
                  <span
                    className={`absolute top-[18px] h-[1.5px] w-[40px] rounded-full ${trailingLineClass}`}
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
                  className={`relative z-[1] flex h-[44px] w-[44px] items-center justify-center rounded-full border text-[15px] font-medium ${circleClass}`}
                >
                  {isCompleted || (isActive && activeStepIcon === "check") ? (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-[16px] w-[16px]"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.1 6.4 11l6.1-6.1"
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
    </section>
  );
}

function ConfirmedProgressCard() {
  const steps: Array<{
    label: string;
    date: string;
    state: "completed" | "active" | "pending";
  }> = [
    { label: "Confirmed", date: "-", state: "active" },
    { label: "Processing", date: "-", state: "pending" },
    { label: "Shipped", date: "-", state: "pending" },
    { label: "Completed", date: "-", state: "pending" },
  ];

  return <PurchaseOrderTracker steps={steps} activeStepIcon="check" />;
}

function ProcessingProgressCard({
  confirmedAt,
  processingAt,
}: {
  confirmedAt: string | null;
  processingAt: string | null;
}) {
  const steps: Array<{
    label: string;
    timestamp: string;
    state: "completed" | "active" | "pending";
  }> = [
    {
      label: "Confirmed",
      timestamp: confirmedAt ? formatStepTimestamp(confirmedAt) : "-",
      state: "completed",
    },
    {
      label: "Processing",
      timestamp: processingAt ? formatStepTimestamp(processingAt) : "-",
      state: "active",
    },
    {
      label: "Shipped",
      timestamp: "-",
      state: "pending",
    },
    {
      label: "Completed",
      timestamp: "-",
      state: "pending",
    },
  ];

  return (
    <PurchaseOrderTracker
      steps={steps.map((step) => ({
        label: step.label,
        date: step.timestamp,
        state: step.state,
      }))}
      activeStepIcon="check"
    />
  );
}

function ShippedProgressCard({
  confirmedAt,
  processingAt,
  shippedAt,
}: {
  confirmedAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
}) {
  const steps: Array<{
    label: string;
    timestamp: string;
    state: "completed" | "active" | "pending";
  }> = [
    {
      label: "Confirmed",
      timestamp: confirmedAt ? formatStepTimestamp(confirmedAt) : "-",
      state: "completed",
    },
    {
      label: "Processing",
      timestamp: processingAt ? formatStepTimestamp(processingAt) : "-",
      state: "completed",
    },
    {
      label: "Shipped",
      timestamp: shippedAt ? formatStepTimestamp(shippedAt) : "-",
      state: "active",
    },
    {
      label: "Completed",
      timestamp: "-",
      state: "pending",
    },
  ];

  return <PurchaseOrderTracker steps={steps.map((step) => ({ ...step, date: step.timestamp }))} />;
}

function UploadReceiptProgressCard({
  confirmedAt,
  processingAt,
  shippedAt,
  completedAt,
  activeStepIcon = "number",
  activeStepTone = "blue",
}: {
  confirmedAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  activeStepIcon?: "number" | "check";
  activeStepTone?: "blue" | "navy";
}) {
  const steps: Array<{
    label: string;
    timestamp: string;
    state: "completed" | "active" | "pending";
  }> = [
    {
      label: "Confirmed",
      timestamp: confirmedAt ? formatStepTimestamp(confirmedAt) : "-",
      state: "completed",
    },
    {
      label: "Processing",
      timestamp: processingAt ? formatStepTimestamp(processingAt) : "-",
      state: "completed",
    },
    {
      label: "Shipped",
      timestamp: shippedAt ? formatStepTimestamp(shippedAt) : "-",
      state: "completed",
    },
    {
      label: "Completed",
      timestamp: completedAt ? formatStepTimestamp(completedAt) : "-",
      state: "active",
    },
  ];

  return (
    <PurchaseOrderTracker
      steps={steps.map((step) => ({ ...step, date: step.timestamp }))}
      activeStepIcon={activeStepIcon}
      activeStepTone={activeStepTone}
    />
  );
}

function PaymentReceiptCard({
  receiptFileUrl,
}: {
  receiptFileUrl: string | null;
}) {
  if (!receiptFileUrl) {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-[#E4ECF5] bg-white px-[28px] py-[26px] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-[18px] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[18px] font-medium text-[#334155]">Payment Receipt</p>
          <p className="text-[15px] font-normal text-[#B0B7C3]">
            Payment receipt uploaded. Awaiting supplier verification.
          </p>
        </div>

        <a
          href={receiptFileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-[48px] shrink-0 items-center justify-center rounded-[10px] border border-[#AEB8C7] bg-white px-[30px] text-[15px] font-medium text-[#455468] transition hover:border-[#8F9CAF] hover:text-[#243B68]"
        >
          View Receipt
        </a>
      </div>
    </section>
  );
}

function StatusStepper({
  status,
  timeline,
  activeStepIcon = "number",
}: {
  status: string;
  timeline: Record<string, string | null>;
  activeStepIcon?: "number" | "check";
}) {
  const steps = [
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "completed", label: "Completed" },
  ];
  const safeStatus = status === "cancelled" ? "confirmed" : status;
  const activeIndex = steps.findIndex((step) => step.key === safeStatus);
  const trackerSteps = steps.map((step, index) => ({
    label: step.label,
    date: timeline[step.key] ? formatStepTimestamp(timeline[step.key]) : "-",
    state:
      activeIndex > index
        ? ("completed" as const)
        : activeIndex === index
          ? ("active" as const)
          : ("pending" as const),
  }));

  return <PurchaseOrderTracker steps={trackerSteps} activeStepIcon={activeStepIcon} />;
}

function NotificationCard({
  tone,
  title,
  description,
  children,
}: {
  tone: "blue" | "orange" | "purple" | "red" | "green" | "slate";
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const toneClasses = {
    blue: {
      container: "border-[#9db8ff] bg-[#f7faff]",
      icon: "bg-[#3f73e0] text-white",
      title: "text-[#2b5bc7]",
      description: "text-[#7f90aa]",
    },
    orange: {
      container: "border-[#ffbe92] bg-[#FDFFFE]",
      icon: "bg-[#ff7a1a] text-white",
      title: "text-[#f08b38]",
      description: "text-[#8c97a7]",
    },
    purple: {
      container: "border-[#d4b6fa] bg-[#FDFFFE]",
      icon: "bg-[#6f35d4] text-white",
      title: "text-[#6f35d4]",
      description: "text-[#8c97a7]",
    },
    red: {
      container: "border-[#ffb8b1] bg-[#fff5f4]",
      icon: "bg-[#ff3b30] text-white",
      title: "text-[#da3b2f]",
      description: "text-[#8c97a7]",
    },
    green: {
      container: "border-[#9fd2ae] bg-[#FDFFFE]",
      icon: "bg-[#267c46] text-white",
      title: "text-[#2f7a45]",
      description: "text-[#7f90aa]",
    },
    slate: {
      container: "border-[#d9e1ec] bg-[#fbfcfe]",
      icon: "bg-[#526176] text-white",
      title: "text-[#223654]",
      description: "text-[#8c97a7]",
    },
  }[tone];

  const iconContent =
    tone === "orange" ? (
      <Image
        src="/icons/order_processed.svg"
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px]"
        aria-hidden="true"
      />
    ) : tone === "purple" ? (
      <Image
        src="/icons/order_arrived.svg"
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px]"
        aria-hidden="true"
      />
    ) : tone === "green" ? (
      <Image
        src="/icons/order_arrived.svg"
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px]"
        aria-hidden="true"
      />
    ) : (
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <path
          d="m5.5 10 2.5 2.5 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <section className={`rounded-[18px] border px-4 py-4 ${toneClasses.container}`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-[44px] w-[44px] shrink-0 items-center justify-center ${
            tone === "orange" || tone === "green"
              ? "rounded-[7px]"
              : tone === "purple"
                ? "rounded-[10px]"
                : "rounded-[12px]"
          } ${toneClasses.icon}`}
        >
          {iconContent}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold ${toneClasses.title}`}>{title}</p>
          <p className={`mt-1 text-[13px] leading-5 ${toneClasses.description}`}>
            {description}
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

function ReceiptPreview({
  receiptFileUrl,
  receiptFilePath,
  description,
}: {
  receiptFileUrl: string | null;
  receiptFilePath: string | null;
  description: string;
}) {
  if (!receiptFileUrl) {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-[#e8edf5] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#223654]">Payment Receipt</p>
          <p className="mt-1 text-[13px] text-[#8c97a7]">{description}</p>
        </div>
        <a
          href={receiptFileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d9e1ec] bg-white px-4 text-[13px] font-medium text-[#526176] transition hover:border-[#c5d0df] hover:text-[#223654]"
        >
          View Receipt
        </a>
      </div>

      {isImageFile(receiptFileUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={receiptFileUrl}
          alt="Uploaded receipt"
          className="mt-4 max-h-[300px] w-full rounded-[16px] border border-[#edf1f7] object-contain"
        />
      ) : (
        <div className="mt-4 rounded-[16px] border border-dashed border-[#d7dee8] bg-[#fafbfd] px-4 py-6 text-[13px] text-[#8c97a7]">
          Attached file: {getFileName(receiptFilePath)}
        </div>
      )}
    </section>
  );
}

export default async function BuyerPurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    po_id: string;
  }>;
  searchParams?: Promise<{
    modal?: string;
    receiptError?: string;
    step?: string;
  }>;
}) {
  const resolvedParams = await params;
  const poId = Number(resolvedParams.po_id);

  if (!poId || Number.isNaN(poId)) {
    notFound();
  }

  const order = await getBuyerPurchaseOrderDetail(poId);
  const resolvedSearchParams = (await searchParams) ?? {};
  const receiptError =
    typeof resolvedSearchParams.receiptError === "string"
      ? resolvedSearchParams.receiptError
      : null;
  const currentStep =
    typeof resolvedSearchParams.step === "string" ? resolvedSearchParams.step : null;

  if (!order) {
    notFound();
  }

  const canCancelOrder = ["confirmed", "processing"].includes(order.status);
  const messageSupplierHref = order.conversationId
    ? `/buyer/messages?conversation=${order.conversationId}`
    : "/buyer/messages";
  const supplierProfileHref = order.supplierId
    ? `/buyer/search/${order.supplierId}`
    : messageSupplierHref;
  const supplierReviewHref = `/buyer/purchase-orders/${order.poId}/review`;
  const showCancelModal = resolvedSearchParams.modal === "cancel" && canCancelOrder;
  const referenceCode = getPurchaseOrderCode(order.poId, order.createdAt);
  const placedOnDate = formatDate(order.createdAt);
  const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";
  const supplierSubtitle = buildSupplierSubtitle(
    order.supplierInfo?.businessType ?? null,
    order.supplierInfo?.location ?? null,
  );
  const stepTimeline = {
    confirmed: order.confirmedAt ?? order.createdAt,
    processing: order.status === "processing" ? order.updatedAt : null,
    shipped: order.status === "shipped" ? order.updatedAt : null,
    completed: order.completedAt,
  };
  const orderSummaryTotal =
    order.totalAmount ??
    ((order.subtotal ?? 0) + (order.deliveryFee ?? 0) > 0
      ? (order.subtotal ?? 0) + (order.deliveryFee ?? 0)
      : null);
  const shouldShowReceiptUpload =
    order.status === "shipped" &&
    ["not_uploaded", "rejected"].includes(order.receiptStatus);
  const shouldPromptReceiptConfirmation =
    order.status === "shipped" && order.receiptStatus === "not_uploaded";
  const shouldShowReceiptResubmission =
    order.status === "shipped" && order.receiptStatus === "rejected";
  const shouldShowReceiptPendingReview =
    order.status === "shipped" && order.receiptStatus === "pending_review";
  const shouldShowReceiptApproved =
    order.status === "shipped" && order.receiptStatus === "approved";
  const showCompletedReceipt = order.status === "completed" && Boolean(order.receiptFileUrl);
  const reviewDraft =
    order.status === "completed" ? await getBuyerPurchaseOrderReviewDraft(order.poId) : null;
  const hasSubmittedReview = Boolean(reviewDraft?.existingReview);
  const shouldOpenReceiptUploadStep =
    currentStep === "upload-receipt" || shouldShowReceiptResubmission;
  const notesFromBuyer = [order.additionalNotes, order.quotationNotes]
    .filter(Boolean)
    .join(" ");
  const confirmedNotes = order.additionalNotes || order.specifications || "No additional instructions provided.";
  const processingNotes = confirmedNotes;
  const shippedNotes = confirmedNotes;
  const processingStartedAt = order.updatedAt ?? order.confirmedAt ?? order.createdAt;
  const shippedAt = order.updatedAt ?? order.confirmedAt ?? order.createdAt;
  const uploadReceiptCompletedAt = order.completedAt ?? null;
  const deliveryFeeLabel =
    order.status === "confirmed" && (!order.deliveryFee || order.deliveryFee <= 0)
      ? "Not yet set"
      : formatCurrency(order.deliveryFee);
  const processingDeliveryFeeLabel =
    order.deliveryFee === null || order.deliveryFee === undefined
      ? "Not yet set"
      : formatCurrency(order.deliveryFee);
  const shippedDeliveryFeeLabel = processingDeliveryFeeLabel;

  if (order.status === "completed" && order.receiptFileUrl) {
    return (
      <>
        <main className="mx-auto w-full max-w-[1180px] space-y-5 pb-2">
          <section className="pb-[4px]">
            <nav className="flex flex-wrap items-center gap-2 text-[14px] text-[#A4ACB9]">
              <Link href="/buyer/purchase-orders" className="transition hover:text-[#7f8a99]">
                Purchase Orders
              </Link>
              <span>&gt;</span>
              <span className="font-semibold text-[#506073]">{referenceCode}</span>
            </nav>
          </section>

          <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-[#223654]">{referenceCode}</h1>
              <p className="mt-[3px] text-[15px] text-[#A0A9B8]">
                Placed on {placedOnDate} {"\u00b7"} {supplierName}
              </p>
            </div>

            <div className="pt-[4px]">
              <span className="inline-flex items-center gap-[10px] rounded-full bg-[#DDFBEA] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#249A62]">
                <span className="inline-flex h-[10px] w-[10px] rounded-full bg-[#249A62]" />
                Completed
              </span>
            </div>
          </section>

          <UploadReceiptProgressCard
            confirmedAt={order.confirmedAt ?? order.createdAt}
            processingAt={processingStartedAt}
            shippedAt={shippedAt}
            completedAt={uploadReceiptCompletedAt}
            activeStepIcon={hasSubmittedReview ? "check" : "number"}
            activeStepTone={hasSubmittedReview ? "navy" : "blue"}
          />

          <SupplierInfoCard
            supplierName={supplierName}
            supplierSubtitle={supplierSubtitle}
            supplierProfileHref={supplierProfileHref}
            supplierVerified={Boolean(order.supplierInfo?.verifiedBadge)}
          />

          <OrderSummaryCard
            productName={order.productName}
            quantityLabel={order.quantityLabel}
            pricePerUnit={order.pricePerUnit}
            unit={order.unit}
            subtotal={order.subtotal}
            deliveryFeeLabel={shippedDeliveryFeeLabel}
            totalAmount={orderSummaryTotal}
          />

          <MoreDetailsCard
            deliveryLocation={order.deliveryLocation}
            preferredDeliveryDate={order.preferredDeliveryDate}
            deadline={order.deadline}
            paymentMethod={order.paymentMethod}
            termsAndConditions={order.termsAndConditions}
            notes={shippedNotes}
          />

          <PaymentReceiptCard
            receiptFileUrl={order.receiptFileUrl}
          />

          <NotificationCard
            tone="green"
            title="Order completed successfully"
            description={`This order was fulfilled and marked complete on ${formatDate(
              order.completedAt,
            )}. Total payment collected via COD: ${formatCurrency(orderSummaryTotal)}.`}
          />

          <CompletedOrderActions
            disputeHref={messageSupplierHref}
            reviewHref={supplierReviewHref}
            reviewSubmitted={hasSubmittedReview}
          />
        </main>
      </>
    );
  }

  if (order.status === "confirmed") {
    return (
      <>
        <main className="mx-auto w-full max-w-[1180px] space-y-[14px] pb-2">
          <section className="pb-[4px]">
            <nav className="flex items-center gap-[7px] text-[14px] font-normal text-[#bcc2cb]">
              <Link href="/buyer/purchase-orders" className="transition hover:text-[#7f8a99]">
                Purchase Order
              </Link>
              <span>&gt;</span>
              <span className="text-[#6A717F]">{referenceCode}</span>
            </nav>
          </section>

          <section className="flex items-start justify-between gap-6 pb-[6px]">
            <div>
              <h1 className="text-[20px] font-semibold text-[#223654]">
                {referenceCode}
              </h1>
              <p className="mt-[3px] text-[15px] font-normal leading-none text-[#A0A9B8]">
                Placed on {placedOnDate} {"\u00b7"} {supplierName}
              </p>
            </div>

            <div className="pt-[4px]">
              <span className="inline-flex items-center gap-[10px] rounded-full bg-[#FFF1E7] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#FF7A1A]">
                <span className="h-[10px] w-[10px] rounded-full bg-[#FF7A1A]" />
                Confirmed
              </span>
            </div>
          </section>

          <ConfirmedProgressCard />

          <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E9EEF5] px-[22px] py-[14px]">
              <h2 className="text-[17px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]">
                Supplier Info
              </h2>
            </div>

            <div className="flex items-center justify-between gap-4 px-[22px] py-[25px]">
              <div className={BUYER_SUPPLIER_ROW_CLASS}>
                <div className={BUYER_SUPPLIER_AVATAR_CLASS}>
                  {getInitials(supplierName)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <p className="truncate text-[15px] font-semibold leading-none text-[#223654]">
                      {supplierName}
                    </p>
                    {order.supplierInfo?.verifiedBadge ? <VerifiedBadge /> : null}
                  </div>
                  <p className={BUYER_SUPPLIER_SUBTITLE_CLASS}>
                    {supplierSubtitle || "Supplier details will appear once available."}
                  </p>
                </div>
              </div>

              <Link
                href={supplierProfileHref}
                className={BUYER_SUPPLIER_PROFILE_BUTTON_CLASS}
              >
                View Profile
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E9EEF5] px-[22px] py-[14px]">
              <h2 className="text-[17px] font-semibold uppercase tracking-[0.01em] text-[#223F68]">
                Order Summary
              </h2>
            </div>

            <div className="px-[22px] py-[25px]">
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
                  {formatUnitPrice(order.pricePerUnit, order.unit)}
                </span>
                <span className="text-right font-normal text-[#374151]">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>

              <div className="space-y-[8px] px-[14px] py-[16px]">
                <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                  <span className="col-span-3 text-[15px]">Subtotal</span>
                  <span className="text-right text-[15px]">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                  <span className="col-span-3 text-[15px]">Delivery Fee</span>
                  <span className="text-right text-[15px]">{deliveryFeeLabel}</span>
                </div>
                <div className="mt-[14px] grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] border-t border-[#EDF2F7] pt-[14px] text-[15px] font-semibold text-[#334155]">
                  <span className="col-span-3">TOTAL</span>
                  <span className="text-right text-[17px] font-semibold">
                    {formatCurrency(orderSummaryTotal)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E9EEF5] px-[22px] py-[14px]">
              <h2 className="text-[17px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]">
                More Details
              </h2>
            </div>

            <div className="px-[22px] py-[25px]">
              <div className="grid grid-cols-2 gap-x-[66px] gap-y-[18px]">
                <div>
                  <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                    Deliver To
                  </p>
                  <p className="mt-[2px] text-[16px] font-normal leading-[1.6] text-[#374151]">
                    {order.deliveryLocation || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                    Expected Delivery
                  </p>
                  <p className="mt-[2px] text-[16px] font-normal leading-[1.6] text-[#374151]">
                    {formatDate(order.preferredDeliveryDate ?? order.deadline)}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                    Payment Method
                  </p>
                  <p className="mt-[2px] text-[16px] font-normal leading-[1.6] text-[#374151]">
                    {order.paymentMethod || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                    Payment Terms
                  </p>
                  <p className="mt-[2px] text-[16px] font-normal leading-[1.6] text-[#374151]">
                    {order.termsAndConditions || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-[18px]">
                <p className="text-[14px] font-medium uppercase tracking-[0.02em] text-[#A4AFBF]">
                  Notes From Buyer
                </p>
                <p className="mt-[2px] max-w-[780px] text-[16px] font-normal leading-[1.6] text-[#374151]">
                  {confirmedNotes}
                </p>
              </div>
            </div>
          </section>

          <NotificationCard
            tone="blue"
            title="Purchase Order Sent"
            description="The purchase order has been successfully submitted to the supplier. Please wait for confirmation."
          />

          <div className="flex items-center justify-end gap-[12px] pt-[2px]">
            <Link
              href={buildDetailHref(order.poId, { modal: "cancel" })}
              className={BUYER_PO_CANCEL_BUTTON_CLASS}
            >
              Cancel Order
            </Link>
            <button
              type="button"
              disabled
              className={BUYER_PO_PRIMARY_DISABLED_BUTTON_CLASS}
            >
              Mark as Completed
            </button>
          </div>
        </main>

        {showCancelModal ? (
          <ModalShell
            title="Cancel this order?"
            description="The supplier will be notified and this purchase order will be voided."
            closeHref={buildDetailHref(order.poId)}
            closeLabel="Keep"
            maxWidthClassName="max-w-md"
            panelClassName="rounded-[28px] border border-[#e8edf5] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
            overlayClassName="bg-[#0f172a]/35 p-4"
          >
            <form action={cancelPurchaseOrder} className="mt-2 flex justify-end">
              <input type="hidden" name="poId" value={order.poId} />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#93a4bd] px-5 text-[14px] font-semibold text-white transition hover:bg-[#7f92ae]"
              >
                Cancel Order
              </button>
            </form>
          </ModalShell>
        ) : null}
      </>
    );
  }

  if (order.status === "processing") {
    return (
      <>
        <main className="mx-auto w-full max-w-[1180px] space-y-5 pb-2">
          <section className="pb-[4px]">
            <nav className="flex flex-wrap items-center gap-2 text-[14px] text-[#A4ACB9]">
              <Link href="/buyer/purchase-orders" className="transition hover:text-[#7f8a99]">
                Purchase Orders
              </Link>
              <span>&gt;</span>
              <span className="font-semibold text-[#506073]">{referenceCode}</span>
            </nav>
          </section>

          <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-[#223654]">{referenceCode}</h1>
              <p className="mt-[3px] text-[15px] text-[#A0A9B8]">
                Placed on {placedOnDate} {"\u00b7"} {supplierName}
              </p>
            </div>

            <div className="pt-[4px]">
              <span className="inline-flex items-center gap-[10px] rounded-full bg-[#FFF1E7] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#FF8A2A]">
                <span className="inline-flex h-[10px] w-[10px] rounded-full bg-[#FF8A2A]" />
                Processing
              </span>
            </div>
          </section>

          <ProcessingProgressCard
            confirmedAt={order.confirmedAt ?? order.createdAt}
            processingAt={processingStartedAt}
          />

          <SupplierInfoCard
            supplierName={supplierName}
            supplierSubtitle={supplierSubtitle}
            supplierProfileHref={supplierProfileHref}
            supplierVerified={Boolean(order.supplierInfo?.verifiedBadge)}
          />

          <OrderSummaryCard
            productName={order.productName}
            quantityLabel={order.quantityLabel}
            pricePerUnit={order.pricePerUnit}
            unit={order.unit}
            subtotal={order.subtotal}
            deliveryFeeLabel={processingDeliveryFeeLabel}
            totalAmount={orderSummaryTotal}
          />

          <MoreDetailsCard
            deliveryLocation={order.deliveryLocation}
            preferredDeliveryDate={order.preferredDeliveryDate}
            deadline={order.deadline}
            paymentMethod={order.paymentMethod}
            termsAndConditions={order.termsAndConditions}
            notes={processingNotes}
          />

          <NotificationCard
            tone="orange"
            title="Order is being processed"
            description="You are currently preparing this order. Mark as shipped once it has been dispatched to the buyer."
          />

          <div className="flex items-center justify-end gap-[12px] pt-[2px]">
            <Link
              href={buildDetailHref(order.poId, { modal: "cancel" })}
              className={BUYER_PO_CANCEL_BUTTON_CLASS}
            >
              Cancel Order
            </Link>
            <button
              type="button"
              disabled
              className={BUYER_PO_PRIMARY_DISABLED_BUTTON_CLASS}
            >
              Mark as Completed
            </button>
          </div>
        </main>

        {showCancelModal ? (
          <ModalShell
            title="Cancel this order?"
            description="The supplier will be notified and this purchase order will be voided."
            closeHref={buildDetailHref(order.poId)}
            closeLabel="Keep"
            maxWidthClassName="max-w-md"
            panelClassName="rounded-[28px] border border-[#e8edf5] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
            overlayClassName="bg-[#0f172a]/35 p-4"
          >
            <form action={cancelPurchaseOrder} className="mt-2 flex justify-end">
              <input type="hidden" name="poId" value={order.poId} />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#93a4bd] px-5 text-[14px] font-semibold text-white transition hover:bg-[#7f92ae]"
              >
                Cancel Order
              </button>
            </form>
          </ModalShell>
        ) : null}
      </>
    );
  }

  if (order.status === "shipped") {
    if (shouldOpenReceiptUploadStep) {
      return (
        <>
          <main className="mx-auto w-full max-w-[1180px] space-y-5 pb-2">
            <section className="pb-[4px]">
              <nav className="flex flex-wrap items-center gap-2 text-[14px] text-[#A4ACB9]">
                <Link href="/buyer/purchase-orders" className="transition hover:text-[#7f8a99]">
                  Purchase Orders
                </Link>
                <span>&gt;</span>
                <span className="font-semibold text-[#506073]">{referenceCode}</span>
              </nav>
            </section>

            <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-[#223654]">{referenceCode}</h1>
                <p className="mt-[3px] text-[15px] text-[#A0A9B8]">
                  Placed on {placedOnDate} {"\u00b7"} {supplierName}
                </p>
              </div>

              <div className="pt-[4px]">
                <span className="inline-flex items-center gap-[10px] rounded-full bg-[#DDFBEA] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#249A62]">
                  <span className="h-[10px] w-[10px] rounded-full bg-[#249A62]" />
                  Completed
                </span>
              </div>
            </section>

            <UploadReceiptProgressCard
              confirmedAt={order.confirmedAt ?? order.createdAt}
              processingAt={processingStartedAt}
              shippedAt={shippedAt}
              completedAt={uploadReceiptCompletedAt}
            />

            <SupplierInfoCard
              supplierName={supplierName}
              supplierSubtitle={supplierSubtitle}
              supplierProfileHref={supplierProfileHref}
              supplierVerified={Boolean(order.supplierInfo?.verifiedBadge)}
            />

            <OrderSummaryCard
              productName={order.productName}
              quantityLabel={order.quantityLabel}
              pricePerUnit={order.pricePerUnit}
              unit={order.unit}
              subtotal={order.subtotal}
              deliveryFeeLabel={shippedDeliveryFeeLabel}
              totalAmount={orderSummaryTotal}
            />

            <MoreDetailsCard
              deliveryLocation={order.deliveryLocation}
              preferredDeliveryDate={order.preferredDeliveryDate}
              deadline={order.deadline}
              paymentMethod={order.paymentMethod}
              termsAndConditions={order.termsAndConditions}
              notes={shippedNotes}
            />

            {shouldShowReceiptUpload ? (
              <ReceiptUploadDetailPanel
                poId={order.poId}
                mode={order.receiptStatus === "rejected" ? "resubmit" : "first_upload"}
                currentFileName={order.receiptFilePath ? getFileName(order.receiptFilePath) : null}
                reviewNotes={order.receiptReviewNotes}
                submitAction={uploadPurchaseOrderReceipt}
              />
            ) : null}

            {receiptError ? (
              <NotificationCard
                tone="red"
                title="Receipt upload failed"
                description={receiptError}
              />
            ) : null}

            {shouldShowReceiptPendingReview ? (
              <>
                <ReceiptPreview
                  receiptFileUrl={order.receiptFileUrl}
                  receiptFilePath={order.receiptFilePath}
                  description="Your receipt has been uploaded and is awaiting supplier verification."
                />
                <NotificationCard
                  tone="slate"
                  title="Receipt submitted for review"
                  description="The supplier is reviewing your proof of payment. Once approved, they can proceed with the completion flow."
                />
              </>
            ) : null}

            {shouldShowReceiptApproved ? (
              <>
                <ReceiptPreview
                  receiptFileUrl={order.receiptFileUrl}
                  receiptFilePath={order.receiptFilePath}
                  description="The supplier has approved your uploaded receipt."
                />
                <NotificationCard
                  tone="green"
                  title="Receipt approved"
                  description="Your payment receipt was accepted. The supplier may now complete this purchase order."
                />
              </>
            ) : null}

            <div className="flex items-center justify-end gap-[12px] pt-[2px]">
              <Link
                href={messageSupplierHref}
                className="inline-flex h-[44px] items-center justify-center px-[6px] text-[14px] font-semibold text-[#ff5a47] transition hover:text-[#ef4638]"
              >
                Raise Dispute
              </Link>
              <button
                type="button"
                disabled
                className={BUYER_PO_PRIMARY_DISABLED_BUTTON_CLASS}
              >
                Mark as Completed
              </button>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        <main className="mx-auto w-full max-w-[1042px] space-y-[10px] pb-2">
          <section className="pb-[4px]">
            <nav className="flex items-center gap-[7px] text-[11px] font-medium text-[#bcc2cb]">
              <Link href="/buyer/purchase-orders" className="transition hover:text-[#7f8a99]">
                Purchase Order
              </Link>
              <span>&gt;</span>
              <span>{referenceCode}</span>
            </nav>
          </section>

          <section className="flex items-start justify-between gap-6 pb-[6px]">
            <div>
              <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#455060]">
                {referenceCode}
              </h1>
              <p className="mt-[5px] text-[14px] font-normal leading-none text-[#c1c6cf]">
                Placed on {placedOnDate} {"\u00b7"} {supplierName}
              </p>
            </div>

            <div className="pt-[4px]">
              <span className="inline-flex items-center gap-[10px] rounded-full bg-[#F5E8FF] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#A54FF6]">
                <span className="inline-flex h-[10px] w-[10px] rounded-full bg-[#A54FF6]" />
                Shipped
              </span>
            </div>
          </section>

          <ShippedProgressCard
            confirmedAt={order.confirmedAt ?? order.createdAt}
            processingAt={order.confirmedAt ?? null}
            shippedAt={shippedAt}
          />

            <SupplierInfoCard
              supplierName={supplierName}
              supplierSubtitle={supplierSubtitle}
              supplierProfileHref={supplierProfileHref}
              supplierVerified={Boolean(order.supplierInfo?.verifiedBadge)}
            />

            <OrderSummaryCard
              productName={order.productName}
              quantityLabel={order.quantityLabel}
              pricePerUnit={order.pricePerUnit}
              unit={order.unit}
              subtotal={order.subtotal}
              deliveryFeeLabel={shippedDeliveryFeeLabel}
              totalAmount={orderSummaryTotal}
            />

            <MoreDetailsCard
              deliveryLocation={order.deliveryLocation}
              preferredDeliveryDate={order.preferredDeliveryDate}
              deadline={order.deadline}
              paymentMethod={order.paymentMethod}
              termsAndConditions={order.termsAndConditions}
              notes={shippedNotes}
            />

            <NotificationCard
              tone="purple"
              title="Order on its way"
              description={`Order was dispatched on ${formatDate(
                shippedAt,
              )}. Waiting for the buyer to confirm receipt. Collect COD payment upon delivery.`}
            />

          <div className="flex items-center justify-end gap-[12px] pt-[2px]">
            <Link
              href="/buyer/purchase-orders"
              className="inline-flex h-[44px] items-center justify-center px-[6px] text-[14px] font-semibold text-[#ff5a47] transition hover:text-[#ef4638]"
            >
              Back to Orders
            </Link>
            {shouldPromptReceiptConfirmation ? (
              <Link
                href={buildDetailHref(order.poId, { step: "upload-receipt" })}
                className="inline-flex h-[44px] min-w-[132px] items-center justify-center rounded-[8px] bg-[#6f35d4] px-[18px] text-[14px] font-semibold text-white transition hover:bg-[#5f2abd]"
              >
                Confirm Receipt
              </Link>
            ) : null}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1180px] space-y-5 pb-2">
        <nav className="flex flex-wrap items-center gap-2 text-[14px] text-[#A4ACB9]">
          <Link href="/buyer/purchase-orders" className="transition hover:text-[#526176]">
            Purchase Orders
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-[#506073]">{referenceCode}</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[#223654]">
              {referenceCode}
            </h1>
            <p className="mt-[3px] text-[15px] text-[#A0A9B8]">
              Placed on {placedOnDate} {"\u00b7"} {supplierName}
            </p>
          </div>

          <span className="inline-flex items-center gap-[10px] rounded-full bg-[#DDFBEA] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#249A62]">
            <span className="inline-flex h-[10px] w-[10px] rounded-full bg-[#249A62]" />
            Completed
          </span>
        </div>

        <StatusStepper
          status={order.status}
          timeline={stepTimeline}
          activeStepIcon={hasSubmittedReview ? "check" : "number"}
        />

        <SectionCard title="Supplier Info">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className={BUYER_SUPPLIER_ROW_CLASS}>
              <div className={BUYER_SUPPLIER_AVATAR_CLASS}>
                {getInitials(supplierName)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="text-[15px] font-semibold text-[#223654]">
                    {supplierName}
                  </p>
                  {order.supplierInfo?.verifiedBadge ? <VerifiedBadge /> : null}
                </div>

                <p className={BUYER_SUPPLIER_SUBTITLE_CLASS}>
                  {supplierSubtitle || "Supplier details will appear once available."}
                </p>
              </div>
            </div>

            <Link
              href={supplierProfileHref}
              className={BUYER_SUPPLIER_PROFILE_BUTTON_CLASS}
            >
              View Profile
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Order Summary">
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
                {formatCurrency(order.subtotal)}
              </span>
            </div>

            <div className="space-y-[8px] px-[14px] py-[16px]">
              <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                <span className="col-span-3 text-[15px]">Subtotal</span>
                <span className="text-right text-[15px]">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] font-normal text-[#B5BCC8]">
                <span className="col-span-3 text-[15px]">Delivery Fee</span>
                <span className="text-right text-[15px]">{deliveryFeeLabel}</span>
              </div>
              <div className="mt-[14px] grid grid-cols-[2.7fr_0.55fr_0.75fr_0.7fr] items-center gap-[8px] border-t border-[#EDF2F7] pt-[14px] text-[15px] font-semibold text-[#334155]">
                <span className="col-span-3">TOTAL</span>
                <span className="text-right text-[17px] font-semibold">
                  {formatCurrency(orderSummaryTotal)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="More Details">
          <div className="grid gap-5 md:grid-cols-2">
            <DetailMetric label="Deliver To" value={order.deliveryLocation || "Not specified"} />
            <DetailMetric
              label="Expected Delivery"
              value={formatDate(order.preferredDeliveryDate)}
            />
            <DetailMetric label="Payment Method" value={order.paymentMethod || "Not specified"} />
            <DetailMetric
              label="Payment Terms"
              value={order.termsAndConditions || "Not specified"}
            />
          </div>

          <div className="mt-[18px]">
            <DetailMetric
              label="Notes From Buyer"
              value={notesFromBuyer || "No additional instructions provided."}
            />
          </div>
        </SectionCard>

        {order.status === "confirmed" ? (
          <NotificationCard
            tone="blue"
            title="Purchase order sent"
            description="The purchase order has been submitted to the supplier. Please wait for them to confirm and begin preparing your order."
          />
        ) : null}

        {order.status === "processing" ? (
          <NotificationCard
            tone="orange"
            title="Order is being processed"
            description="Your supplier is currently preparing this order. You will be notified once it has been dispatched."
          />
        ) : null}

        {receiptError ? (
          <NotificationCard
            tone="red"
            title="Receipt upload failed"
            description={receiptError}
          />
        ) : null}

        {order.status === "shipped" && order.receiptStatus === "not_uploaded" ? (
          <>
            <NotificationCard
              tone="purple"
              title="Order on its way"
              description="This order has been dispatched by the supplier. Once it is delivered and payment is completed, upload the receipt to continue the order."
            />
              <ReceiptUploadWidget
                poId={order.poId}
                mode="first_upload"
                existingReceiptFilePath={order.receiptFilePath}
                submitAction={uploadPurchaseOrderReceipt}
              />
          </>
        ) : null}

        {shouldShowReceiptPendingReview ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="Your receipt has been uploaded and is awaiting supplier verification."
            />
            <NotificationCard
              tone="slate"
              title="Receipt submitted for review"
              description="The supplier is reviewing your proof of payment. Once approved, they can mark this order as completed."
            />
          </>
        ) : null}

        {shouldShowReceiptUpload && order.receiptStatus === "rejected" ? (
          <>
            {order.receiptFileUrl ? (
              <ReceiptPreview
                receiptFileUrl={order.receiptFileUrl}
                receiptFilePath={order.receiptFilePath}
                description="Previously submitted receipt."
              />
            ) : null}
              <ReceiptUploadWidget
                poId={order.poId}
                mode="resubmit"
                reviewNotes={order.receiptReviewNotes}
                currentFileName={getFileName(order.receiptFilePath)}
                existingReceiptFilePath={order.receiptFilePath}
                submitAction={uploadPurchaseOrderReceipt}
            />
          </>
        ) : null}

        {shouldShowReceiptApproved ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="The supplier has approved your uploaded receipt."
            />
            <NotificationCard
              tone="green"
              title="Receipt approved"
              description="Your payment receipt was accepted. The supplier may now mark the order as completed."
            />
          </>
        ) : null}

        {showCompletedReceipt ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="Receipt uploaded and accepted for this purchase order."
            />
            <NotificationCard
              tone="green"
              title="Order completed successfully"
              description={`This order was fulfilled and marked complete on ${formatDate(
                order.completedAt,
              )}. Total payment collected: ${formatCurrency(orderSummaryTotal)}.`}
            />
          </>
        ) : null}

        {order.status === "cancelled" ? (
          <NotificationCard
            tone="red"
            title="Order cancelled"
            description="This purchase order has been cancelled and is no longer active."
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={messageSupplierHref}
              className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white px-[22px] text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
            >
              Message Supplier
            </Link>
            <Link
              href="/buyer/purchase-orders"
              className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#D6DFEA] bg-white px-[22px] text-[14px] font-medium text-[#8A97A8] transition hover:border-[#B9C7D8] hover:text-[#243B68]"
            >
              Back to Orders
            </Link>
          </div>

          {canCancelOrder ? (
            <Link
              href={buildDetailHref(order.poId, { modal: "cancel" })}
              className={BUYER_PO_CANCEL_BUTTON_CLASS}
            >
              Cancel Order
            </Link>
          ) : null}
        </div>
      </main>

      {showCancelModal ? (
        <ModalShell
          title="Cancel this order?"
          description="The supplier will be notified and this purchase order will be voided."
          closeHref={buildDetailHref(order.poId)}
          closeLabel="Keep"
          maxWidthClassName="max-w-md"
          panelClassName="rounded-[28px] border border-[#e8edf5] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
          overlayClassName="bg-[#0f172a]/35 p-4"
        >
          <form action={cancelPurchaseOrder} className="mt-2 flex justify-end">
            <input type="hidden" name="poId" value={order.poId} />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#93a4bd] px-5 text-[14px] font-semibold text-white transition hover:bg-[#7f92ae]"
            >
              Cancel Order
            </button>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
