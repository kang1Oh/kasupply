import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { engageWithRfq } from "./actions";

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

function getRfqProductName(
  rfq:
    | {
        product_id?: number | null;
        requested_product_name?: string | null;
        products?:
          | { product_id: number; product_name: string | null }
          | { product_id: number; product_name: string | null }[]
          | null;
      }
    | null
    | undefined,
) {
  if (!rfq) return null;
  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name || rfq.requested_product_name?.trim() || null;
}

export default async function SupplierBulletinBoardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const viewingId = resolvedSearchParams.view
    ? Number(resolvedSearchParams.view)
    : null;

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

  const { data: matchedRfqs, error: matchedRfqsError } = await supabase
    .from("request_matches")
    .select(`
      match_id,
      rfq_id,
      supplier_id,
      match_score,
      match_reason,
      is_visible,
      notified_at,
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
    .eq("is_visible", true)
    .order("notified_at", { ascending: false });

  if (matchedRfqsError) {
    throw new Error(matchedRfqsError.message || "Failed to load matched RFQs.");
  }

  const safeMatchedRfqs = matchedRfqs ?? [];

  const selectedMatch =
    viewingId != null
      ? safeMatchedRfqs.find((row) => row.rfq_id === viewingId) ?? null
      : null;

  const totalMatches = safeMatchedRfqs.length;
  const highMatches = safeMatchedRfqs.filter(
    (row) => Number(row.match_score ?? 0) >= 0.8
  ).length;
  const mediumMatches = safeMatchedRfqs.filter((row) => {
    const score = Number(row.match_score ?? 0);
    return score >= 0.5 && score < 0.8;
  }).length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sourcing Board</h1>
        <p className="text-gray-600">
          These are buyer RFQs matched to your supplier profile. Choose one to bid and move it into your RFQ page.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Matched RFQs</p>
          <h2 className="mt-2 text-2xl font-bold">{totalMatches}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">High Match</p>
          <h2 className="mt-2 text-2xl font-bold">{highMatches}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Medium Match</p>
          <h2 className="mt-2 text-2xl font-bold">{mediumMatches}</h2>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Matched RFQ Opportunities</h2>
          <p className="text-sm text-gray-500">
            These requests are visible to you because they passed the matching threshold.
          </p>
        </div>

        {safeMatchedRfqs.length === 0 ? (
          <p className="text-sm text-gray-500">No matched RFQs available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 font-medium">Match Score</th>
                  <th className="px-3 py-2 font-medium">Notified</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeMatchedRfqs.map((match) => {
                  const rfq = Array.isArray(match.rfqs) ? match.rfqs[0] : match.rfqs;

                  return (
                    <tr key={match.match_id} className="border-b">
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
                        {match.match_score != null
                          ? Number(match.match_score).toFixed(2)
                          : "—"}
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(match.notified_at)}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/supplier/bulletin-board?view=${match.rfq_id}`}
                            className="rounded border px-3 py-1 text-xs"
                          >
                            View
                          </Link>

                          <form action={engageWithRfq}>
                            <input type="hidden" name="rfq_id" value={match.rfq_id} />
                            <button
                              type="submit"
                              className="rounded bg-black px-3 py-1 text-xs text-white"
                            >
                              Bid RFQ
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedMatch && (() => {
        const rfq = Array.isArray(selectedMatch.rfqs)
          ? selectedMatch.rfqs[0]
          : selectedMatch.rfqs;

        if (!rfq) return null;

        return (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">RFQ Opportunity Details</h2>
                <p className="text-sm text-gray-500">
                  Review this matched RFQ before deciding to engage.
                </p>
              </div>

              <Link
                href="/dashboard/supplier/bulletin-board"
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
                    <span className="font-medium">Visibility:</span>{" "}
                    {rfq.visibility ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">RFQ status:</span>{" "}
                    {rfq.status ?? "open"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Matching Details</h3>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Match score:</span>{" "}
                    {selectedMatch.match_score != null
                      ? Number(selectedMatch.match_score).toFixed(2)
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Reason:</span>{" "}
                    {selectedMatch.match_reason ?? "No reason provided."}
                  </div>
                  <div>
                    <span className="font-medium">Notified at:</span>{" "}
                    {formatDate(selectedMatch.notified_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border p-4">
              <h3 className="font-medium">Specifications</h3>
              <p className="mt-3 text-sm text-gray-600">
                {rfq.specifications ?? "No specifications provided."}
              </p>
            </div>

            <div className="mt-6">
              <form action={engageWithRfq}>
                <input type="hidden" name="rfq_id" value={selectedMatch.rfq_id} />
                <button
                  type="submit"
                  className="rounded bg-black px-4 py-2 text-white"
                >
                  Bid This RFQ
                </button>
              </form>
            </div>
          </section>
        );
      })()}
    </main>
  );
}
