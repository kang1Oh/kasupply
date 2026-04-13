import Link from "next/link";
import { ModalShell } from "@/components/modals";
import type { BuyerRfqDetailsData } from "@/lib/buyer/rfq-workflows";
import {
  acceptOffer,
  acceptQuote,
  cancelRFQ,
  declineQuote,
  submitCounterOffer,
} from "@/app/buyer/(protected)/rfqs/[rfqId]/actions";

type DetailStateKey =
  | "pending"
  | "negotiating"
  | "quoted"
  | "confirmed"
  | "closed";

type BuyerRfqDetailPageProps = {
  data: BuyerRfqDetailsData;
  modal?: string;
  quoteId?: string;
  engagementId?: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatShortDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPricePerUnit(value: number | null, unit: string | null) {
  if (value === null || Number.isNaN(value)) return "-";

  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `P${amount}${unit ? ` / ${unit}` : ""}`;
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null) return "-";
  return `${new Intl.NumberFormat("en-PH").format(quantity)}${unit ? ` ${unit}` : ""}`;
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "SU";
}

function getReferenceCode(rfqId: number, createdAt: string) {
  const parsed = new Date(createdAt);
  const year = Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();

  return `RFQ-${year}-${String(rfqId).padStart(3, "0")}`;
}

function getStatusBadgeClasses(state: DetailStateKey) {
  switch (state) {
    case "confirmed":
      return "bg-[#edf8ef] text-[#2f7a45]";
    case "closed":
      return "bg-[#eef2f7] text-[#536275]";
    case "quoted":
    case "negotiating":
      return "bg-[#e9efff] text-[#4269d0]";
    case "pending":
    default:
      return "bg-[#fff1e5] text-[#f08b38]";
  }
}

function getStatusLabel(state: DetailStateKey) {
  switch (state) {
    case "confirmed":
      return "Confirmed";
    case "closed":
      return "Closed";
    case "quoted":
    case "negotiating":
      return "Responded";
    case "pending":
    default:
      return "Pending";
  }
}

function getProgressStep(state: DetailStateKey) {
  switch (state) {
    case "closed":
      return 4;
    case "confirmed":
      return 3;
    case "quoted":
    case "negotiating":
      return 2;
    case "pending":
    default:
      return 1;
  }
}

function getOfferTotalAmount(params: {
  pricePerUnit: number | null;
  quantity: number | null;
}) {
  if (params.pricePerUnit == null || params.quantity == null) {
    return null;
  }

  return params.pricePerUnit * params.quantity;
}

function buildDetailHref(
  rfqId: number,
  params: Record<string, string | number | null | undefined> = {}
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `/buyer/rfqs/${rfqId}?${query}` : `/buyer/rfqs/${rfqId}`;
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ["Sent", "Responded", "Confirmed", "PO Sent"];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = currentStep >= stepNumber;

        return (
          <div key={label} className="flex min-w-max items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isComplete
                    ? "bg-[#223f68] text-white"
                    : "bg-[#e5e7eb] text-[#b4bcc9]"
                }`}
              >
                {stepNumber}
              </span>
              <span
                className={`text-[13px] font-semibold ${
                  isComplete ? "text-[#223654]" : "text-[#c1c8d2]"
                }`}
              >
                {label}
              </span>
            </div>

            {index < steps.length - 1 ? (
              <div
                className={`mx-3 h-px w-24 sm:w-28 ${
                  currentStep > stepNumber ? "bg-[#223f68]" : "bg-[#e5e7eb]"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-semibold text-[#223654]">{value}</p>
    </div>
  );
}

function TermsMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7b8]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-[#223654]">{value}</p>
    </div>
  );
}

