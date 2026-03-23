import Link from "next/link";
import { getBuyerRFQs } from "./actions";

function formatDate(dateString: string) {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default async function BuyerRFQsPage() {
  const rfqs = await getBuyerRFQs();

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#223654]">My RFQs</h1>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Manage your quotation requests and supplier engagements.
          </p>
        </div>
      </div>

      {rfqs.length === 0 ? (
        <div className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">No RFQs yet</h2>
          <p className="mt-2 text-sm text-[#8b95a5]">
            Start from a supplier product card with Send Request, or reuse an existing RFQ once you have one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rfqs.map((rfq) => (
            <section
              key={rfq.rfqId}
              className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#223654]">
                      {rfq.productName}
                    </h2>

                    <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs text-[#4a5b75]">
                      RFQ #{rfq.rfqId}
                    </span>

                    <span className="rounded-full bg-blue-600/20 px-2 py-1 text-xs text-blue-600">
                      {rfq.status}
                    </span>

                    <span className="rounded-full border border-[#d7dee8] bg-[#fafbfd] px-2 py-1 text-xs text-[#4a5b75]">
                      {rfq.visibility}
                    </span>
                  </div>

                  <p className="text-sm text-[#4a5b75]">
                    {rfq.quantity} {rfq.unit}
                    {rfq.category ? ` • ${rfq.category.categoryName}` : ""}
                  </p>

                  <p className="text-sm text-[#8b95a5]">
                    Deadline: {formatDate(rfq.deadline)}
                  </p>

                  <p className="text-sm text-[#8b95a5]">
                    Created: {formatDate(rfq.createdAt)}
                  </p>

                  <p className="max-w-3xl text-sm text-[#4a5b75]">
                    {rfq.specifications || "No specifications provided."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/buyer/rfqs/new?rfqId=${rfq.rfqId}${
                      rfq.engagements[0]?.supplierId
                        ? `&supplierId=${rfq.engagements[0].supplierId}`
                        : ""
                    }`}
                    className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                  >
                    Reuse RFQ
                  </Link>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#223654]">
                  Supplier Engagements
                </h3>

                {rfq.engagements.length === 0 ? (
                  <p className="mt-3 text-sm text-[#8b95a5]">
                    No supplier engagements yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {rfq.engagements.map((engagement) => (
                      <div
                        key={engagement.engagementId}
                        className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#223654]">
                            {engagement.supplierName}
                          </p>

                          {engagement.verifiedBadge ? (
                            <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                              Verified
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-[#4a5b75]">
                          Engagement status: {engagement.status}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link
                            href={`/buyer/search/${engagement.supplierId}`}
                            className="text-sm text-[#223654] underline underline-offset-4"
                          >
                            View Supplier
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
