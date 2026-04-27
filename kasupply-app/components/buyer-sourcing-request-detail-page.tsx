import Link from "next/link";
import type { BuyerRfqDetailsData } from "@/lib/buyer/rfq-workflows";
import { BuyerSourcingCloseRequestAction } from "@/components/buyer-sourcing-close-request-action";
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

  return `\u20b1${amount}${unit ? ` / ${unit}` : ""}`;
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";

  return `\u20b1${new Intl.NumberFormat("en-PH", {
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

function getQuoteStatusClassName(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "accepted") {
    return "bg-[#edf8ef] text-[#2e8b57]";
  }

  if (normalized === "rejected") {
    return "bg-[#faecee] text-[#b35f68]";
  }

  return "bg-[#edf8ef] text-[#2e8b57]";
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
    <div className="min-w-0 px-[16px] py-[14px]">
      <p className="text-[14px] font-normal uppercase tracking-[0.03em] text-[#A7AFBC]">
        {label}
      </p>
      <p className="mt-[3px] text-[16px] font-[500] leading-[1.35] text-[#394150]">
        {value}
      </p>
    </div>
  );
}

function QuotationMetricCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#d9dee6] bg-[rgba(55,65,81,0.06)] px-[22px] py-[18px]">
      <p className="text-[15px] font-normal uppercase tracking-[0.04em] leading-none text-[#7f8da3]">
        {label}
      </p>
      <p className="mt-[10px] text-[16px] font-[500] leading-none text-[#394150]">
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
      <nav className="flex flex-wrap items-center gap-[7px] text-[14px] font-normal text-[#bcc2cb]">
        <Link href="/buyer/sourcing-board" className="transition hover:text-[#223654]">
          Sourcing Board
        </Link>
        <span className="text-[#c7ced8]">&gt;</span>
        <span className="text-[14px] font-normal text-[#6A717F]">
          {data.rfq.productName}
        </span>
      </nav>

      <section className="mt-4 overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white px-[24px] py-[18px] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-[14px]">
              <div className="flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-full bg-[#FFC3D0] text-[22px] font-[500] leading-none text-[#CB5C7B]">
                {getInitials(buyerBusinessName)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[16px] font-[500] leading-none text-[#455060]">
                  {buyerBusinessName}
                </p>

                <div className="mt-[6px] flex flex-wrap items-center gap-[6px] text-[14px] text-[#A3ACB8]">
                  <span className="rounded-[5px] border border-[#D9DDD8] bg-[#EAEAE8] px-[6px] py-[2px] text-[14px] leading-none text-[#646764]">
                    {data.rfq.category?.categoryName ?? "General sourcing"}
                  </span>
                  <span>&bull;</span>
                  <span className="text-[14px]">
                    {formatCompactDate(data.rfq.createdAt)}
                  </span>
                </div>

                <h1 className="mt-[10px] text-[17px] font-[500] leading-[1.35] text-[#364152]">
                  {data.rfq.productName}
                </h1>
                <p className="mt-[3px] max-w-[920px] text-[15px] font-[300] leading-[1.45] text-[#7D8794]">
                  {data.rfq.specifications || "No additional specifications provided yet."}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex h-[30px] items-center gap-[8px] self-start rounded-full px-[12px] text-[14px] font-medium leading-none ${requestStatus.className}`}
            >
              <span
                className={`inline-flex h-[8px] w-[8px] rounded-full ${requestStatus.dotClassName}`}
              />
              {requestStatus.label}
            </span>
          </div>

          <div className="pl-0 lg:pl-[69px]">
            <div className="overflow-hidden rounded-[12px] border border-[#E4E7EB] bg-[#F3F4F6]">
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
              <div className="mt-[12px]">
                <BuyerSourcingCloseRequestAction
                  rfqId={data.rfq.rfqId}
                  requestTitle={data.rfq.productName}
                  closeAction={closeSourcingRequest}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="py-[14px] text-center text-[14px] text-[#b3bbc6]">
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
                className="overflow-hidden rounded-[22px] border border-[#dfe5ec] bg-white px-[28px] py-[24px] shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-col gap-[18px]">
                  <div className="flex flex-col gap-[14px] lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-[14px]">
                      <div
                        className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[10px] text-[23px] font-[500] leading-none ${tone}`}
                      >
                        {getInitials(card.engagement.supplierName)}
                      </div>

                      <div className="min-w-0 pt-[4px]">
                        <div className="flex flex-wrap items-center gap-[8px]">
                          <p className="text-[16px] font-[500] leading-none text-[#5d6778]">
                            {card.engagement.supplierName}
                          </p>
                          {card.engagement.verifiedBadge ? (
                            <span className="inline-flex h-[24px] items-center rounded-full border border-[#7fb490] bg-[#f5fbf6] px-[10px] text-[11px] font-semibold leading-none text-[#387d54]">
                              Verified
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-[4px] text-[14px] font-normal leading-[1.35] text-[#9aa3b2]">
                          {[card.engagement.businessType, card.engagement.locationLabel]
                            .filter(Boolean)
                            .join(" · ") || "Supplier details available"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <p
                        className={`inline-flex h-[32px] items-center rounded-full px-[14px] text-[16px] font-[500] leading-none ${getQuoteStatusClassName(
                          card.quotation.status,
                        )}`}
                      >
                        {quoteStatusLabel}
                      </p>
                      <p className="mt-[8px] text-[14px] font-[500] leading-none text-[#3169f5]">
                        Match Score: {card.matchScore == null ? "-" : `${Math.round(card.matchScore)}%`}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                    <QuotationMetricCell
                      label="Quoted Price"
                      value={formatCurrencyPerUnit(
                        card.quotation.pricePerUnit,
                        data.rfq.unit,
                      )}
                    />
                    <QuotationMetricCell
                      label="Total / Week"
                      value={buildMetricValueTotal(
                        card.quotation.pricePerUnit,
                        card.quotation.quantity,
                      )}
                    />
                    <QuotationMetricCell
                      label="Lead Time"
                      value={card.quotation.leadTime || "-"}
                    />
                    <QuotationMetricCell
                      label="MOQ"
                      value={formatQuantity(card.quotation.moq, data.rfq.unit)}
                    />
                  </div>

                  <div className="rounded-[16px] border border-[#dfe5ec] bg-[rgba(55,65,81,0.06)] px-[20px] py-[16px]">
                    <p className="text-[15px] font-normal leading-[1.6] text-[rgba(106,113,127,0.8)]">
                      {card.quotation.notes || "No supplier note was included with this quotation."}
                    </p>
                  </div>

                  <div className="grid gap-[10px] sm:grid-cols-[minmax(0,1fr)_120px]">
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
                          className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#233f68] text-[15px] font-[500] text-white transition hover:bg-[#1c3354]"
                        >
                          Accept Quote
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#233f68] text-[15px] font-[500] text-white opacity-60">
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
                          className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#d7dde6] bg-white text-[15px] font-[500] text-[#4e5c70] transition hover:bg-[#f8fafc]"
                        >
                          Decline
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#d7dde6] bg-white text-[15px] font-[500] text-[#4e5c70] opacity-60">
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
