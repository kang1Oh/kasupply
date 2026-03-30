import Link from "next/link";
import { getBuyerSourcingRequests } from "./actions";

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

export default async function BuyerSourcingBoardPage() {
  const requests = await getBuyerSourcingRequests();

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#223654]">Sourcing Board</h1>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Publish public sourcing requests and review supplier offers in one place.
          </p>
        </div>

        <Link
          href="/buyer/sourcing-board/new"
          className="inline-flex rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
        >
          Post Sourcing Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">No sourcing requests yet</h2>
          <p className="mt-2 text-sm text-[#8b95a5]">
            Post a public RFQ to notify the top 10 matched suppliers across the platform.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <section
              key={request.rfqId}
              className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/buyer/sourcing-board/${request.rfqId}`}
                      className="text-xl font-semibold text-black underline underline-offset-4"
                    >
                      {request.productName}
                    </Link>
                    <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs text-[#4a5b75]">
                      RFQ #{request.rfqId}
                    </span>
                    <span className="rounded-full bg-blue-600/15 px-2 py-1 text-xs text-blue-700">
                      {request.status}
                    </span>
                  </div>

                  <p className="text-sm text-[#4a5b75]">
                    {request.quantity} {request.unit}
                    {request.category ? ` | ${request.category.categoryName}` : ""}
                  </p>

                  <p className="max-w-3xl text-sm text-[#8b95a5]">
                    {request.specifications || "No specifications provided."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/buyer/sourcing-board/${request.rfqId}`}
                    className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                    Deadline
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#223654]">
                    {formatDate(request.deadline)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                    Notified Matches
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#223654]">
                    {request.visibleMatchesCount}
                  </p>
                </div>

                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                    Supplier Engagements
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#223654]">
                    {request.engagements.length}
                  </p>
                </div>

                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                    Target Price
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#223654]">
                    {formatCurrency(request.targetPricePerUnit)}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
