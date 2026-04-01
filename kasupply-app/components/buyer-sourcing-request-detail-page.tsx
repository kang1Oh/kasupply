import Link from "next/link";
import { ModalShell } from "@/components/modals";
import type { BuyerRfqDetailsData } from "@/lib/buyer/rfq-workflows";
import {
  acceptSourcingOffer,
  acceptSourcingQuote,
  closeSourcingRequest,
  declineSourcingQuote,
} from "@/app/buyer/(protected)/sourcing-board/[rfqId]/actions";

type BuyerSourcingRequestDetailPageProps = {
  buyerBusinessName: string;
  data: BuyerRfqDetailsData;
  modal?: string;
};

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

function formatCompactDate(value: string | null) {
  return formatDate(value, {
    month: "short",
    day: "numeric",
  });
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

  return initials || "SR";
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
  return query ? `/buyer/sourcing-board/${rfqId}?${query}` : `/buyer/sourcing-board/${rfqId}`;
}

function getRequestStatusBadgeClasses(status: string) {
  switch (status.toLowerCase()) {
    case "fulfilled":
      return "bg-[#edf8ef] text-[#2f7a45]";
    case "cancelled":
      return "bg-[#f5eaee] text-[#a15769]";
    case "closed":
      return "bg-[#eef2f7] text-[#536275]";
    default:
      return "bg-[#edf8ef] text-[#2f7a45]";
  }
}

function getSupplierStatusBadge(params: {
  hasAcceptedQuote: boolean;
  hasSubmittedQuote: boolean;
  hasPendingOffer: boolean;
}) {
  if (params.hasAcceptedQuote) {
    return {
      label: "Accepted",
      className: "bg-[#edf8ef] text-[#2f7a45]",
    };
  }

  if (params.hasSubmittedQuote) {
    return {
      label: "Submitted",
      className: "bg-[#e9efff] text-[#4269d0]",
    };
  }

  if (params.hasPendingOffer) {
    return {
      label: "Offer Pending",
      className: "bg-[#fff1e5] text-[#f08b38]",
    };
  }

  return {
    label: "Viewing",
    className: "bg-[#eef2f7] text-[#536275]",
  };
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-[#223654]">{value}</p>
    </div>
  );
}

function SummaryStripMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a8b2bf]">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-[#223654]">{value}</p>
    </div>
  );
}

