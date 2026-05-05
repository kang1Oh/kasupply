import {
  getSupplierSearchIndexOverview,
  getSupplierSearchIndexQueue,
} from "@/lib/search";
import {
  reindexSingleSupplierSearchProfile,
  runSupplierSearchBackfill,
} from "./actions";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not indexed yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getToneClasses(tone: string | undefined) {
  switch (tone) {
    case "success":
      return "border-[#b9e7c6] bg-[#f3fcf5] text-[#245c35]";
    case "warning":
      return "border-[#f4d7a1] bg-[#fffaf1] text-[#8a5a10]";
    case "error":
      return "border-[#f0b3b3] bg-[#fff5f5] text-[#9f2d2d]";
    default:
      return "border-[#d9e3f0] bg-white text-[#4a5b73]";
  }
}

function getStatusPillClasses(status: string) {
  switch (status) {
    case "indexed":
      return "border-[#b9e7c6] bg-[#f3fcf5] text-[#245c35]";
    case "partial":
      return "border-[#f4d7a1] bg-[#fffaf1] text-[#8a5a10]";
    default:
      return "border-[#e3e8f0] bg-[#f8fafc] text-[#64748b]";
  }
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <p className="text-sm text-[#8b95a5]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#223654]">{value}</p>
      <p className="mt-2 text-sm text-[#6b7280]">{helper}</p>
    </div>
  );
}

export default async function AdminSearchIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    tone?: string;
  }>;
}) {
  const [{ message, tone }, overview, queue] = await Promise.all([
    searchParams ?? Promise.resolve({}),
    getSupplierSearchIndexOverview(),
    getSupplierSearchIndexQueue(),
  ]);

  const queuePreview = [...queue].sort((left, right) => {
    const statusOrder = { pending: 0, partial: 1, indexed: 2 } as const;

    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status];
    }

    return left.supplierId - right.supplierId;
  });

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Search Infrastructure
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Supplier Search Index
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
              Use this page to backfill existing suppliers into the semantic search index and rerun
              indexing after supplier profile or product changes.
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <section
          className={`rounded-[18px] border px-5 py-4 text-sm shadow-[0_6px_18px_rgba(15,23,42,0.03)] ${getToneClasses(
            tone
          )}`}
        >
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Suppliers"
          value={overview.totalSuppliers}
          helper="All supplier profiles currently eligible for indexing."
        />
        <MetricCard
          label="Indexed Suppliers"
          value={overview.indexedSuppliers}
          helper="Suppliers whose active search documents already have embeddings."
        />
        <MetricCard
          label="Pending Suppliers"
          value={overview.pendingSuppliers}
          helper="Suppliers that still need their first semantic-search backfill."
        />
        <MetricCard
          label="Embedded Documents"
          value={overview.embeddedDocuments}
          helper="Total supplier profile and product documents with embeddings."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Batch Backfill</h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Index the next group of suppliers that are still pending or partially indexed.
          </p>

          <form action={runSupplierSearchBackfill} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[#334155]">Batch size</span>
                <input
                  type="number"
                  name="limit"
                  min="1"
                  max="25"
                  defaultValue="5"
                  className="h-11 w-full rounded-xl border border-[#d7dee8] px-3 text-sm text-[#223654] outline-none focus:border-[#223654]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-[#edf2f7] bg-[#fbfcfe] px-4 py-3 text-sm text-[#475569]">
                <input
                  type="checkbox"
                  name="includeIndexed"
                  value="true"
                  className="h-4 w-4 rounded border-[#cbd5e1]"
                />
                Include already indexed suppliers
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#223f68] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3454]"
            >
              Run Backfill Batch
            </button>
          </form>
        </div>

        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Manual Reindex</h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Rebuild the semantic-search documents for a specific supplier after editing their
            profile or inventory.
          </p>

          <form action={reindexSingleSupplierSearchProfile} className="mt-5 space-y-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-[#334155]">Supplier ID</span>
              <input
                type="number"
                name="supplierId"
                min="1"
                placeholder="Enter supplier ID"
                className="h-11 w-full rounded-xl border border-[#d7dee8] px-3 text-sm text-[#223654] outline-none focus:border-[#223654]"
                required
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#223f68] px-5 text-sm font-semibold text-[#223f68] transition hover:bg-[#f8fafc]"
            >
              Reindex Supplier
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#223654]">Index Queue</h2>
            <p className="mt-1 text-sm text-[#8b95a5]">
              Pending suppliers should be backfilled before semantic buyer search will perform well.
            </p>
          </div>
          <div className="text-sm text-[#6b7280]">
            Published-product suppliers: {overview.suppliersWithPublishedProducts} | Partial:{" "}
            {overview.partialSuppliers} | Active docs: {overview.activeDocuments}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#7b8797]">
              <tr className="border-b border-[#edf1f6]">
                <th className="px-3 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Products</th>
                <th className="px-3 py-3 font-medium">Docs</th>
                <th className="px-3 py-3 font-medium">Last Indexed</th>
              </tr>
            </thead>
            <tbody>
              {queuePreview.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#6b7280]">
                    No suppliers found for search indexing.
                  </td>
                </tr>
              ) : (
                queuePreview.map((item) => (
                  <tr key={item.supplierId} className="border-b border-[#f3f6fb] align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#223654]">{item.businessName}</p>
                      <p className="text-xs text-[#6b7280]">
                        Supplier #{item.supplierId} | Profile #{item.profileId}
                      </p>
                      <p className="mt-1 text-xs text-[#8b95a5]">
                        {[item.city, item.province].filter(Boolean).join(", ") || "No location"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-medium uppercase tracking-[0.12em] ${getStatusPillClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      {item.verifiedBadge ? (
                        <p className="mt-2 text-xs text-[#245c35]">Verified badge</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[#475569]">
                      {item.publishedProductCount}
                    </td>
                    <td className="px-3 py-3 text-[#475569]">
                      {item.embeddedDocumentCount}/{item.activeDocumentCount}
                    </td>
                    <td className="px-3 py-3 text-[#475569]">
                      {formatDateTime(item.lastIndexedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
