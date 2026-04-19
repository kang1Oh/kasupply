import { Suspense } from "react";
import Link from "next/link";
import { getAdminModerationPageData, toggleListingModeration } from "@/app/admin/dashboard/actions";
import { DashboardCard, formatDate, getStatusPillClasses } from "@/components/admin/admin-view-helpers";

type ModerationPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    visibility?: string | string[];
    page?: string | string[];
  }>;
};

function ModerationPageFallback() {
  return <div>Loading content moderation...</div>;
}

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function buildModerationHref({
  query,
  visibility,
  page,
}: {
  query: string;
  visibility: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (visibility && visibility !== "all") params.set("visibility", visibility);
  if (page > 1) params.set("page", String(page));

  const suffix = params.toString();
  return suffix ? `/admin/moderation?${suffix}` : "/admin/moderation";
}

async function ModerationPageContent({ searchParams }: ModerationPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = readSearchParam(resolvedSearchParams.q).trim();
  const visibility = readSearchParam(resolvedSearchParams.visibility).trim().toLowerCase();
  const page = Number(readSearchParam(resolvedSearchParams.page));
  const data = await getAdminModerationPageData({ query, visibility, page });

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Content Moderation
            </h1>
          </div>

          <Link
            href="/admin/dashboard"
            className="inline-flex rounded-lg border border-[#223654] px-4 py-2.5 text-sm font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Listings"
          value={data.summary.totalListings}
          subtitle="Listings currently tracked by moderation."
        />
        <DashboardCard
          title="Published Listings"
          value={data.summary.publishedListings}
          subtitle="Total live listings across the marketplace."
        />
        <DashboardCard
          title="Hidden Listings"
          value={data.summary.hiddenListings}
          subtitle="Listings currently taken out of public view."
        />
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Listings</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Search, filter, and page through listings here. Removing a live listing now requires a
          reason so moderation decisions stay easier to audit.
        </p>

        <form
          method="get"
          className="mt-5 grid gap-3 rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
        >
          <input
            type="text"
            name="q"
            defaultValue={data.filters.query}
            placeholder="Search listing name, supplier, or ID"
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          />
          <select
            name="visibility"
            defaultValue={data.filters.visibility}
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          >
            <option value="all">All listings</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
          >
            Apply filters
          </button>
          <Link
            href="/admin/moderation"
            className="inline-flex items-center justify-center rounded-lg border border-[#d6deea] px-4 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-white"
          >
            Reset
          </Link>
        </form>

        <p className="mt-4 text-sm text-[#6b7280]">
          {data.pagination.totalItems === 0
            ? "No listings match the current filters."
            : `Showing ${data.pagination.startIndex}-${data.pagination.endIndex} of ${data.pagination.totalItems} listings.`}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#7b8797]">
              <tr className="border-b border-[#edf1f6]">
                <th className="px-3 py-3 font-medium">Listing</th>
                <th className="px-3 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.productListings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-[#6b7280]">
                    No listings match this search yet.
                  </td>
                </tr>
              ) : (
                data.productListings.map((product) => (
                  <tr key={product.productId} className="border-b border-[#f3f6fb] align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#223654]">{product.productName}</p>
                      <p className="text-xs text-[#6b7280]">Product #{product.productId}</p>
                      <p className="mt-1 text-xs text-[#8b95a5]">
                        Updated {formatDate(product.updatedAt)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#334155]">{product.supplierName}</p>
                      <p className="text-xs text-[#6b7280]">
                        Stock: {product.stockAvailable ?? "N/A"} | Price:{" "}
                        {product.pricePerUnit ?? "N/A"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                          product.isPublished ? "published" : "draft"
                        )}`}
                      >
                        {product.isPublished ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <form action={toggleListingModeration} className="flex flex-col gap-2">
                        <input type="hidden" name="product_id" value={product.productId} />
                        <input
                          type="hidden"
                          name="next_published"
                          value={product.isPublished ? "false" : "true"}
                        />
                        <input
                          type="text"
                          name="reason"
                          required={product.isPublished}
                          placeholder={
                            product.isPublished
                              ? "Reason required when removing a listing"
                              : "Optional reason"
                          }
                          className="rounded-md border border-[#d6deea] bg-white px-3 py-2 text-xs text-[#334155]"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-[#223654] px-3 py-2 text-xs font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
                        >
                          {product.isPublished ? "Remove Listing" : "Restore Listing"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[#edf2f7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#8b95a5]">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {data.pagination.hasPreviousPage ? (
              <Link
                href={buildModerationHref({
                  query: data.filters.query,
                  visibility: data.filters.visibility,
                  page: data.pagination.page - 1,
                })}
                className="rounded-lg border border-[#d6deea] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-4 py-2 text-sm font-semibold text-[#94a3b8]">
                Previous
              </span>
            )}
            {data.pagination.hasNextPage ? (
              <Link
                href={buildModerationHref({
                  query: data.filters.query,
                  visibility: data.filters.visibility,
                  page: data.pagination.page + 1,
                })}
                className="rounded-lg border border-[#223654] px-4 py-2 text-sm font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-4 py-2 text-sm font-semibold text-[#94a3b8]">
                Next
              </span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminModerationPage(props: ModerationPageProps) {
  return (
    <Suspense fallback={<ModerationPageFallback />}>
      <ModerationPageContent {...props} />
    </Suspense>
  );
}