export function BuyerSourcingRequestDetailPage({
  buyerBusinessName,
  data,
  modal,
}: BuyerSourcingRequestDetailPageProps) {
  const matchScoreBySupplierId = new Map(
    data.requestMatches.suppliers.map((supplier) => [
      supplier.supplierId,
      supplier.matchScore,
    ] as const)
  );

  const supplierCards = data.engagements
    .map((engagement) => {
      const submittedQuote =
        engagement.acceptedQuotation ??
        engagement.quotations.find((quotation) => quotation.status === "submitted") ??
        engagement.quotations[0] ??
        null;
      const pendingOffer =
        engagement.latestSupplierOffer?.status === "pending"
          ? engagement.latestSupplierOffer
          : null;

      return {
        engagement,
        submittedQuote,
        pendingOffer,
        matchScore: matchScoreBySupplierId.get(engagement.supplierId) ?? null,
      };
    })
    .filter((card) => card.submittedQuote || card.pendingOffer)
    .sort((left, right) => {
      if (left.submittedQuote && !right.submittedQuote) return -1;
      if (!left.submittedQuote && right.submittedQuote) return 1;

      const leftTime = new Date(
        left.submittedQuote?.createdAt ?? left.pendingOffer?.createdAt ?? 0
      ).getTime();
      const rightTime = new Date(
        right.submittedQuote?.createdAt ?? right.pendingOffer?.createdAt ?? 0
      ).getTime();

      return rightTime - leftTime;
    });

  const acceptedCard =
    supplierCards.find((card) => card.engagement.acceptedQuotation) ?? null;
  const quotationCount = supplierCards.filter((card) => card.submittedQuote != null).length;
  const requestIsClosed = data.rfq.isClosed || data.rfq.status === "cancelled";
  const showCloseModal = modal === "close" && !requestIsClosed;

  return (
    <>
      <main className="mx-auto max-w-[1120px] space-y-6 px-6 py-8">
        <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#a0abbb]">
          <Link
            href="/buyer/sourcing-board"
            className="transition hover:text-[#223654]"
          >
            Sourcing Board
          </Link>
          <span>&gt;</span>
          <span className="text-[#6c7a8e]">{data.rfq.productName}</span>
        </nav>

        <section className="rounded-[28px] border border-[#e8edf5] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#ffc8d4] text-[24px] font-semibold text-[#c95073]">
                  {getInitials(buyerBusinessName)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="text-[21px] font-semibold tracking-[-0.02em] text-[#223654]">
                      {buyerBusinessName}
                    </p>
                  </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#97a3b4]">
                      <span className="inline-flex items-center rounded-[8px] border border-[#e6ebf2] bg-[#fbfcfe] px-1.5 py-1 text-[14px] font-medium text-[#7e8c9f]">
                        {data.rfq.category?.categoryName ?? "General sourcing"}
                      </span>
                      <span className="text-[#c1c8d2]">&bull;</span>
                      <span>{formatCompactDate(data.rfq.createdAt)}</span>
                    </div>

                  <div className="mt-4"  >
                    <h1 className="mt-2 text-[17px] font-semibold leading-[1.45] text-[#334155] sm:text-[18px]">
                      {data.rfq.productName}
                    </h1>

                    <p className="max-w-[760px] text-[15px] text-[#8a96a8]">
                      {data.rfq.specifications || "No additional specifications provided yet."}
                    </p>
                  </div>
                  
                </div>
              </div>

              <span
                className={`inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold ${getRequestStatusBadgeClasses(
                  data.rfq.status
                )}`}
              >
                <span className="mr-2 text-[12px] leading-none">&bull;</span>
                {data.rfq.status === "fulfilled"
                  ? "Closed"
                  : data.rfq.status.charAt(0).toUpperCase() + data.rfq.status.slice(1)}
              </span>
            </div>

            <div className="mt-5 grid gap-4 rounded-[18px] border border-[#e7edf5] bg-[#f4f5f8] px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStripMetric
                label="Quantity"
                value={formatQuantity(data.rfq.quantity, data.rfq.unit)}
              />
              <SummaryStripMetric
                label="Budget"
                value={formatPricePerUnit(data.rfq.targetPricePerUnit, data.rfq.unit)}
              />
              <SummaryStripMetric
                label="Needed By"
                value={formatDate(data.rfq.preferredDeliveryDate)}
              />
              <SummaryStripMetric
                label="Location"
                value={data.rfq.deliveryLocation || "To be confirmed"}
              />
            </div>

            <div className="mt-4">
              {!requestIsClosed && !acceptedCard?.engagement.acceptedQuotation ? (
                <Link
                  href={buildDetailHref(data.rfq.rfqId, { modal: "close" })}
                  className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[#ff8f87] bg-white px-5 text-[14px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff6f5]"
                >
                  Close Request
                </Link>
              ) : null}

              {requestIsClosed ? (
                <p className="text-[13px] text-[#a1acbc]">
                  This sourcing request is no longer accepting supplier responses.
                </p>
              ) : null}

              {acceptedCard?.engagement.acceptedQuotation ? (
                <Link
                  href={`/buyer/purchase-orders?rfqId=${data.rfq.rfqId}&quoteId=${acceptedCard.engagement.acceptedQuotation.quoteId}`}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
                >
                  Proceed to Purchase Order
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4 px-1">
          <div className="h-px flex-1 bg-[#dfe6ef]" />
          <p className="text-[13px] font-medium text-[#a0abba]">
            {quotationCount} quotation{quotationCount === 1 ? "" : "s"} received
          </p>
          <div className="h-px flex-1 bg-[#dfe6ef]" />
        </div>

        {supplierCards.length === 0 ? (
          <section className="rounded-[24px] border border-dashed border-[#d7e1ec] bg-white px-6 py-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.03)]">
            <h2 className="text-[18px] font-semibold text-[#223654]">
              No supplier quotations yet
            </h2>
            <p className="mt-2 text-[14px] text-[#8a96a8]">
              Quotations and supplier offers will appear here once suppliers start
              responding to this sourcing request.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {supplierCards.map((card) => {
              const { engagement, submittedQuote, pendingOffer, matchScore } = card;
              const statusBadge = getSupplierStatusBadge({
                hasAcceptedQuote: Boolean(engagement.acceptedQuotation),
                hasSubmittedQuote: Boolean(submittedQuote),
                hasPendingOffer: Boolean(pendingOffer),
              });
              const metricSource = submittedQuote ?? pendingOffer;
              const canAcceptQuote =
                !requestIsClosed &&
                submittedQuote != null &&
                submittedQuote.status !== "accepted" &&
                !acceptedCard;
              const canDeclineQuote =
                !requestIsClosed &&
                submittedQuote != null &&
                submittedQuote.status !== "accepted";
              const canAcceptOffer =
                !requestIsClosed &&
                submittedQuote == null &&
                pendingOffer != null &&
                !acceptedCard;

              return (
                <section
                  key={engagement.engagementId}
                  className="rounded-[22px] border border-[#e8edf5] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#edf8ef] text-[15px] font-semibold text-[#2f7a45]">
                          {getInitials(engagement.supplierName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[17px] font-semibold text-[#223654]">
                              {engagement.supplierName}
                            </p>
                            {engagement.verifiedBadge ? (
                              <span className="rounded-full border border-[#99cfaa] bg-[#f3fbf4] px-2 py-1 text-[11px] font-semibold text-[#2f7a45]">
                                Verified
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-[13px] text-[#97a3b4]">
                            {[engagement.businessType, engagement.locationLabel]
                              .filter(Boolean)
                              .join(" \u2022 ") || "Supplier details available on profile"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 text-left lg:items-end lg:text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                        <p className="text-[12px] font-medium text-[#2f6fed]">
                          Match Score: {matchScore == null ? "-" : `${matchScore}%`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <DetailMetric
                        label={submittedQuote ? "Quoted Price" : "Offered Price"}
                        value={formatPricePerUnit(metricSource?.pricePerUnit ?? null, data.rfq.unit)}
                      />
                      <DetailMetric
                        label="Total Amount"
                        value={formatCurrency(
                          metricSource?.pricePerUnit != null && metricSource.quantity != null
                            ? metricSource.pricePerUnit * metricSource.quantity
                            : null
                        )}
                      />
                      <DetailMetric
                        label="Lead Time"
                        value={metricSource?.leadTime || "-"}
                      />
                      <DetailMetric
                        label="MOQ"
                        value={formatQuantity(metricSource?.moq ?? null, data.rfq.unit)}
                      />
                    </div>

                    <div className="mt-4 rounded-[14px] border border-[#e7edf5] bg-[#fbfcfe] px-4 py-4">
                      <p className="text-[13px] leading-6 text-[#8a96a8]">
                        {metricSource?.notes || "No supplier note was added to this response."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/buyer/search/${engagement.supplierId}`}
                          className="text-[13px] font-medium text-[#223654] transition hover:text-[#294773]"
                        >
                          View Supplier
                        </Link>
                        {engagement.conversationId ? (
                          <Link
                            href={`/buyer/messages?conversation=${engagement.conversationId}`}
                            className="text-[13px] font-medium text-[#223654] transition hover:text-[#294773]"
                          >
                            Open Conversation
                          </Link>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {canAcceptQuote && submittedQuote ? (
                          <form action={acceptSourcingQuote}>
                            <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                            <input
                              type="hidden"
                              name="engagementId"
                              value={engagement.engagementId}
                            />
                            <input
                              type="hidden"
                              name="quoteId"
                              value={submittedQuote.quoteId}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
                            >
                              Accept Quote
                            </button>
                          </form>
                        ) : null}

                        {canAcceptOffer && pendingOffer ? (
                          <form action={acceptSourcingOffer}>
                            <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                            <input
                              type="hidden"
                              name="engagementId"
                              value={engagement.engagementId}
                            />
                            <input
                              type="hidden"
                              name="offerId"
                              value={pendingOffer.offerId}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#243f68] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
                            >
                              Accept Offer
                            </button>
                          </form>
                        ) : null}

                        {canDeclineQuote && submittedQuote ? (
                          <form action={declineSourcingQuote}>
                            <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                            <input
                              type="hidden"
                              name="engagementId"
                              value={engagement.engagementId}
                            />
                            <input
                              type="hidden"
                              name="quoteId"
                              value={submittedQuote.quoteId}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d7e0eb] bg-white px-5 text-[14px] font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
                            >
                              Decline
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {showCloseModal ? (
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
              Close this request?
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#8a96a8]">
              Suppliers can no longer view or respond to this sourcing request.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href={buildDetailHref(data.rfq.rfqId)}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#223f68] text-[14px] font-semibold text-white transition hover:bg-[#1d3454]"
              >
                Cancel
              </Link>

              <form action={closeSourcingRequest}>
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#9aa5b5] text-[14px] font-semibold text-white transition hover:bg-[#7f8a99]"
                >
                  Close Request
                </button>
              </form>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
