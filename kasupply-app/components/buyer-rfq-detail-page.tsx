import Image from "next/image";
import Link from "next/link";
import type { BuyerRfqDetailsData } from "@/lib/buyer/rfq-workflows";
import { BuyerRfqCancelAction } from "@/components/buyer-rfq-cancel-action";
import { BuyerRfqDeclineQuoteAction } from "@/components/buyer-rfq-decline-quote-action";
import {
  acceptQuote,
  declineQuote,
} from "@/app/buyer/(protected)/rfqs/[rfqId]/actions";

type BuyerRfqDetailPageProps = {
  data: BuyerRfqDetailsData;
};

type DetailStateKey = "pending" | "responded" | "confirmed" | "closed";
type StatusAction =
  | {
      kind: "submit";
      label: string;
      className: string;
    }
  | {
      kind: "link";
      label: string;
      href: string;
      className: string;
    }
  | {
      kind: "button";
      label: string;
      className: string;
    };

const RFQ_BREADCRUMB_CLASS = "flex items-center gap-[7px] text-[14px] font-normal text-[#bcc2cb]";
const RFQ_TITLE_CLASS = "text-[23px] font-semibold tracking-[-0.04em] text-[#455060]";
const RFQ_META_CLASS = "mt-[3px] text-[15px] font-normal leading-none text-[#c1c6cf]";
const RFQ_STATUS_BADGE_CLASS = "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[15px] font-medium leading-none";
const RFQ_SECTION_HEADING_CLASS = "text-[12px] font-semibold uppercase leading-none text-[#27456f]";
const RFQ_CARD_SECTION_HEADING_CLASS = "text-[17px] font-[600] uppercase leading-none text-[#27456f]";
const RFQ_SECTION_HEADER_ROW_CLASS = "border-b border-[#f0f2f5] px-[16px] py-[12px]";
const RFQ_MAIN_CARD_HEADER_ROW_CLASS = "border-b border-[#f0f2f5] px-[16px] py-[17px]";
const RFQ_SUPPLIER_NAME_CLASS = "truncate text-[16px] font-[500] leading-none text-[#5d6778]";
const RFQ_SUPPLIER_SUBTITLE_CLASS = "mt-[6px] truncate text-[14px] font-normal leading-none text-[#a7aebb]";
const RFQ_SUPPLIER_NOTE_CARD_CLASS =
  "mt-[10px] min-h-[92px] rounded-[12px] border border-[#e7ebf1] bg-[rgba(162,168,179,0.08)] px-[20px] py-[18px]";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatQuantity(quantity: number, unit: string) {
  return `${new Intl.NumberFormat("en-PH").format(quantity)} ${unit}`;
}

function formatTargetPrice(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) {
    return "Open budget";
  }

  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `\u20b1${amount} / ${unit}`;
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getReferenceCode(rfqId: number, createdAt: string) {
  const createdDate = new Date(createdAt);
  const year = Number.isNaN(createdDate.getTime())
    ? new Date().getFullYear()
    : createdDate.getFullYear();

  return `RFQ-${year}-${String(rfqId).padStart(3, "0")}`;
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "RF";
}

function getDetailState(data: BuyerRfqDetailsData): DetailStateKey {
  const normalizedStatus = data.rfq.status.toLowerCase();
  const hasAcceptedQuotation = data.engagements.some(
    (engagement) =>
      engagement.acceptedQuotation != null ||
      engagement.status.toLowerCase() === "accepted",
  );
  const hasSupplierResponse = data.engagements.some(
    (engagement) =>
      engagement.quotations.length > 0 ||
      engagement.latestSupplierOffer != null ||
      ["quoted", "negotiating", "accepted"].includes(engagement.status.toLowerCase()),
  );

  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "closed" ||
    data.purchaseOrder != null
  ) {
    return "closed";
  }

  if (normalizedStatus === "fulfilled" || hasAcceptedQuotation) {
    return "confirmed";
  }

  if (hasSupplierResponse) {
    return "responded";
  }

  return "pending";
}

function getStatusBadgeClasses(state: DetailStateKey) {
  if (state === "confirmed") {
    return "bg-[#edf9f1] text-[#2d9b63]";
  }

  if (state === "responded") {
    return "bg-[#eaf0ff] text-[#4673f4]";
  }

  if (state === "closed") {
    return "bg-[#eef1f5] text-[#5b6472]";
  }

  return "bg-[#fff2e8] text-[#f58a33]";
}

