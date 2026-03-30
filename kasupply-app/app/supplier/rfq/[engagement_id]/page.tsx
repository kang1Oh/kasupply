import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierRfqEngagementDetail } from "../data";
import {
  submitFinalQuotation,
  submitNegotiationOffer,
  withdrawFromRfq,
} from "../actions";

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatDateInput(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function toTitleCase(value: string | null) {
  return String(value ?? "viewing")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string | null) {
  const safeStatus = String(status ?? "").toLowerCase();

  switch (safeStatus) {
    case "viewing":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "negotiating":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "quoted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "accepted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "withdrawn":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[170px_1fr] sm:items-start">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function SupplierRfqEngagementDetailPage({
  params,
}: {
  params: Promise<{
    engagement_id: string;
  }>;
}) {
  const resolvedParams = await params;
  const engagementId = Number(resolvedParams.engagement_id);

  if (!engagementId || Number.isNaN(engagementId)) {
    notFound();
  }

  const data = await getSupplierRfqEngagementDetail(engagementId);

  if (!data || !data.rfq) {
    notFound();
  }

  const returnTo = `/supplier/rfq/${engagementId}`;
  const latestOffer = data.offers[0] ?? null;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                RFQ / RFQ-{data.rfq.rfq_id}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                RFQ-{data.rfq.rfq_id}: {data.rfq.product_name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-lg font-medium text-slate-900">
                    {data.buyer.businessName}
                  </p>
                  {data.buyer.contactName ? (
                    <p className="text-sm text-slate-500">
                      Contact: {data.buyer.contactName}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                    data.engagement.status,
                  )}`}
                >
                  {toTitleCase(data.engagement.status)}
                </span>
                {data.match?.match_score != null ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Match Score: {data.match.match_score}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 max-w-3xl text-sm text-slate-500">
                {data.match?.match_reason
                  ? `High match: ${data.match.match_reason}`
                  : "Manage negotiation and quotation details for this buyer request."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/supplier/rfq"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to RFQ list
              </Link>

              <form action={withdrawFromRfq}>
                <input type="hidden" name="engagement_id" value={engagementId} />
                <input type="hidden" name="return_to" value={returnTo} />
                <button
                  type="submit"
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                >
                  Withdraw from RFQ
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Quantity
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {data.rfq.quantity} {data.rfq.unit ?? ""}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Deadline
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatDate(data.rfq.deadline)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Request Status
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {toTitleCase(data.rfq.status)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Latest Quote
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {data.latestQuotation
                  ? formatCurrency(Number(data.latestQuotation.price_per_unit))
                  : "Not quoted"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard
            title="Buyer Request Information"
            subtitle="Fields shown here are taken only from your current RFQ and engagement schema."
          >
            <div className="divide-y divide-slate-100">
              <DetailRow label="RFQ number" value={`RFQ-${data.rfq.rfq_id}`} />
              <DetailRow label="Buyer" value={data.buyer.businessName} />
              <DetailRow
                label="Contact name"
                value={data.buyer.contactName ?? "No contact name available."}
              />
              <DetailRow label="Product requested" value={data.rfq.product_name} />
              <DetailRow
                label="Quantity"
                value={`${data.rfq.quantity} ${data.rfq.unit ?? ""}`}
              />
              <DetailRow label="Deadline" value={formatDate(data.rfq.deadline)} />
              <DetailRow label="Request status" value={toTitleCase(data.rfq.status)} />
              <DetailRow label="Posted" value={formatDate(data.rfq.created_at)} />
              <DetailRow
                label="Special instructions"
                value={data.rfq.specifications ?? "No specifications provided."}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Match Information"
            subtitle="This reflects the supplier match record attached to the RFQ."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Match Score
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {data.match?.match_score ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notified At
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatDate(data.match?.notified_at ?? null)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Viewed At
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatDate(data.engagement.viewed_at)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Match Reason
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {data.match?.match_reason ?? "No match reason recorded."}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Negotiation History"
            subtitle="Latest supplier and buyer offers for this RFQ engagement."
          >
            {data.offers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No negotiation offers submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.offers.map((offer) => (
                  <div
                    key={offer.offer_id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-900">
                            {offer.offered_by === data.currentAppUserId
                              ? "Supplier Counter Offer"
                              : "Buyer Submission"}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            Round {offer.offer_round}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {offer.status ?? "pending"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {formatDate(offer.created_at)}
                        </p>
                      </div>

                      <div className="grid min-w-[260px] gap-3 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <span className="font-medium">Offer Price:</span>{" "}
                          {formatCurrency(Number(offer.price_per_unit))}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {offer.quantity}
                        </div>
                        <div>
                          <span className="font-medium">MOQ:</span> {offer.moq}
                        </div>
                        <div>
                          <span className="font-medium">Lead Time:</span>{" "}
                          {offer.lead_time ?? "—"}
                        </div>
                      </div>
                    </div>

                    {offer.notes ? (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        {offer.notes}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Quotation / Offer Details"
            subtitle="Use these forms to continue negotiating or submit your final quotation."
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Engagement Status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                      data.engagement.status,
                    )}`}
                  >
                    {toTitleCase(data.engagement.status)}
                  </span>
                  {latestOffer ? (
                    <span className="text-xs text-slate-500">
                      Round {latestOffer.offer_round}
                    </span>
                  ) : null}
                </div>
              </div>

              {data.latestQuotation ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Latest Quotation
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Price:</span>{" "}
                      {formatCurrency(Number(data.latestQuotation.price_per_unit))}
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span>{" "}
                      {data.latestQuotation.quantity}
                    </div>
                    <div>
                      <span className="font-medium">MOQ:</span>{" "}
                      {data.latestQuotation.moq}
                    </div>
                    <div>
                      <span className="font-medium">Lead Time:</span>{" "}
                      {data.latestQuotation.lead_time ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium">Valid Until:</span>{" "}
                      {formatDate(data.latestQuotation.valid_until)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Save Negotiation Offer"
            subtitle="This creates a new negotiation record and moves the engagement into negotiating status."
          >
            <form action={submitNegotiationOffer} className="grid gap-4">
              <input type="hidden" name="engagement_id" value={engagementId} />
              <input type="hidden" name="return_to" value={returnTo} />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Offer Price
                </label>
                <input
                  name="price_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    defaultValue={data.rfq.quantity}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    MOQ
                  </label>
                  <input
                    name="moq"
                    type="number"
                    min="0"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Lead Time
                </label>
                <input
                  name="lead_time"
                  type="text"
                  required
                  placeholder="e.g. 7 days"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Add negotiation remarks."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Save Negotiation Offer
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Submit Quotation"
            subtitle="This stores the latest supplier quotation and updates the engagement status to quoted."
          >
            <form action={submitFinalQuotation} className="grid gap-4">
              <input type="hidden" name="engagement_id" value={engagementId} />
              <input type="hidden" name="return_to" value={returnTo} />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Price Per Unit
                </label>
                <input
                  name="price_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={data.latestQuotation?.price_per_unit ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    defaultValue={data.latestQuotation?.quantity ?? data.rfq.quantity}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    MOQ
                  </label>
                  <input
                    name="moq"
                    type="number"
                    min="0"
                    required
                    defaultValue={data.latestQuotation?.moq ?? ""}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Lead Time
                </label>
                <input
                  name="lead_time"
                  type="text"
                  required
                  defaultValue={data.latestQuotation?.lead_time ?? ""}
                  placeholder="e.g. 10 business days"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Valid Until
                </label>
                <input
                  name="valid_until"
                  type="date"
                  required
                  defaultValue={formatDateInput(data.latestQuotation?.valid_until ?? null)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={data.latestQuotation?.notes ?? ""}
                  placeholder="Add quotation notes."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Submit Quotation
              </button>
            </form>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
