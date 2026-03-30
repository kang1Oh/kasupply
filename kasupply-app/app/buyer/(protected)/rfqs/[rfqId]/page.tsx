import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerCounterOfferForm } from "@/components/buyer-counter-offer-form";
import { acceptOffer, cancelRFQ, getRFQDetails } from "./actions";

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

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function toTitleCase(value: string | null) {
  return String(value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
    case "fulfilled":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "quoted":
    case "negotiating":
    case "countered":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
    case "withdrawn":
    case "cancelled":
    case "closed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
      <p className="text-xs uppercase tracking-wide text-[#8b95a5]">{label}</p>
      <div className="mt-2 text-base font-semibold text-[#223654]">{value}</div>
    </div>
  );
}

export default async function BuyerRFQDetailPage({
  params,
}: {
  params: Promise<{
    rfqId: string;
  }>;
}) {
  const { rfqId } = await params;
  const numericRfqId = Number(rfqId);

  if (!numericRfqId || Number.isNaN(numericRfqId)) {
    notFound();
  }

  const data = await getRFQDetails(numericRfqId);

  if (!data) {
    notFound();
  }

  const acceptedEngagement =
    data.engagements.find((engagement) => engagement.acceptedQuotation) ?? null;
  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[#223654]">
                {data.rfq.productName}
              </h1>
              <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs text-[#4a5b75]">
                RFQ #{data.rfq.rfqId}
              </span>
              <span
                className={`rounded-full border px-2 py-1 text-xs ${getStatusBadgeClasses(
                  data.rfq.status
                )}`}
              >
                {toTitleCase(data.rfq.status)}
              </span>
              <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs text-[#4a5b75]">
                {toTitleCase(data.rfq.visibility)}
              </span>
            </div>

            <p className="text-sm text-[#4a5b75]">
              {data.rfq.quantity} {data.rfq.unit}
              {data.rfq.category ? ` | ${data.rfq.category.categoryName}` : ""}
            </p>

            <p className="max-w-3xl text-sm text-[#8b95a5]">
              {data.rfq.specifications || "No specifications provided."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/buyer/rfqs"
              className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
            >
              Back to RFQs
            </Link>

            {acceptedEngagement?.acceptedQuotation ? (
              <Link
                href={`/buyer/purchase-orders?rfqId=${data.rfq.rfqId}&quoteId=${acceptedEngagement.acceptedQuotation.quoteId}`}
                className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
              >
                Proceed to Purchase Order
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Deadline" value={formatDate(data.rfq.deadline)} />
          <SummaryCard label="Created" value={formatDate(data.rfq.createdAt)} />
          <SummaryCard
            label="Target Price"
            value={formatCurrency(data.rfq.targetPricePerUnit)}
          />
          <SummaryCard
            label="Accepted Quote"
            value={
              acceptedEngagement?.acceptedQuotation
                ? formatCurrency(acceptedEngagement.acceptedQuotation.pricePerUnit)
                : "Not accepted"
            }
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <div>
              <h2 className="text-lg font-semibold text-[#223654]">
                Supplier Engagements
              </h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Review the engagement, negotiation history, and quotations for this RFQ.
              </p>
            </div>

            {data.engagements.length === 0 ? (
              <p className="mt-4 text-sm text-[#8b95a5]">
                No supplier engagements yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {data.engagements.map((engagement) => {
                  const canAcceptOffer =
                    !data.rfq.isClosed &&
                    !!engagement.latestSupplierOffer &&
                    engagement.latestSupplierOffer.status === "pending";
                  const canCounter =
                    data.rfq.visibility !== "public" &&
                    !data.rfq.isClosed &&
                    engagement.status !== "accepted" &&
                    engagement.status !== "rejected";

                  return (
                    <article
                      key={engagement.engagementId}
                      className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[#223654]">
                              {engagement.supplierName}
                            </h3>
                            {engagement.verifiedBadge ? (
                              <span className="rounded-full bg-green-600/15 px-2 py-1 text-xs text-green-700">
                                Verified
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${getStatusBadgeClasses(
                                engagement.status
                              )}`}
                            >
                              {toTitleCase(engagement.status)}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm text-[#4a5b75] md:grid-cols-2">
                            <p>
                              Latest supplier offer:{" "}
                              {engagement.latestSupplierOffer
                                ? formatCurrency(
                                    engagement.latestSupplierOffer.pricePerUnit
                                  )
                                : "No offer yet"}
                            </p>
                            <p>
                              Final quote:{" "}
                              {engagement.acceptedQuotation
                                ? `Quote #${engagement.acceptedQuotation.quoteId}`
                                : "Not accepted"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm">
                            <Link
                              href={`/buyer/search/${engagement.supplierId}`}
                              className="text-[#223654] underline underline-offset-4"
                            >
                              View supplier
                            </Link>
                            {engagement.conversationId ? (
                              <Link
                                href={`/buyer/messages?conversation=${engagement.conversationId}`}
                                className="text-[#223654] underline underline-offset-4"
                              >
                                Open conversation
                              </Link>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {canAcceptOffer && engagement.latestSupplierOffer ? (
                            <form action={acceptOffer}>
                              <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                              <input
                                type="hidden"
                                name="engagementId"
                                value={engagement.engagementId}
                              />
                              <input
                                type="hidden"
                                name="offerId"
                                value={engagement.latestSupplierOffer.offerId}
                              />
                              <button
                                type="submit"
                                className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
                              >
                                Accept Offer
                              </button>
                            </form>
                          ) : null}

                          {!data.rfq.isClosed ? (
                            <form action={cancelRFQ}>
                              <input type="hidden" name="rfqId" value={data.rfq.rfqId} />
                              <button
                                type="submit"
                                className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                              >
                                Cancel RFQ
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>

                      {engagement.quotations.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-[#edf1f7] bg-white p-4">
                          <h4 className="text-sm font-semibold text-[#223654]">
                            Quotations
                          </h4>
                          <div className="mt-3 space-y-3">
                            {engagement.quotations.map((quote) => (
                              <div
                                key={quote.quoteId}
                                className="rounded-lg border border-[#edf1f7] p-4 text-sm text-[#4a5b75]"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-[#223654]">
                                    Quote #{quote.quoteId}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-xs ${getStatusBadgeClasses(
                                      quote.status
                                    )}`}
                                  >
                                    {toTitleCase(quote.status)}
                                  </span>
                                </div>
                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                  <p>Price: {formatCurrency(quote.pricePerUnit)}</p>
                                  <p>Quantity: {quote.quantity}</p>
                                  <p>MOQ: {quote.moq}</p>
                                  <p>Lead time: {quote.leadTime || "-"}</p>
                                  <p>Valid until: {formatDate(quote.validUntil)}</p>
                                  <p>Created: {formatDate(quote.createdAt)}</p>
                                </div>
                                {quote.notes ? (
                                  <p className="mt-3 rounded-lg bg-[#fafbfd] p-3">
                                    {quote.notes}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-xl border border-[#edf1f7] bg-white p-4">
                        <h4 className="text-sm font-semibold text-[#223654]">
                          Negotiation History
                        </h4>

                        {engagement.offers.length === 0 ? (
                          <p className="mt-3 text-sm text-[#8b95a5]">
                            No negotiation offers yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {engagement.offers.map((offer) => (
                              <div
                                key={offer.offerId}
                                className="rounded-lg border border-[#edf1f7] p-4 text-sm text-[#4a5b75]"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-[#223654]">
                                    {offer.offeredBy === data.currentAuthUserId
                                      ? "Buyer offer"
                                      : "Supplier offer"}
                                  </span>
                                  <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs">
                                    Round {offer.offerRound}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-xs ${getStatusBadgeClasses(
                                      offer.status
                                    )}`}
                                  >
                                    {toTitleCase(offer.status)}
                                  </span>
                                </div>
                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                  <p>Price: {formatCurrency(offer.pricePerUnit)}</p>
                                  <p>Quantity: {offer.quantity ?? "-"}</p>
                                  <p>MOQ: {offer.moq ?? "-"}</p>
                                  <p>Lead time: {offer.leadTime || "-"}</p>
                                  <p>Created: {formatDate(offer.createdAt)}</p>
                                </div>
                                {offer.notes ? (
                                  <p className="mt-3 rounded-lg bg-[#fafbfd] p-3">
                                    {offer.notes}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {canCounter ? (
                        <div className="mt-4">
                          <BuyerCounterOfferForm
                            rfqId={data.rfq.rfqId}
                            engagementId={engagement.engagementId}
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold text-[#223654]">RFQ Overview</h2>
            <div className="mt-4 space-y-3 text-sm text-[#4a5b75]">
              <p>
                <span className="font-medium text-[#223654]">Closed:</span>{" "}
                {data.rfq.isClosed ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Engagements:</span>{" "}
                {data.engagements.length}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Delivery location:</span>{" "}
                {data.rfq.deliveryLocation || "Not specified"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">
                  Preferred delivery:
                </span>{" "}
                {formatDate(data.rfq.preferredDeliveryDate)}
              </p>
            </div>
          </section>

          {data.rfq.visibility === "public" ? (
            <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <h2 className="text-lg font-semibold text-[#223654]">
                Match Summary
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[#4a5b75]">
                <p>
                  <span className="font-medium text-[#223654]">Visible matches:</span>{" "}
                  {data.requestMatches.visibleCount}
                </p>
                <p>
                  <span className="font-medium text-[#223654]">Top score:</span>{" "}
                  {data.requestMatches.topScore == null
                    ? "No ranked match"
                    : `${data.requestMatches.topScore}%`}
                </p>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <h2 className="text-lg font-semibold text-[#223654]">Next Step</h2>
              <p className="mt-2 text-sm text-[#8b95a5]">
                Continue negotiating with a counter-offer or accept the latest supplier offer when you are ready to finalize.
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