function getStatusDotClasses(state: DetailStateKey) {
  if (state === "confirmed") {
    return "bg-[#2d9b63]";
  }

  if (state === "responded") {
    return "bg-[#4673f4]";
  }

  if (state === "closed") {
    return "bg-[#5b6472]";
  }

  return "bg-[#f58a33]";
}

function getStatusLabel(state: DetailStateKey) {
  if (state === "confirmed") {
    return "Confirmed";
  }

  if (state === "responded") {
    return "Responded";
  }

  if (state === "closed") {
    return "Closed";
  }

  return "Pending";
}

function getProgressStep(state: DetailStateKey) {
  if (state === "confirmed") {
    return 3;
  }

  if (state === "responded") {
    return 2;
  }

  if (state === "closed") {
    return 4;
  }

  return 1;
}

function VerifiedBadge() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full border border-[#94cfaa] bg-[#f5fbf6] px-[6px] text-[10px] font-semibold leading-none text-[#4f996e]">
      Verified
    </span>
  );
}

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" aria-hidden="true">
      <path
        d="M3.5 8.1 6.4 11l6.1-6.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon({ state }: { state: DetailStateKey }) {
  if (state === "pending") {
    return (
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[8px] bg-[#FF7C22]">
        <Image
          src="/icons/clock.svg"
          alt=""
          width={25}
          height={25}
          aria-hidden="true"
        />
      </span>
    );
  }

  const className =
    state === "confirmed"
      ? "bg-[#2f9b63]"
      : state === "responded"
        ? "bg-[#4673f4]"
        : state === "closed"
          ? "bg-[#6d7684]"
          : "bg-[#ff7c22]";

  const symbol =
    state === "confirmed" ? "+" : state === "responded" ? ">" : state === "closed" ? "-" : "!";

  return (
    <span
      className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold text-white ${className}`}
    >
      {symbol}
    </span>
  );
}

function ConfirmationAlertIcon() {
  return (
    <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[8px] bg-[#2b814f] text-white">
      <StepCheckIcon />
    </span>
  );
}

function ClosedAlertIcon() {
  return (
    <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[#8c95a4] text-white">
      <StepCheckIcon />
    </span>
  );
}

function getAlertBoxClasses(state: DetailStateKey) {
  if (state === "confirmed") {
    return "border-[#9ed1ae] bg-[#f7fcf8]";
  }

  if (state === "responded") {
    return "border-[#aec3ff] bg-[#f7f9ff]";
  }

  if (state === "closed") {
    return "border-[#d7dce4] bg-[#fafbfd]";
  }

  return "border-[#ffa56c] bg-[#fffaf6]";
}

function getAlertHeadlineClasses(state: DetailStateKey) {
  if (state === "confirmed") {
    return "text-[#2f8f60]";
  }

  if (state === "responded") {
    return "text-[#4673f4]";
  }

  if (state === "closed") {
    return "text-[#6d7684]";
  }

  return "text-[#ff8a30]";
}

function getStatusCopy(params: {
  state: DetailStateKey;
  data: BuyerRfqDetailsData;
  supplierName: string;
}): {
  sectionTitle: string;
  headline: string;
  message: string;
  action: StatusAction;
} {
  const { data, state, supplierName } = params;
  const acceptedEngagement =
    data.engagements.find(
      (engagement) =>
        engagement.acceptedQuotation != null ||
        engagement.status.toLowerCase() === "accepted",
    ) ?? null;
  const acceptedQuote = acceptedEngagement?.acceptedQuotation ?? null;
  const activeResponseEngagement =
    acceptedEngagement ??
    data.engagements.find(
      (engagement) =>
        engagement.quotations.length > 0 ||
        engagement.latestSupplierOffer != null ||
        engagement.status.toLowerCase() === "quoted",
    ) ??
    data.engagements[0] ??
    null;
  const latestQuotation = activeResponseEngagement?.quotations[0] ?? null;
  const latestOffer = activeResponseEngagement?.latestSupplierOffer ?? null;

  if (state === "confirmed") {
    const acceptedAt = formatDate(acceptedQuote?.createdAt ?? data.rfq.createdAt);
    const agreedTerms = acceptedQuote
      ? `${formatTargetPrice(acceptedQuote.pricePerUnit, data.rfq.unit)} for ${formatQuantity(
          acceptedQuote.quantity,
          data.rfq.unit,
        )}`
      : "the agreed quotation terms";

    return {
      sectionTitle: "Confirmed",
      headline: "Supplier confirmed the order terms",
      message: `${supplierName} confirmed this RFQ on ${acceptedAt}. The agreed terms are ${agreedTerms}. You can proceed with the next fulfillment step.`,
      action: {
        kind: "link",
        label: "Proceed To PO",
        href: "/buyer/purchase-orders",
        className: "border-[#9ed1ae] text-[#2f8f60] hover:bg-[#f5fbf6]",
      },
    };
  }

  if (state === "responded") {
    const responseDate = formatDate(
      latestQuotation?.createdAt ?? latestOffer?.createdAt ?? data.rfq.createdAt,
    );
    const responseTerms = latestQuotation
      ? `Latest quote: ${formatTargetPrice(
          latestQuotation.pricePerUnit,
          data.rfq.unit,
        )} for ${formatQuantity(latestQuotation.quantity, data.rfq.unit)}.`
      : latestOffer && latestOffer.pricePerUnit != null && latestOffer.quantity != null
        ? `Latest supplier offer: ${formatTargetPrice(
            latestOffer.pricePerUnit,
            data.rfq.unit,
          )} for ${formatQuantity(latestOffer.quantity, data.rfq.unit)}.`
        : "A supplier response is ready for your review.";

    return {
      sectionTitle: "Supplier Response",
      headline: "Supplier submitted a quote",
      message: `${supplierName} responded on ${responseDate}. ${responseTerms} You can continue reviewing and negotiating from this RFQ.`,
      action: {
        kind: activeResponseEngagement?.conversationId ? "link" : "button",
        label: activeResponseEngagement?.conversationId ? "Open Messages" : "Review Quote",
        href:
          activeResponseEngagement?.conversationId != null
            ? `/buyer/messages?conversation=${activeResponseEngagement.conversationId}`
            : "",
        className: "border-[#a9befd] text-[#4673f4] hover:bg-[#f4f7ff]",
      } as StatusAction,
    };
  }

  if (state === "closed") {
    if (data.purchaseOrder) {
      const poDate = formatDate(data.purchaseOrder.confirmedAt ?? data.purchaseOrder.createdAt);

      return {
        sectionTitle: "RFQ Closed",
        headline: "This request has moved to purchase order",
        message: `This RFQ is now closed because Purchase Order #${data.purchaseOrder.poId} was created on ${poDate}. The supplier flow has already advanced beyond RFQ review.`,
        action: {
          kind: "link",
          label: "View Purchase Order",
          href: `/buyer/purchase-orders/${data.purchaseOrder.poId}`,
          className: "border-[#d5dae3] text-[#6d7684] hover:bg-[#fafbfc]",
        },
      };
    }

    if (data.rfq.status.toLowerCase() === "cancelled") {
      return {
        sectionTitle: "RFQ Closed",
        headline: "This request has been cancelled",
        message: `This RFQ was cancelled after being sent to ${supplierName}. No further supplier action is expected for this request.`,
        action: {
          kind: "link",
          label: "Back To RFQs",
          href: "/buyer/rfqs",
          className: "border-[#d5dae3] text-[#6d7684] hover:bg-[#fafbfc]",
        },
      };
    }

    return {
      sectionTitle: "RFQ Closed",
      headline: "This request has been closed",
      message: `This RFQ is no longer active. ${supplierName} has already completed or closed the request, so no further supplier action is expected.`,
      action: {
        kind: "link",
        label: "Back To RFQs",
        href: "/buyer/rfqs",
        className: "border-[#d5dae3] text-[#6d7684] hover:bg-[#fafbfc]",
      },
    };
  }

  return {
    sectionTitle: "Awaiting Response",
    headline: "Waiting for supplier's quote",
    message: `Your RFQ was sent to ${supplierName} on ${formatShortDate(
      data.rfq.createdAt,
    )}. Suppliers typically respond within 1\u20132 business days.`,
    action: {
      kind: "submit",
      label: "Cancel RFQ",
      className: "border-[#ff9586] text-[#ff5a44] hover:bg-[#fff7f5]",
    },
  };
}