function Callout({
  tone,
  title,
  description,
  action,
}: {
  tone: "warning" | "success" | "neutral";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "border-[#9fd2ae] bg-[#f4fbf5]"
      : tone === "warning"
        ? "border-[#ffb27d] bg-[#fff7f1]"
        : "border-[#c8d8f0] bg-[#f4f8ff]";
  const iconClasses =
    tone === "success"
      ? "bg-[#2f7a45] text-white"
      : tone === "warning"
        ? "bg-[#ff7a1c] text-white"
        : "bg-[#223f68] text-white";
  const icon = tone === "success" ? "+" : tone === "warning" ? "!" : ">";

  return (
    <div className={`rounded-[16px] border px-4 py-4 ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold ${iconClasses}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#223654]">{title}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#8a96a8]">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function BuyerRfqDetailPage({
  data,
  modal,
  quoteId,
  engagementId,
}: BuyerRfqDetailPageProps) {
  const primaryEngagement =
    data.engagements.find((engagement) => engagement.acceptedQuotation) ??
    data.engagements.find((engagement) =>
      engagement.quotations.some((quotation) => quotation.status === "submitted")
    ) ??
    data.engagements.find((engagement) => engagement.latestSupplierOffer) ??
    data.engagements[0] ??
    null;

  const activeSubmittedQuote =
    primaryEngagement?.quotations.find((quotation) => quotation.status === "submitted") ??
    null;
  const acceptedEngagement =
    data.engagements.find((engagement) => engagement.acceptedQuotation) ?? null;
  const acceptedQuote = acceptedEngagement?.acceptedQuotation ?? null;
  const latestSupplierOffer = primaryEngagement?.latestSupplierOffer ?? null;
  const hasAnyQuotation = data.engagements.some(
    (engagement) => engagement.quotations.length > 0
  );
  const hasAnySupplierOffer = data.engagements.some((engagement) =>
    engagement.offers.some((offer) => offer.offeredBy !== data.currentAuthUserId)
  );
  const workflowState: Exclude<DetailStateKey, "closed"> = acceptedQuote
    ? "confirmed"
    : hasAnyQuotation
      ? "quoted"
      : hasAnySupplierOffer
        ? "negotiating"
        : "pending";

  const pageState: DetailStateKey =
    data.rfq.status === "cancelled" || data.purchaseOrder || data.rfq.status === "closed"
      ? "closed"
      : workflowState;

  const referenceCode = getReferenceCode(data.rfq.rfqId, data.rfq.createdAt);
  const isCancelled = data.rfq.status === "cancelled";
  const currentStep = isCancelled ? getProgressStep(workflowState) : getProgressStep(pageState);
  const closedDate =
    data.purchaseOrder?.confirmedAt ?? data.purchaseOrder?.createdAt ?? data.rfq.createdAt;
  const supplierName = primaryEngagement?.supplierName ?? "Awaiting supplier response";
  const supplierSubtitle = [
    primaryEngagement?.businessType,
    primaryEngagement?.locationLabel,
  ]
    .filter(Boolean)
    .join(" | ");
  const profileHref = primaryEngagement
    ? `/buyer/search/${primaryEngagement.supplierId}`
    : "/buyer/search";
  const messageSupplierHref = primaryEngagement
    ? primaryEngagement.conversationId
      ? `/buyer/messages?conversation=${primaryEngagement.conversationId}`
      : `/buyer/messages?supplierId=${primaryEngagement.supplierId}&engagementId=${primaryEngagement.engagementId}`
    : "/buyer/messages";
  const purchaseOrderHref =
    acceptedQuote != null
      ? `/buyer/purchase-orders?rfqId=${data.rfq.rfqId}&quoteId=${acceptedQuote.quoteId}`
      : "/buyer/purchase-orders";
  const newRfqHref =
    primaryEngagement != null
      ? `/buyer/rfqs/new?supplierId=${primaryEngagement.supplierId}&productId=${data.rfq.productId}`
      : "/buyer/search";

  const negotiationDefaults = {
    pricePerUnit: activeSubmittedQuote?.pricePerUnit ?? latestSupplierOffer?.pricePerUnit ?? null,
    quantity: activeSubmittedQuote?.quantity ?? latestSupplierOffer?.quantity ?? data.rfq.quantity,
    moq: activeSubmittedQuote?.moq ?? latestSupplierOffer?.moq ?? null,
    leadTime: activeSubmittedQuote?.leadTime ?? latestSupplierOffer?.leadTime ?? "",
    notes: latestSupplierOffer?.notes ?? activeSubmittedQuote?.notes ?? "",
  };

  const showCancelModal = modal === "cancel";
  const showNegotiateModal = modal === "negotiate" && primaryEngagement != null;
  const showDeclineQuoteModal =
    modal === "decline-quote" &&
    activeSubmittedQuote != null &&
    primaryEngagement != null &&
    (!quoteId || Number(quoteId) === activeSubmittedQuote.quoteId) &&
    (!engagementId || Number(engagementId) === primaryEngagement.engagementId);

  return (
    <>
      <main className="mx-auto max-w-[1120px] space-y-6 px-6 py-8">
        <div>
          <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#a0abbb]">
          <Link href="/buyer/rfqs" className="transition hover:text-[#223654]">
            My RFQs
          </Link>
          <span>&gt;</span>
          <span>{referenceCode}</span>
        </nav>
        </div>
        <section className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>

                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
                  {data.rfq.productName} - {formatQuantity(data.rfq.quantity, data.rfq.unit)}
                </h1>
                <p className="mt-1 text-[14px] text-[#98a3b4]">
                  {referenceCode} | Sent {formatShortDate(data.rfq.createdAt)} | Deadline{" "}
                  {formatShortDate(data.rfq.deadline)}
                </p>
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ${getStatusBadgeClasses(
                  pageState
                )}`}
              >
                <span className="mr-1.5 text-[11px] leading-none">&bull;</span>
                {getStatusLabel(pageState)}
              </span>
            </div>

            <Stepper currentStep={currentStep} />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
              Supplier Info
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {primaryEngagement ? (
                <Link
                  href={messageSupplierHref}
                  className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#d9e2ee] bg-white px-4 text-[13px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
                >
                  Message Supplier
                </Link>
              ) : null}
              <Link
                href={profileHref}
                className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#d9e2ee] bg-white px-4 text-[13px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
              >
                View Profile
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {primaryEngagement?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryEngagement.avatarUrl}
                alt={`${supplierName} avatar`}
                className="h-14 w-14 rounded-[14px] border border-[#e6edf6] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#edf8ef] text-[20px] font-semibold text-[#2f7a45]">
                {getInitials(supplierName)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[18px] font-semibold text-[#223654]">{supplierName}</p>
                {primaryEngagement?.verifiedBadge ? (
                  <span className="rounded-full border border-[#99cfaa] bg-[#f3fbf4] px-2 py-1 text-[11px] font-semibold text-[#2f7a45]">
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] text-[#8a96a8]">
                {supplierSubtitle || "Supplier information will appear here once the request is received."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
            RFQ Details
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <DetailMetric label="Product" value={data.rfq.productName} />
            <DetailMetric
              label="Quantity"
              value={formatQuantity(data.rfq.quantity, data.rfq.unit)}
            />
            <DetailMetric
              label="Target Price"
              value={formatPricePerUnit(data.rfq.targetPricePerUnit, data.rfq.unit)}
            />
            <DetailMetric
              label="Preferred Delivery"
              value={formatDate(data.rfq.preferredDeliveryDate)}
            />
            <DetailMetric
              label="RFQ Deadline"
              value={formatDate(data.rfq.deadline)}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <DetailMetric
              label="Delivery Location"
              value={data.rfq.deliveryLocation || "Not specified"}
            />
          </div>

          <div className="mt-5 grid gap-5">
            <DetailMetric
              label="Notes"
              value={data.rfq.specifications || "No specifications provided."}
            />
          </div>
        </section>

        {pageState === "pending" ? (
          <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
              Awaiting Response
            </h2>

            <div className="mt-5 space-y-4">
              <Callout
                tone="warning"
                title="Waiting for supplier&apos;s quote"
                description={`Your RFQ was sent to ${supplierName} on ${formatShortDate(
                  data.rfq.createdAt
                )}. Suppliers typically respond within 1-2 business days.`}
              />

              <Link
                href={buildDetailHref(data.rfq.rfqId, { modal: "cancel" })}
                className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border border-[#ffb3ae] bg-white text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
              >
                Cancel RFQ
              </Link>
            </div>
          </section>
        ) : null}

        {pageState === "negotiating" && primaryEngagement && latestSupplierOffer ? (
          <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
              Latest Negotiation Offer
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <TermsMetric
                label="Quoted Price"
                value={formatPricePerUnit(latestSupplierOffer.pricePerUnit, data.rfq.unit)}
              />
              <TermsMetric
                label="Total Amount"
                value={formatCurrency(
                  getOfferTotalAmount({
                    pricePerUnit: latestSupplierOffer.pricePerUnit,
                    quantity: latestSupplierOffer.quantity,
                  })
                )}
              />
              <TermsMetric label="Lead Time" value={latestSupplierOffer.leadTime || "-"} />
              <TermsMetric
                label="Minimum Order Qty."
                value={formatQuantity(latestSupplierOffer.moq, data.rfq.unit)}
              />
            </div>

            <div className="mt-4 rounded-[16px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7b8]">
                Supplier&apos;s Note
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#5b697d]">
                {latestSupplierOffer.notes || "No supplier note was added for this negotiation round."}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <form action={acceptOffer}>
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <input type="hidden" name="engagementId" value={primaryEngagement.engagementId} />
                <input type="hidden" name="offerId" value={latestSupplierOffer.offerId} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#1f7a45] text-[14px] font-semibold text-white transition hover:bg-[#1a673b]"
                >
                  Accept Offer
                </button>
              </form>

              <Link
                href={buildDetailHref(data.rfq.rfqId, {
                  modal: "negotiate",
                  engagementId: primaryEngagement.engagementId,
                })}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#c8d8f0] bg-white text-[14px] font-semibold text-[#223f68] transition hover:bg-[#f8fbff]"
                >
                  Negotiate
                </Link>

              <Link
                href={buildDetailHref(data.rfq.rfqId, { modal: "cancel" })}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#ffb3ae] bg-white text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
              >
                Cancel RFQ
              </Link>
            </div>
          </section>
        ) : null}

        {pageState === "quoted" && primaryEngagement && activeSubmittedQuote ? (
          <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
              Supplier&apos;s Quote
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <TermsMetric
                label="Quoted Price"
                value={formatPricePerUnit(activeSubmittedQuote.pricePerUnit, data.rfq.unit)}
              />
              <TermsMetric
                label="Total Amount"
                value={formatCurrency(
                  getOfferTotalAmount({
                    pricePerUnit: activeSubmittedQuote.pricePerUnit,
                    quantity: activeSubmittedQuote.quantity,
                  })
                )}
              />
              <TermsMetric label="Lead Time" value={activeSubmittedQuote.leadTime || "-"} />
              <TermsMetric
                label="Minimum Order Qty."
                value={formatQuantity(activeSubmittedQuote.moq, data.rfq.unit)}
              />
            </div>

            <div className="mt-4 rounded-[16px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7b8]">
                Supplier&apos;s Note
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#5b697d]">
                {activeSubmittedQuote.notes || "No supplier note was added to this quotation."}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <form action={acceptQuote}>
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <input type="hidden" name="engagementId" value={primaryEngagement.engagementId} />
                <input type="hidden" name="quoteId" value={activeSubmittedQuote.quoteId} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#1f7a45] text-[14px] font-semibold text-white transition hover:bg-[#1a673b]"
                >
                  Accept Quote
                </button>
              </form>

              <Link
                href={buildDetailHref(data.rfq.rfqId, {
                  modal: "decline-quote",
                  quoteId: activeSubmittedQuote.quoteId,
                  engagementId: primaryEngagement.engagementId,
                })}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#ffb3ae] bg-white text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
                >
                  Decline
                </Link>

              <Link
                href={buildDetailHref(data.rfq.rfqId, { modal: "cancel" })}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#ffb3ae] bg-white text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
              >
                Cancel RFQ
              </Link>
            </div>

            <div className="mt-4">
              <Callout
                tone="neutral"
                title="Negotiate with Supplier"
                description="You may open a counter-offer if you want to revise the final terms before moving to purchase order."
                action={
                  <Link
                    href={buildDetailHref(data.rfq.rfqId, {
                      modal: "negotiate",
                      engagementId: primaryEngagement.engagementId,
                    })}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#c8d8f0] bg-white px-4 text-[13px] font-semibold text-[#223f68] transition hover:bg-[#f8fbff]"
                  >
                    Negotiate
                  </Link>
                }
              />
            </div>
          </section>
        ) : null}

        {pageState === "confirmed" && primaryEngagement && acceptedQuote ? (
          <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
                Agreed Terms
              </h2>
              <span className="text-[12px] text-[#a2adbd]">
                Agreed on {formatShortDate(acceptedQuote.createdAt)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <Callout
                tone="success"
                title="Both parties have agreed on terms"
                description="Send a purchase order to confirm and begin coordination with the supplier."
              />

              <div className="grid gap-3 md:grid-cols-4">
                <TermsMetric
                  label="Quoted Price"
                  value={formatPricePerUnit(acceptedQuote.pricePerUnit, data.rfq.unit)}
                />
                <TermsMetric
                  label="Total Amount"
                  value={formatCurrency(
                    getOfferTotalAmount({
                      pricePerUnit: acceptedQuote.pricePerUnit,
                      quantity: acceptedQuote.quantity,
                    })
                  )}
                />
                <TermsMetric label="Lead Time" value={acceptedQuote.leadTime || "-"} />
                <TermsMetric
                  label="Minimum Order Qty."
                  value={formatQuantity(acceptedQuote.moq, data.rfq.unit)}
                />
              </div>

              <div className="rounded-[16px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7b8]">
                  Supplier&apos;s Note
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#5b697d]">
                  {acceptedQuote.notes || "No supplier note was added to the accepted quotation."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={purchaseOrderHref}
                  className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#1f7a45] text-[14px] font-semibold text-white transition hover:bg-[#1a673b]"
                >
                  Send Purchase Order
                </Link>

                <Link
                  href={buildDetailHref(data.rfq.rfqId, { modal: "cancel" })}
                  className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#ffb3ae] bg-white text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
                >
                  Cancel RFQ
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {pageState === "closed" ? (
          <section className="rounded-[24px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
                {isCancelled ? "Cancellation Summary" : "Final Summary"}
              </h2>
              <span className="text-[12px] text-[#a2adbd]">
                Closed on {formatShortDate(closedDate)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <Callout
                tone={isCancelled ? "warning" : "success"}
                title={
                  isCancelled ? "This RFQ has been cancelled" : "This RFQ has been completed"
                }
                description={
                  isCancelled
                    ? `This request was cancelled and marked closed on ${formatShortDate(closedDate)}.`
                    : `Order was finalized and marked closed on ${formatShortDate(closedDate)}.`
                }
              />

              {acceptedQuote ? (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <TermsMetric
                      label="Quoted Price"
                      value={formatPricePerUnit(acceptedQuote.pricePerUnit, data.rfq.unit)}
                    />
                    <TermsMetric
                      label="Total Amount"
                      value={formatCurrency(
                        getOfferTotalAmount({
                          pricePerUnit: acceptedQuote.pricePerUnit,
                          quantity: acceptedQuote.quantity,
                        })
                      )}
                    />
                    <TermsMetric label="Lead Time" value={acceptedQuote.leadTime || "-"} />
                    <TermsMetric
                      label="Minimum Order Qty."
                      value={formatQuantity(acceptedQuote.moq, data.rfq.unit)}
                    />
                  </div>

                  <div className="rounded-[16px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7b8]">
                      Supplier&apos;s Note
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-[#5b697d]">
                      {acceptedQuote.notes || "No supplier note was added to the accepted quotation."}
                    </p>
                  </div>
                </>
              ) : null}

              <Link
                href={newRfqHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#d7e0eb] bg-white text-[14px] font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
              >
                Send a new RFQ to this Supplier
              </Link>
            </div>
          </section>
        ) : null}
      </main>

      {showCancelModal ? (
        <ModalShell
          maxWidthClassName="max-w-md"
          panelClassName="rounded-[28px] border border-[#e2e8f0] bg-white p-8 shadow-[0_26px_80px_rgba(15,23,42,0.18)]"
          overlayClassName="bg-[#0f172a]/45 px-4"
        >
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4fb] text-[24px] text-[#223f68]">
              ?
            </div>
            <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
              Cancel this RFQ?
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#8a96a8]">
              Are you sure you want to cancel this request? The supplier will be notified.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href={buildDetailHref(data.rfq.rfqId)}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#223f68] text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
              >
                Keep
              </Link>

              <form action={cancelRFQ}>
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#9aa5b5] text-[14px] font-semibold text-white transition hover:bg-[#7f8a99]"
                >
                  Cancel RFQ
                </button>
              </form>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {showDeclineQuoteModal && activeSubmittedQuote && primaryEngagement ? (
        <ModalShell
          maxWidthClassName="max-w-md"
          panelClassName="rounded-[28px] border border-[#e2e8f0] bg-white p-8 shadow-[0_26px_80px_rgba(15,23,42,0.18)]"
          overlayClassName="bg-[#0f172a]/45 px-4"
        >
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4fb] text-[24px] text-[#223f68]">
              x
            </div>
            <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
              Decline this quote?
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#8a96a8]">
              Decline the quote from {primaryEngagement.supplierName}? They will be notified.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href={buildDetailHref(data.rfq.rfqId)}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#223f68] text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
              >
                Keep
              </Link>

              <form action={declineQuote}>
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <input type="hidden" name="engagementId" value={primaryEngagement.engagementId} />
                <input type="hidden" name="quoteId" value={activeSubmittedQuote.quoteId} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#9aa5b5] text-[14px] font-semibold text-white transition hover:bg-[#7f8a99]"
                >
                  Decline
                </button>
              </form>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {showNegotiateModal && primaryEngagement ? (
        <ModalShell
          maxWidthClassName="max-w-2xl"
          panelClassName="rounded-[28px] border border-[#e2e8f0] bg-white p-8 shadow-[0_26px_80px_rgba(15,23,42,0.18)]"
          overlayClassName="bg-[#0f172a]/45 px-4 py-8"
        >
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
              Negotiate with {primaryEngagement.supplierName}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#8a96a8]">
              Send a counter-offer with your preferred pricing and delivery terms.
            </p>

            <form action={submitCounterOffer} className="mt-6 space-y-5">
              <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
              <input type="hidden" name="engagementId" value={primaryEngagement.engagementId} />

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-[#223654]">
                    Price per Unit
                  </span>
                  <input
                    type="number"
                    name="pricePerUnit"
                    min="0"
                    step="0.01"
                    defaultValue={negotiationDefaults.pricePerUnit ?? ""}
                    className="w-full rounded-[12px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                    placeholder="Optional"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-[#223654]">Quantity</span>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue={negotiationDefaults.quantity ?? ""}
                    className="w-full rounded-[12px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                    placeholder="Optional"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-[#223654]">MOQ</span>
                  <input
                    type="number"
                    name="moq"
                    min="1"
                    defaultValue={negotiationDefaults.moq ?? ""}
                    className="w-full rounded-[12px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[13px] font-semibold text-[#223654]">Lead Time</span>
                <input
                  type="text"
                  name="leadTime"
                  defaultValue={negotiationDefaults.leadTime}
                  className="w-full rounded-[12px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                  placeholder="Optional"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[13px] font-semibold text-[#223654]">Notes</span>
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={negotiationDefaults.notes}
                  className="w-full rounded-[12px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                  placeholder="Explain your proposed terms"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  href={buildDetailHref(data.rfq.rfqId)}
                  className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d7e0eb] bg-white px-5 text-[14px] font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
                >
                  Close
                </Link>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#223f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
                >
                  Submit Counter Offer
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
