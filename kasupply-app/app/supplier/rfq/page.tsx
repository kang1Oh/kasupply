import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  declineEngagement,
  markEngagementInterested,
  markEngagementViewed,
  submitFinalQuotation,
  submitNegotiationOffer,
} from "./actions";

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

type RfqRow = {
  rfq_id: number;
  buyer_id: number;
  category_id: number | null;
  product_id: number | null;
  requested_product_name: string | null;
  products?:
    | { product_id: number; product_name: string | null }
    | { product_id: number; product_name: string | null }[]
    | null;
  quantity: number;
  unit: string | null;
  specifications: string | null;
  deadline: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NegotiationOfferRow = {
  offer_id: number;
  engagement_id: number;
  offered_by: string | null;
  offer_round: number;
  price_per_unit: number;
  quantity: number;
  lead_time: string | null;
  moq: number;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  supplier_id: number;
  price_per_unit: number;
  quantity: number;
  moq: number;
  lead_time: string | null;
  notes: string | null;
  status: string | null;
  valid_until: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function getSingleRfq(rfqs: RfqRow | RfqRow[] | null | undefined): RfqRow | null {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

function getRfqProductName(rfq: RfqRow | null) {
  if (!rfq) return null;
  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name || rfq.requested_product_name?.trim() || null;
}

export default async function SupplierRfqPage({
  searchParams,
}: {
  searchParams?: Promise<{
    engagement?: string;
    status?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedEngagementId = resolvedSearchParams.engagement
    ? Number(resolvedSearchParams.engagement)
    : null;
  const selectedStatus = String(resolvedSearchParams.status || "").trim();

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/auth/login");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  const { data: engagementsData, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select(`
      engagement_id,
      rfq_id,
      supplier_id,
      status,
      viewed_at,
      initiated_at,
      final_quote_id,
      created_at,
      rfqs (
        rfq_id,
        buyer_id,
        category_id,
        product_id,
        requested_product_name,
        quantity,
        unit,
        specifications,
        deadline,
        status,
        visibility,
        created_at,
        updated_at,
        products!rfqs_product_id_fkey (
          product_id,
          product_name
        )
      )
    `)
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("created_at", { ascending: false });

  if (engagementsError) {
    throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
  }

  const safeEngagements = engagementsData ?? [];

  const filteredEngagements = safeEngagements.filter((engagement) => {
    if (!selectedStatus) return true;
    return String(engagement.status ?? "").toLowerCase() === selectedStatus.toLowerCase();
  });

  const selectedEngagement =
    selectedEngagementId != null
      ? safeEngagements.find(
          (engagement) => engagement.engagement_id === selectedEngagementId
        ) ?? null
      : null;

  let negotiationOffers: NegotiationOfferRow[] = [];
  let finalQuotation: QuotationRow | null = null;

  if (selectedEngagement) {
    const { data: offersData, error: offersError } = await supabase
      .from("negotiation_offers")
      .select(`
        offer_id,
        engagement_id,
        offered_by,
        offer_round,
        price_per_unit,
        quantity,
        lead_time,
        moq,
        notes,
        status,
        created_at
      `)
      .eq("engagement_id", selectedEngagement.engagement_id)
      .order("offer_round", { ascending: true });

    if (offersError) {
      throw new Error(offersError.message || "Failed to load negotiation offers.");
    }

    negotiationOffers = offersData ?? [];

    if (selectedEngagement.final_quote_id) {
      const { data: quotationData, error: quotationError } = await supabase
        .from("quotations")
        .select("*")
        .eq("quote_id", selectedEngagement.final_quote_id)
        .eq("supplier_id", supplierProfile.supplier_id)
        .maybeSingle();

      if (quotationError) {
        throw new Error(quotationError.message || "Failed to load quotation.");
      }

      finalQuotation = quotationData ?? null;
    }
  }

  const totalEngagements = safeEngagements.length;
  const viewingEngagements = safeEngagements.filter(
    (engagement) => String(engagement.status ?? "viewing") === "viewing"
  ).length;
  const negotiatingEngagements = safeEngagements.filter(
    (engagement) => String(engagement.status ?? "") === "negotiating"
  ).length;
  const quotedEngagements = safeEngagements.filter(
    (engagement) => String(engagement.status ?? "") === "quoted"
  ).length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RFQ</h1>
        <p className="text-gray-600">
          These are the RFQs you already chose to engage from the sourcing board.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Engagements</p>
          <h2 className="mt-2 text-2xl font-bold">{totalEngagements}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Viewing</p>
          <h2 className="mt-2 text-2xl font-bold">{viewingEngagements}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Negotiating</p>
          <h2 className="mt-2 text-2xl font-bold">{negotiatingEngagements}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quoted</p>
          <h2 className="mt-2 text-2xl font-bold">{quotedEngagements}</h2>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold">Active RFQ Engagements</h2>
            <p className="text-sm text-gray-500">
              Manage the RFQs you decided to participate in.
            </p>
          </div>

          <form method="GET" className="flex gap-2">
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="viewing">Viewing</option>
              <option value="negotiating">Negotiating</option>
              <option value="quoted">Quoted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>

            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm text-white"
            >
              Apply
            </button>

            <Link
              href="/supplier/rfq"
              className="rounded border px-4 py-2 text-sm"
            >
              Reset
            </Link>
          </form>
        </div>

        {filteredEngagements.length === 0 ? (
          <p className="text-sm text-gray-500">No RFQ engagements found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Viewed</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEngagements.map((engagement) => {
                  const rfq = getSingleRfq(engagement.rfqs);

                  return (
                    <tr key={engagement.engagement_id} className="border-b">
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {getRfqProductName(rfq) ?? "Unnamed RFQ"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {rfq?.specifications ?? "No specifications provided."}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {rfq?.quantity ?? "—"} {rfq?.unit ?? ""}
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(rfq?.deadline ?? null)}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {engagement.status ?? "viewing"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(engagement.viewed_at)}
                      </td>

                      <td className="px-3 py-3">
                        <Link
                          href={`/supplier/rfq/${engagement.engagement_id}`}
                          className="rounded border px-3 py-1 text-xs"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedEngagement && (() => {
        const rfq = getSingleRfq(selectedEngagement.rfqs);

        if (!rfq) return null;

        return (
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">RFQ Details</h2>
                <p className="text-sm text-gray-500">
                  Review this RFQ and continue negotiation or quotation.
                </p>
              </div>

              <Link
                href={`/supplier/rfq${
                  selectedStatus ? `?status=${selectedStatus}` : ""
                }`}
                className="rounded border px-3 py-2 text-sm"
              >
                Close
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">{getRfqProductName(rfq) ?? "Unnamed RFQ"}</h3>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Quantity:</span>{" "}
                    {rfq.quantity} {rfq.unit ?? ""}
                  </div>
                  <div>
                    <span className="font-medium">Deadline:</span>{" "}
                    {formatDate(rfq.deadline)}
                  </div>
                  <div>
                    <span className="font-medium">RFQ status:</span>{" "}
                    {rfq.status ?? "open"}
                  </div>
                  <div>
                    <span className="font-medium">Engagement status:</span>{" "}
                    {selectedEngagement.status ?? "viewing"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Quick Actions</h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={markEngagementViewed}>
                    <input
                      type="hidden"
                      name="engagement_id"
                      value={selectedEngagement.engagement_id}
                    />
                    <button type="submit" className="rounded border px-4 py-2 text-sm">
                      Mark as Viewed
                    </button>
                  </form>

                  <form action={markEngagementInterested}>
                    <input
                      type="hidden"
                      name="engagement_id"
                      value={selectedEngagement.engagement_id}
                    />
                    <button type="submit" className="rounded border px-4 py-2 text-sm">
                      Mark as Interested
                    </button>
                  </form>

                  <form action={declineEngagement}>
                    <input
                      type="hidden"
                      name="engagement_id"
                      value={selectedEngagement.engagement_id}
                    />
                    <button
                      type="submit"
                      className="rounded border border-red-300 px-4 py-2 text-sm text-red-600"
                    >
                      Decline RFQ
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Specifications</h3>
              <p className="mt-3 text-sm text-gray-600">
                {rfq.specifications ?? "No specifications provided."}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Negotiation Offers</h3>

              {negotiationOffers.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  No negotiation offers submitted yet.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-3 py-2 font-medium">Round</th>
                        <th className="px-3 py-2 font-medium">Offered By</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Quantity</th>
                        <th className="px-3 py-2 font-medium">MOQ</th>
                        <th className="px-3 py-2 font-medium">Lead Time</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negotiationOffers.map((offer) => (
                        <tr key={offer.offer_id} className="border-b">
                          <td className="px-3 py-3">{offer.offer_round}</td>
                          <td className="px-3 py-3 capitalize">
                            {offer.offered_by ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            {formatCurrency(Number(offer.price_per_unit))}
                          </td>
                          <td className="px-3 py-3">{offer.quantity}</td>
                          <td className="px-3 py-3">{offer.moq}</td>
                          <td className="px-3 py-3">{offer.lead_time ?? "—"}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              {offer.status ?? "pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form action={submitNegotiationOffer} className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  type="hidden"
                  name="engagement_id"
                  value={selectedEngagement.engagement_id}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Price Per Unit
                  </label>
                  <input
                    name="price_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    defaultValue={rfq.quantity}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">MOQ</label>
                  <input
                    name="moq"
                    type="number"
                    min="0"
                    required
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Lead Time</label>
                  <input
                    name="lead_time"
                    type="text"
                    required
                    className="w-full rounded border px-3 py-2"
                    placeholder="e.g. 7 days"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <textarea
                    name="notes"
                    rows={4}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Add offer remarks or negotiation notes."
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-black px-4 py-2 text-white"
                  >
                    Submit Negotiation Offer
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Final Quotation</h3>

              {finalQuotation ? (
                <div className="mt-3 rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
                  <div>
                    <span className="font-medium">Price per unit:</span>{" "}
                    {formatCurrency(Number(finalQuotation.price_per_unit))}
                  </div>
                  <div>
                    <span className="font-medium">Quantity:</span>{" "}
                    {finalQuotation.quantity}
                  </div>
                  <div>
                    <span className="font-medium">MOQ:</span> {finalQuotation.moq}
                  </div>
                  <div>
                    <span className="font-medium">Lead time:</span>{" "}
                    {finalQuotation.lead_time ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Valid until:</span>{" "}
                    {formatDate(finalQuotation.valid_until)}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {finalQuotation.status ?? "submitted"}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  No final quotation submitted yet.
                </p>
              )}

              <form action={submitFinalQuotation} className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  type="hidden"
                  name="engagement_id"
                  value={selectedEngagement.engagement_id}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Price Per Unit
                  </label>
                  <input
                    name="price_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={finalQuotation?.price_per_unit ?? ""}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    defaultValue={finalQuotation?.quantity ?? rfq.quantity}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">MOQ</label>
                  <input
                    name="moq"
                    type="number"
                    min="0"
                    required
                    defaultValue={finalQuotation?.moq ?? ""}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Lead Time</label>
                  <input
                    name="lead_time"
                    type="text"
                    required
                    defaultValue={finalQuotation?.lead_time ?? ""}
                    className="w-full rounded border px-3 py-2"
                    placeholder="e.g. 10 business days"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Valid Until</label>
                  <input
                    name="valid_until"
                    type="date"
                    required
                    defaultValue={formatDateInput(finalQuotation?.valid_until ?? null)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={finalQuotation?.notes ?? ""}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Add quotation notes or final pricing remarks."
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-black px-4 py-2 text-white"
                  >
                    {finalQuotation ? "Update Final Quotation" : "Submit Final Quotation"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        );
      })()}
    </main>
  );
}