function ProgressTracker({ activeStep }: { activeStep: number }) {
  const steps = ["Sent", "Responded", "Confirmed", "PO Sent"];

  return (
    <div className="flex w-full items-center pl-[6px]">
      {steps.map((stepLabel, index) => {
        const stepNumber = index + 1;
        const isComplete = activeStep > stepNumber;
        const isCurrent = activeStep === stepNumber;
        const isActive = isComplete || isCurrent;
        const isConnectorActive =
          activeStep > stepNumber || (activeStep === 1 && stepNumber === 1);

        return (
          <div
            key={stepLabel}
            className={index < steps.length - 1 ? "flex min-w-0 flex-1 items-center" : "flex shrink-0 items-center"}
          >
            <div className="flex items-center gap-[8px]">
              <span
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-full text-[13px] font-medium leading-none ${
                  isActive ? "bg-[#233f68] text-white" : "bg-[#e7e7e7] text-[#ffffff]"
                }`}
              >
                {isComplete ? <StepCheckIcon /> : stepNumber}
              </span>
              <span
                className={`text-[15px] font-medium leading-none ${
                  isActive ? "text-[#27456f]" : "text-[#d9d7d3]"
                }`}
              >
                {stepLabel}
              </span>
            </div>

            {index < steps.length - 1 ? (
              <span
                className={`ml-[16px] mr-[18px] block h-[1.5px] min-w-[96px] flex-1 ${
                  isConnectorActive ? "bg-[#233f68]" : "bg-[#efefef]"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[14px] font-medium uppercase leading-none text-[#b8bec8]">
        {label}
      </p>
      <p className="mt-[5px] text-[16px] font-[500] leading-[1.35] text-[#4c5767]">
        {value}
      </p>
    </div>
  );
}

function QuoteMetric({
  label,
  value,
  labelClassName = "text-[#1A6B3C]",
}: {
  label: string;
  value: string;
  labelClassName?: string;
}) {
  return (
    <div className="min-h-[104px] rounded-[10px] border border-[#e7ebf1] bg-[rgba(162,168,179,0.08)] px-[16px] py-[20px] shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
      <p className={`text-[14px] font-[500] uppercase leading-none ${labelClassName}`}>
        {label}
      </p>
      <p className="mt-[5px] text-[16px] font-normal leading-[1.35] text-[#4c5767]">
        {value}
      </p>
    </div>
  );
}

function MessageSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[27px] w-[27px]" aria-hidden="true">
      <path
        d="M7.25 7.25h9.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-5.1l-3.5 2.78v-2.78h-.9a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z"
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
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" aria-hidden="true">
      <path
        d="M9 6.75 14.25 12 9 17.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BuyerRfqDetailPage({ data }: BuyerRfqDetailPageProps) {
  const detailState = getDetailState(data);
  const primaryEngagement =
    data.engagements.find(
      (engagement) =>
        engagement.acceptedQuotation != null ||
        engagement.status.toLowerCase() === "accepted" ||
        engagement.quotations.length > 0 ||
        engagement.status.toLowerCase() === "quoted",
    ) ??
    data.engagements[0] ??
    null;
  const supplierName =
    primaryEngagement?.supplierName ??
    data.requestMatches.suppliers[0]?.supplierName ??
    "Awaiting supplier";
  const supplierVerified =
    primaryEngagement?.verifiedBadge ??
    data.requestMatches.suppliers[0]?.verifiedBadge ??
    false;
  const supplierSubtitle = [
    primaryEngagement?.businessType,
    primaryEngagement?.locationLabel,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  const referenceCode = getReferenceCode(data.rfq.rfqId, data.rfq.createdAt);
  const statusCopy = getStatusCopy({
    data,
    supplierName,
    state: detailState,
  });
  const title = `${data.rfq.productName} \u2014 ${formatQuantity(
    data.rfq.quantity,
    data.rfq.unit,
  )}`;
  const preferredDelivery = formatDate(
    data.rfq.preferredDeliveryDate ?? data.rfq.deadline,
  );
  const respondedEngagement =
    data.engagements.find(
      (engagement) =>
        engagement.quotations.length > 0 ||
        engagement.latestSupplierOffer != null ||
        engagement.status.toLowerCase() === "quoted",
    ) ?? primaryEngagement;
  const acceptedEngagement =
    data.engagements.find(
      (engagement) =>
        engagement.acceptedQuotation != null ||
        engagement.status.toLowerCase() === "accepted",
    ) ?? null;
  const acceptedQuote = acceptedEngagement?.acceptedQuotation ?? null;
  const respondedQuote = respondedEngagement?.quotations[0] ?? null;
  const respondedOffer = respondedEngagement?.latestSupplierOffer ?? null;
  const quotePrice =
    respondedQuote?.pricePerUnit ??
    (respondedOffer?.pricePerUnit != null ? respondedOffer.pricePerUnit : null);
  const quoteQuantity =
    respondedQuote?.quantity ??
    (respondedOffer?.quantity != null ? respondedOffer.quantity : null);
  const quoteMoq =
    respondedQuote?.moq ?? (respondedOffer?.moq != null ? respondedOffer.moq : null);
  const quoteLeadTime = respondedQuote?.leadTime ?? respondedOffer?.leadTime ?? "Not set";
  const quoteNote =
    respondedQuote?.notes ?? respondedOffer?.notes ?? "No supplier note provided.";
  const quoteTotalAmount =
    quotePrice != null && quoteQuantity != null ? quotePrice * quoteQuantity : null;
  const confirmedQuotePrice = acceptedQuote?.pricePerUnit ?? null;
  const confirmedQuoteQuantity = acceptedQuote?.quantity ?? null;
  const confirmedQuoteMoq = acceptedQuote?.moq ?? null;
  const confirmedQuoteLeadTime = acceptedQuote?.leadTime ?? "Not set";
  const confirmedQuoteNote = acceptedQuote?.notes ?? "No supplier note provided.";
  const confirmedQuoteTotalAmount =
    confirmedQuotePrice != null && confirmedQuoteQuantity != null
      ? confirmedQuotePrice * confirmedQuoteQuantity
      : null;
  const agreedDate = formatShortDate(acceptedQuote?.createdAt ?? data.rfq.createdAt);
  const closedQuotePrice = confirmedQuotePrice ?? quotePrice;
  const closedQuoteQuantity = confirmedQuoteQuantity ?? quoteQuantity;
  const closedQuoteMoq = confirmedQuoteMoq ?? quoteMoq;
  const closedQuoteLeadTime =
    acceptedQuote?.leadTime ?? respondedQuote?.leadTime ?? respondedOffer?.leadTime ?? "Not set";
  const closedQuoteNote =
    acceptedQuote?.notes ?? respondedQuote?.notes ?? respondedOffer?.notes ?? "No supplier note provided.";
  const closedQuoteTotalAmount =
    closedQuotePrice != null && closedQuoteQuantity != null
      ? closedQuotePrice * closedQuoteQuantity
      : null;
  const closedDateSource =
    data.purchaseOrder?.confirmedAt ??
    data.purchaseOrder?.createdAt ??
    acceptedQuote?.createdAt ??
    data.rfq.createdAt;
  const closedDate = formatShortDate(closedDateSource);
  const closedDateLong = formatDate(closedDateSource);
  const purchaseOrderHref =
    acceptedQuote != null
      ? `/buyer/purchase-orders?rfqId=${data.rfq.rfqId}&quoteId=${acceptedQuote.quoteId}`
      : "/buyer/purchase-orders";
  const newRfqHref =
    primaryEngagement != null
      ? `/buyer/rfqs/new?supplierId=${primaryEngagement.supplierId}${
          data.rfq.productId != null ? `&productId=${data.rfq.productId}` : ""
        }`
      : "/buyer/rfqs/new";
  const showClosedSummary =
    detailState === "closed" &&
    data.rfq.status.toLowerCase() !== "cancelled" &&
    (acceptedQuote != null || data.purchaseOrder != null || closedQuotePrice != null);
  const negotiationHref =
    respondedEngagement?.conversationId != null
      ? `/buyer/messages?conversation=${respondedEngagement.conversationId}`
      : respondedEngagement != null
        ? `/buyer/messages?supplierId=${respondedEngagement.supplierId}&engagementId=${respondedEngagement.engagementId}`
        : "/buyer/messages";

  return (
    <main className="mx-auto w-full max-w-[1120px] pb-5 pt-[2px]">
      <section className="pb-[10px]">
        <nav className={RFQ_BREADCRUMB_CLASS}>
          <Link href="/buyer/rfqs" className="transition hover:text-[#7f8a99]">
            My RFQs
          </Link>
          <span>&gt;</span>
          <span className="text-[14px] font-normal text-[#6A717F]">{referenceCode}</span>
        </nav>
      </section>

      <section className="flex items-start justify-between gap-6 pb-[20px]">
        <div>
          <h1 className={RFQ_TITLE_CLASS}>{title}</h1>
          <p className={RFQ_META_CLASS}>
            {referenceCode} {"\u00b7"} Sent {formatDate(data.rfq.createdAt)}
          </p>
        </div>

        <div className="pt-[4px]">
          <span
            className={`${RFQ_STATUS_BADGE_CLASS} ${getStatusBadgeClasses(detailState)}`}
          >
            <span
              className={`h-[7px] w-[7px] rounded-full ${getStatusDotClasses(
                detailState,
              )}`}
            />
            {getStatusLabel(detailState)}
          </span>
        </div>
      </section>

      <section className="pb-[28px]">
        <ProgressTracker activeStep={getProgressStep(detailState)} />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className={RFQ_MAIN_CARD_HEADER_ROW_CLASS}>
          <h2 className={RFQ_CARD_SECTION_HEADING_CLASS}>Supplier Info</h2>
        </div>

        <div className="flex items-center justify-between gap-4 px-[18px] py-[16px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#eefaf3] text-[22px] font-medium leading-none text-[#4f9b72]">
              {getInitials(supplierName)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-[6px]">
                <p className={RFQ_SUPPLIER_NAME_CLASS}>{supplierName}</p>
                {supplierVerified ? <VerifiedBadge /> : null}
              </div>
              <p className={RFQ_SUPPLIER_SUBTITLE_CLASS}>
                {supplierSubtitle || "Supplier details will appear once available."}
              </p>
            </div>
          </div>

          <Link
            href={
              primaryEngagement ? `/buyer/search/${primaryEngagement.supplierId}` : "/buyer/search"
            }
            className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[#e2e5ea] bg-white px-[18px] text-[13px] font-semibold text-[#5f6877] transition hover:bg-[#f8fafc]"
          >
            View Profile
          </Link>
        </div>
      </section>

      <section className="mt-[10px] overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className={RFQ_MAIN_CARD_HEADER_ROW_CLASS}>
          <h2 className={RFQ_CARD_SECTION_HEADING_CLASS}>RFQ Details</h2>
        </div>

        <div className="px-[16px] py-[16px]">
          <div className="grid grid-cols-2 gap-x-[66px] gap-y-[18px]">
            <Field label="Product" value={data.rfq.productName} />
            <Field label="Quantity" value={formatQuantity(data.rfq.quantity, data.rfq.unit)} />
            <Field
              label="Target Price"
              value={formatTargetPrice(data.rfq.targetPricePerUnit, data.rfq.unit)}
            />
            <Field label="Preferred Delivery" value={preferredDelivery} />
          </div>

          <div className="mt-[18px]">
            <Field
              label="Delivery Location"
              value={data.rfq.deliveryLocation || "Not specified"}
            />
          </div>

          <div className="mt-[18px]">
            <Field
              label="Notes"
              value={data.rfq.specifications || "No notes provided."}
              className="max-w-[770px]"
            />
          </div>
        </div>
      </section>

      {detailState !== "responded" && detailState !== "confirmed" && !showClosedSummary ? (
        <section className="mt-[10px] overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
          <div
            className={
              detailState === "pending"
                ? RFQ_MAIN_CARD_HEADER_ROW_CLASS
                : RFQ_SECTION_HEADER_ROW_CLASS
            }
          >
            <h2
              className={
                detailState === "pending"
                  ? RFQ_CARD_SECTION_HEADING_CLASS
                  : RFQ_SECTION_HEADING_CLASS
              }
            >
              {statusCopy.sectionTitle}
            </h2>
          </div>

          <div className="px-[16px] py-[16px]">
            <div
              className={`rounded-[10px] border ${
                detailState === "pending" ? "px-[16px] py-[14px]" : "px-[12px] py-[11px]"
              } ${getAlertBoxClasses(detailState)}`}
            >
              <div className="flex items-start gap-[10px]">
                <AlertIcon state={detailState} />
                <div className={`min-w-0 ${detailState === "pending" ? "pt-[2px]" : "pt-[1px]"}`}>
                  <p
                    className={`${
                      detailState === "pending"
                        ? "text-[16px] font-[500]"
                        : "text-[14px] font-semibold"
                    } leading-none ${getAlertHeadlineClasses(detailState)}`}
                  >
                    {statusCopy.headline}
                  </p>
                  <p
                    className={`max-w-[640px] leading-[1.45] ${
                      detailState === "pending"
                        ? "mt-[8px] text-[14px] text-[#98A2B3]"
                        : "mt-[8px] text-[12px] text-[#b0b6c1]"
                    }`}
                  >
                    {statusCopy.message}
                  </p>
                </div>
              </div>
            </div>

            {statusCopy.action.kind === "submit" ? (
              <BuyerRfqCancelAction
                rfqId={data.rfq.rfqId}
                label={statusCopy.action.label}
                className={`mt-[12px] inline-flex w-full items-center justify-center rounded-[7px] border bg-white transition ${
                  detailState === "pending"
                    ? "h-[44px] text-[15px] font-[500]"
                    : "h-[34px] text-[13px] font-semibold"
                } ${statusCopy.action.className}`}
              />
            ) : statusCopy.action.kind === "link" ? (
              <Link
                href={statusCopy.action.href}
                className={`mt-[12px] inline-flex h-[34px] w-full items-center justify-center rounded-[7px] border bg-white text-[13px] font-semibold transition ${statusCopy.action.className}`}
              >
                {statusCopy.action.label}
              </Link>
            ) : (
              <button
                type="button"
                className={`mt-[12px] inline-flex h-[34px] w-full items-center justify-center rounded-[7px] border bg-white text-[13px] font-semibold transition ${statusCopy.action.className}`}
              >
                {statusCopy.action.label}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {showClosedSummary ? (
        <section className="mt-[10px] overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
          <div className={`flex items-center justify-between ${RFQ_SECTION_HEADER_ROW_CLASS}`}>
            <h2 className={RFQ_SECTION_HEADING_CLASS}>Final Summary</h2>
            <p className="text-[11px] font-medium leading-none text-[#bfc5cf]">
              Closed on {closedDate}
            </p>
          </div>

          <div className="px-[16px] py-[16px]">
            <div className="rounded-[10px] border border-[#b9c0cb] bg-[#fcfdff] px-[12px] py-[11px]">
              <div className="flex items-start gap-[10px]">
                <ClosedAlertIcon />
                <div className="min-w-0 pt-[1px]">
                  <p className="text-[14px] font-semibold leading-none text-[#6a7381]">
                    This RFQ has been completed
                  </p>
                  <p className="mt-[8px] max-w-[640px] text-[12px] leading-[1.45] text-[#adb5c1]">
                    Order was fulfilled and marked complete on {closedDateLong}.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-[10px] grid grid-cols-4 gap-[8px]">
              <QuoteMetric
                label="Quoted Price"
                value={formatTargetPrice(closedQuotePrice, data.rfq.unit)}
                labelClassName="text-[#b4bbc6]"
              />
              <QuoteMetric
                label="Total Amount"
                value={formatCurrency(closedQuoteTotalAmount)}
                labelClassName="text-[#b4bbc6]"
              />
              <QuoteMetric
                label="Lead Time"
                value={closedQuoteLeadTime}
                labelClassName="text-[#b4bbc6]"
              />
              <QuoteMetric
                label="Minimum Order Qty."
                value={
                  closedQuoteMoq != null
                    ? formatQuantity(closedQuoteMoq, data.rfq.unit)
                    : "Not set"
                }
                labelClassName="text-[#b4bbc6]"
              />
            </div>

            <div className={RFQ_SUPPLIER_NOTE_CARD_CLASS}>
              <p className="text-[14px] font-medium uppercase leading-none text-[#c2c8d1]">
                Supplier&apos;s Note
              </p>
              <p className="mt-[10px] text-[14px] leading-[1.45] text-[#7a8594]">
                {closedQuoteNote}
              </p>
            </div>

            <Link
              href={newRfqHref}
              className="mt-[12px] inline-flex h-[34px] w-full items-center justify-center rounded-[7px] border border-[#8e99a8] bg-white text-[13px] font-semibold text-[#4f5b6a] transition hover:bg-[#f8fafc]"
            >
              Send a new RFQ to this Supplier
            </Link>
          </div>
        </section>
      ) : null}

      {detailState === "confirmed" && acceptedEngagement && acceptedQuote ? (
        <section className="mt-[10px] overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
          <div className={`flex items-center justify-between ${RFQ_MAIN_CARD_HEADER_ROW_CLASS}`}>
            <h2 className={RFQ_CARD_SECTION_HEADING_CLASS}>Agreed Terms</h2>
            <p className="text-[14px] font-normal leading-none text-[#bfc5cf]">
              Agreed on {agreedDate}
            </p>
          </div>

          <div className="px-[16px] py-[16px]">
            <div className="rounded-[10px] border border-[#9fd1ad] bg-[#fbfffc] px-[12px] py-[11px]">
              <div className="flex items-start gap-[10px]">
                <ConfirmationAlertIcon />
                <div className="min-w-0 pt-[1px]">
                  <p className="text-[14px] font-semibold leading-none text-[#2c8754]">
                    Both parties have agreed on terms
                  </p>
                  <p className="mt-[5px] max-w-[640px] text-[13px] leading-[1.45] text-[#a8b1be]">
                    Send a Purchase Order to confirm and begin coordination with the supplier.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-[10px] grid grid-cols-4 gap-[8px]">
              <QuoteMetric
                label="Quoted Price"
                value={formatTargetPrice(confirmedQuotePrice, data.rfq.unit)}
              />
              <QuoteMetric
                label="Total Amount"
                value={formatCurrency(confirmedQuoteTotalAmount)}
              />
              <QuoteMetric label="Lead Time" value={confirmedQuoteLeadTime} />
              <QuoteMetric
                label="Minimum Order Qty."
                value={
                  confirmedQuoteMoq != null
                    ? formatQuantity(confirmedQuoteMoq, data.rfq.unit)
                    : "Not set"
                }
              />
            </div>

            <div className={RFQ_SUPPLIER_NOTE_CARD_CLASS}>
              <p className="text-[11px] font-medium uppercase leading-none text-[#b8bec8]">
                Supplier&apos;s Note
              </p>
              <p className="mt-[5px] text-[15px] leading-[1.45] text-[#374151]">
                {confirmedQuoteNote}
              </p>
            </div>

            <Link
              href={purchaseOrderHref}
              className="mt-[12px] inline-flex h-[44px] w-full items-center justify-center rounded-[7px] bg-[#227546] text-[14px] font-semibold text-white transition hover:bg-[#1b633b]"
            >
              Send Purchase Order
            </Link>
          </div>
        </section>
      ) : null}

      {detailState === "responded" && respondedEngagement ? (
        <>
          <section className="mt-[10px] overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
            <div className={RFQ_MAIN_CARD_HEADER_ROW_CLASS}>
              <h2 className={RFQ_CARD_SECTION_HEADING_CLASS}>Supplier&apos;s Quote</h2>
            </div>

            <div className="px-[16px] py-[16px]">
              <div className="grid grid-cols-4 gap-[8px]">
                <QuoteMetric
                  label="Quoted Price"
                  value={formatTargetPrice(quotePrice, data.rfq.unit)}
                />
                <QuoteMetric
                  label="Total Amount"
                  value={formatCurrency(quoteTotalAmount)}
                />
                <QuoteMetric label="Lead Time" value={quoteLeadTime || "Not set"} />
                <QuoteMetric
                  label="Minimum Order Qty."
                  value={
                    quoteMoq != null
                      ? formatQuantity(quoteMoq, data.rfq.unit)
                      : "Not set"
                  }
                />
              </div>

              <div className={RFQ_SUPPLIER_NOTE_CARD_CLASS}>
                <p className="text-[14px] font-semibold uppercase leading-none text-[#A2A8B3]">
                  Supplier&apos;s Note
                </p>
                <p className="mt-[5px] text-[16px] font-normal leading-[1.45] text-[#374151]">
                  {quoteNote}
                </p>
              </div>

              <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
                {respondedQuote ? (
                  <form action={acceptQuote}>
                    <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                    <input
                      type="hidden"
                      name="engagementId"
                      value={respondedEngagement.engagementId}
                    />
                    <input
                      type="hidden"
                      name="quoteId"
                      value={respondedQuote.quoteId}
                    />
                    <button
                      type="submit"
                      className="inline-flex h-[44px] w-full items-center justify-center rounded-[6px] bg-[#227546] text-[14px] font-medium text-white transition hover:bg-[#1b633b]"
                    >
                      Accept Quote
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-[44px] w-full items-center justify-center rounded-[6px] bg-[#227546] text-[14px] font-medium text-white transition hover:bg-[#1b633b]"
                  >
                    Accept Quote
                  </button>
                )}

                {respondedQuote ? (
                  <BuyerRfqDeclineQuoteAction
                    rfqId={data.rfq.rfqId}
                    engagementId={respondedEngagement.engagementId}
                    quoteId={respondedQuote.quoteId}
                    supplierName={respondedEngagement.supplierName}
                    declineAction={declineQuote}
                  />
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-[44px] w-full items-center justify-center rounded-[6px] border border-[#ff6a5f] bg-white text-[14px] font-medium text-[#ff5549] transition hover:bg-[#fff8f7]"
                  >
                    Decline
                  </button>
                )}
              </div>
            </div>
          </section>

          <Link
            href={negotiationHref}
            className="mt-[14px] flex items-center justify-between rounded-[12px] border border-[#8aa4cc] bg-[#f5f9ff] px-[18px] py-[16px] shadow-[0_1px_1px_rgba(15,23,42,0.02)] transition hover:bg-[#edf5ff]"
          >
            <div className="flex items-center gap-[14px]">
              <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-[#24436f] text-white">
                <MessageSquareIcon />
              </span>
              <div>
                <p className="text-[16px] font-semibold leading-none text-[#35527d]">
                  Negotiate with Supplier
                </p>
                <p className="mt-[7px] text-[14px] leading-[1.35] text-[#9aa7bb]">
                  You may open a conversation with the supplier to clarify details before confirming the quote.
                </p>
              </div>
            </div>

            <span className="text-[#c3cddd]">
              <ArrowRightIcon />
            </span>
          </Link>
        </>
      ) : null}
    </main>
  );
}
