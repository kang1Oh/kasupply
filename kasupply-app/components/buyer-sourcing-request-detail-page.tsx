import Link from "next/link";
import type { BuyerRfqDetailsData } from "@/lib/buyer/rfq-workflows";
import {
  acceptSourcingQuote,
  closeSourcingRequest,
  declineSourcingQuote,
} from "@/app/buyer/(protected)/sourcing-board/[rfqId]/actions";

type BuyerSourcingRequestDetailPageProps = {
  buyerBusinessName: string;
  data: BuyerRfqDetailsData;
  modal?: string;
};

type QuotationCardItem = {
  engagement: BuyerRfqDetailsData["engagements"][number];
  quotation:
    | NonNullable<BuyerRfqDetailsData["engagements"][number]["acceptedQuotation"]>
    | BuyerRfqDetailsData["engagements"][number]["quotations"][number];
  matchScore: number | null;
};

const SUPPLIER_AVATAR_TONES = [
  "bg-[#e9f9ef] text-[#46a36c]",
  "bg-[#fff2e9] text-[#ef8b44]",
  "bg-[#f8e9fb] text-[#b155c9]",
  "bg-[#edf4ff] text-[#4d7be8]",
];

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
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

function formatCurrencyPerUnit(value: number | null, unit: string | null) {
  if (value == null || Number.isNaN(value)) return "-";

  const amount = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `P${amount}${unit ? ` / ${unit}` : ""}`;
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";

  return `P${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
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

function getRequestStatusConfig(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-[#faecee] text-[#b35f68]",
      dotClassName: "bg-[#c56d78]",
    };
  }

  if (normalized === "closed" || normalized === "fulfilled") {
    return {
      label: "Closed",
      className: "bg-[#eef0f4] text-[#5d697a]",
      dotClassName: "bg-[#667284]",
    };
  }

  return {
    label: "Open",
    className: "bg-[#edf8ef] text-[#2e8b57]",
    dotClassName: "bg-[#2e8b57]",
  };
}

function getQuoteStatusLabel(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "accepted") return "Accepted";
  if (normalized === "rejected") return "Declined";
  return "Submitted";
}

function buildMetricValueTotal(pricePerUnit: number | null, quantity: number | null) {
  if (pricePerUnit == null || quantity == null) return "-";
  return formatCurrency(pricePerUnit * quantity);
}

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] bg-[#f3f4f6] px-[14px] py-[12px]">
      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[#a3acb8]">
        {label}
      </p>
      <p className="mt-[4px] text-[14px] font-semibold leading-[1.35] text-[#394150]">
        {value}
      </p>
    </div>
  );
}

export function BuyerSourcingRequestDetailPage({
  buyerBusinessName,
  data,
}: BuyerSourcingRequestDetailPageProps) {
  const matchScoreBySupplierId = new Map(
    data.requestMatches.suppliers.map((supplier) => [
      supplier.supplierId,
      supplier.matchScore,
    ] as const),
  );

  const quotationCards: QuotationCardItem[] = data.engagements
    .map((engagement) => {
      const quotation =
        engagement.acceptedQuotation ??
        engagement.quotations.find((item) => item.status === "submitted") ??
        engagement.quotations[0] ??
        null;

      if (!quotation) {
        return null;
      }

      return {
        engagement,
        quotation,
        matchScore: matchScoreBySupplierId.get(engagement.supplierId) ?? null,
      };
    })
    .filter((card): card is QuotationCardItem => card !== null)
    .sort((left, right) => {
      const leftTime = new Date(left.quotation.createdAt).getTime();
      const rightTime = new Date(right.quotation.createdAt).getTime();
      return rightTime - leftTime;
    });

  const quotationCount = quotationCards.length;
  const requestStatus = getRequestStatusConfig(data.rfq.status);
  const requestIsClosable =
    !["closed", "cancelled", "fulfilled"].includes(data.rfq.status.toLowerCase());

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#b4bcc8]">
        <Link href="/buyer/sourcing-board" className="transition hover:text-[#223654]">
          Sourcing Board
        </Link>
        <span className="text-[#c7ced8]">&gt;</span>
        <span className="text-[#8f9bac]">{data.rfq.productName}</span>
      </nav>

      <section className="mt-4 overflow-hidden rounded-[18px] border border-[#e5eaf0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="px-[18px] py-[16px]">
          <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-[12px]">
              <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#ffc3d0] text-[17px] font-medium text-[#cb5c7b]">
                {getInitials(buyerBusinessName)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-[#394150]">
                  {buyerBusinessName}
                </p>

                <div className="mt-[3px] flex flex-wrap items-center gap-[7px] text-[12px] text-[#a0a8b4]">
                  <span className="inline-flex rounded-[5px] border border-[#e6ebf1] bg-[#f8f9fb] px-[6px] py-[2px] text-[11px] font-medium text-[#7d8794]">
                    {data.rfq.category?.categoryName ?? "General sourcing"}
                  </span>
                  <span>&bull;</span>
                  <span>{formatCompactDate(data.rfq.createdAt)}</span>
                </div>
              </div>
            </div>

            <span
              className={`inline-flex h-[28px] items-center self-start rounded-full px-[10px] text-[13px] font-medium ${requestStatus.className}`}
            >
              <span
                className={`mr-[7px] inline-flex h-[7px] w-[7px] rounded-full ${requestStatus.dotClassName}`}
              />
              {requestStatus.label}
            </span>
          </div>

          <div className="mt-[4px] lg:pl-[56px]">
            <h1 className="text-[17px] font-semibold leading-[1.4] text-[#364152]">
              {data.rfq.productName}
            </h1>
            <p className="max-w-[760px] text-[15px] leading-[1.45] text-[#7d8794]">
              {data.rfq.specifications || "No additional specifications provided yet."}
            </p>

            <div className="mt-[12px] overflow-hidden rounded-[12px] border border-[#e4e7eb] bg-[#f3f4f6]">
              <div className="grid md:grid-cols-2 xl:grid-cols-4">
                <MetricCell
                  label="Quantity"
                  value={formatQuantity(data.rfq.quantity, data.rfq.unit)}
                />
                <MetricCell
                  label="Budget"
                  value={formatCurrencyPerUnit(data.rfq.targetPricePerUnit, data.rfq.unit)}
                />
                <MetricCell
                  label="Needed By"
                  value={formatDate(data.rfq.preferredDeliveryDate)}
                />
                <MetricCell
                  label="Location"
                  value={data.rfq.deliveryLocation || "To be confirmed"}
                />
              </div>
            </div>

            {requestIsClosable ? (
              <form action={closeSourcingRequest} className="mt-[12px]">
                <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                <button
                  type="submit"
                  className="inline-flex h-[38px] w-full items-center justify-center rounded-[8px] border border-[#ff8f87] bg-white text-[12px] font-semibold text-[#ff5b4d] transition hover:bg-[#fff7f6]"
                >
                  Close Request
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <div className="py-[14px] text-center text-[12px] text-[#b3bbc6]">
        {quotationCount} quotation{quotationCount === 1 ? "" : "s"} received
      </div>

      <section className="space-y-[10px]">
        {quotationCards.length === 0 ? (
          <div className="rounded-[18px] border border-[#e5eaf0] bg-white px-8 py-10 text-center shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <h2 className="text-[19px] font-semibold text-[#304668]">
              No supplier quotations yet
            </h2>
            <p className="mt-2 text-[14px] text-[#9aa4b3]">
              Supplier quotations will appear here as soon as suppliers submit them.
            </p>
          </div>
        ) : (
          quotationCards.map((card: QuotationCardItem, index: number) => {
            const tone =
              SUPPLIER_AVATAR_TONES[index % SUPPLIER_AVATAR_TONES.length];
            const quoteStatusLabel = getQuoteStatusLabel(card.quotation.status);
            const canAccept =
              card.quotation.status !== "accepted" && requestIsClosable;
            const canDecline =
              card.quotation.status !== "accepted" &&
              card.quotation.status !== "rejected" &&
              requestIsClosable;

            return (
              <article
                key={card.engagement.engagementId}
                className="rounded-[18px] border border-[#e5eaf0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="px-[16px] py-[16px]">
                  <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-[12px]">
                      <div
                        className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] text-[14px] font-semibold ${tone}`}
                      >
                        {getInitials(card.engagement.supplierName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-[7px]">
                          <p className="text-[15px] font-semibold text-[#394150]">
                            {card.engagement.supplierName}
                          </p>
                          {card.engagement.verifiedBadge ? (
                            <span className="inline-flex items-center rounded-full border border-[#b7d7c3] bg-[#f5fbf6] px-[7px] py-[2px] text-[10px] font-medium text-[#4e8664]">
                              Verified
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-[3px] text-[12px] text-[#9aa4b3]">
                          {[card.engagement.businessType, card.engagement.locationLabel]
                            .filter(Boolean)
                            .join(", ") || "Supplier details available"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <p className="text-[12px] font-semibold text-[#2e8b57]">
                        {quoteStatusLabel}
                      </p>
                      <p className="mt-[2px] text-[11px] font-medium text-[#4d7be8]">
                        Match Score: {card.matchScore == null ? "-" : `${Math.round(card.matchScore)}%`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-[12px] grid gap-[8px] md:grid-cols-2 xl:grid-cols-4">
                    <MetricCell
                      label="Quoted Price"
                      value={formatCurrencyPerUnit(
                        card.quotation.pricePerUnit,
                        data.rfq.unit,
                      )}
                    />
                    <MetricCell
                      label="Total / Week"
                      value={buildMetricValueTotal(
                        card.quotation.pricePerUnit,
                        card.quotation.quantity,
                      )}
                    />
                    <MetricCell
                      label="Lead Time"
                      value={card.quotation.leadTime || "-"}
                    />
                    <MetricCell
                      label="MOQ"
                      value={formatQuantity(card.quotation.moq, data.rfq.unit)}
                    />
                  </div>

                  <div className="mt-[10px] rounded-[8px] border border-[#edf1f4] bg-[#fafbfc] px-[12px] py-[11px]">
                    <p className="text-[11px] leading-[1.5] text-[#8f99a8]">
                      {card.quotation.notes || "No supplier note was included with this quotation."}
                    </p>
                  </div>

                  <div className="mt-[12px] grid gap-[8px] sm:grid-cols-[minmax(0,1fr)_110px]">
                    {canAccept ? (
                      <form action={acceptSourcingQuote}>
                        <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                        <input
                          type="hidden"
                          name="engagementId"
                          value={card.engagement.engagementId}
                        />
                        <input
                          type="hidden"
                          name="quoteId"
                          value={card.quotation.quoteId}
                        />
                        <button
                          type="submit"
                          className="inline-flex h-[36px] w-full items-center justify-center rounded-[6px] bg-[#223f68] text-[12px] font-semibold text-white transition hover:bg-[#1d3558]"
                        >
                          Accept Quote
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex h-[36px] w-full items-center justify-center rounded-[6px] bg-[#223f68] text-[12px] font-semibold text-white opacity-60">
                        Accept Quote
                      </div>
                    )}

                    {canDecline ? (
                      <form action={declineSourcingQuote}>
                        <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                        <input
                          type="hidden"
                          name="engagementId"
                          value={card.engagement.engagementId}
                        />
                        <input
                          type="hidden"
                          name="quoteId"
                          value={card.quotation.quoteId}
                        />
                        <button
                          type="submit"
                          className="inline-flex h-[36px] w-full items-center justify-center rounded-[6px] border border-[#dfe5ec] bg-white text-[12px] font-medium text-[#5f6b7e] transition hover:bg-[#f8fafc]"
                        >
                          Decline
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex h-[36px] w-full items-center justify-center rounded-[6px] border border-[#dfe5ec] bg-white text-[12px] font-medium text-[#5f6b7e] opacity-60">
                        Decline
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
