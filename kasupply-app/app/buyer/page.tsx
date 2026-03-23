import Link from "next/link";
import { AccountActivatedModal } from "@/components/modals";
import { getSupplierSearchResults } from "./search/actions";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getPastSuppliers } from "./actions";
import { getOrderAgainItems } from "./actions";

type BuyerPageProps = {
  searchParams?: Promise<{
    activated?: string;
  }>;
};

export default async function BuyerPage({ searchParams }: BuyerPageProps) {
  const recommendedSuppliers = await getSupplierSearchResults();
  const featuredSuppliers = recommendedSuppliers.slice(0, 3);
  const status = await getUserOnboardingStatus();
  const params = (await searchParams) ?? {};
  const showActivatedModal = params.activated === "1";

  const isLoggedInBuyer =
    status.authenticated &&
    status.role === "buyer" &&
    status.hasBusinessProfile &&
    status.hasBuyerProfile &&
    status.hasSubmittedBuyerDocuments;
  const pastSuppliers = isLoggedInBuyer ? await getPastSuppliers() : [];
  const orderAgainItems = isLoggedInBuyer ? await getOrderAgainItems() : [];

  return (
    <>
      <AccountActivatedModal
        isOpen={showActivatedModal}
        title="Account activated!"
        description="Your buyer account is verified and ready. You can now browse suppliers, send RFQs, and post on the sourcing board."
        ctaHref="/buyer"
        ctaLabel="Go To Dashboard"
      />

      <main className="p-6 space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-[#edf1f7] bg-[#243f68] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-30" />
            <div className="absolute inset-0 bg-black/60" />
          </div>

          <div className="relative px-6 py-16 md:px-10 md:py-20">
            <div className="max-w-3xl space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#dbe4f2]">
                KaSupply
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                Find trusted local suppliers for your business needs.
              </h1>

              <p className="max-w-2xl text-sm text-[#dbe4f2] md:text-base">
                Discover suppliers, browse products, and prepare requests for quotation
                through one buyer-friendly marketplace.
              </p>

              <form
                action="/buyer/search"
                method="get"
                className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 md:flex-row"
              >
                <input
                  type="text"
                  name="q"
                  placeholder="Search supplier, product, or category..."
                  className="flex-1 rounded-md border border-white/15 bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#8b95a5] focus:border-[#d7dee8]"
                />

                <button
                  type="submit"
                  className="rounded-md bg-white px-5 py-3 text-sm font-medium text-[#223654] transition hover:bg-[#f8fafc]"
                >
                  Search Suppliers
                </button>
              </form>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/buyer/search"
                  className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
                >
                  Browse all suppliers
                </Link>

                <Link
                  href="/auth/sign-up"
                  className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
                >
                  Create buyer account
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#223654]">Recommended Suppliers</h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Explore suppliers currently available on KaSupply.
              </p>
            </div>

            <Link
              href="/buyer/search"
              className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
            >
              View all
            </Link>
          </div>

          {featuredSuppliers.length === 0 ? (
            <div className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-6 text-sm text-[#8b95a5]">
              No suppliers available yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredSuppliers.map((supplier) => (
                <div
                  key={supplier.supplierId}
                  className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#223654]">
                        {supplier.businessName}
                      </h3>

                      {supplier.verifiedBadge ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-[#8b95a5]">
                      {supplier.businessType} • {supplier.city}, {supplier.province}
                    </p>

                    <p className="line-clamp-3 text-sm text-[#4a5b75]">
                      {supplier.about || "No business description provided yet."}
                    </p>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8b95a5]">
                        Top Products
                      </p>

                      {supplier.products.length === 0 ? (
                        <p className="text-sm text-[#8b95a5]">No published products yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {supplier.products.slice(0, 3).map((product) => (
                            <span
                              key={product.productId}
                              className="rounded-full border border-[#d7dee8] bg-white px-3 py-1 text-xs text-[#4a5b75]"
                            >
                              {product.productName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/buyer/search/${supplier.supplierId}`}
                        className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                      >
                        View Supplier
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#223654]">Past Suppliers</h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Suppliers you previously engaged with will appear here.
              </p>
            </div>

            {isLoggedInBuyer ? (
              <Link
                href="/buyer/rfqs"
                className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
              >
                View RFQs
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
              >
                Log in to view history
              </Link>
            )}
          </div>

          {!isLoggedInBuyer ? (
            <div className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-6">
              <p className="text-sm text-[#8b95a5]">
                Log in as a buyer to view suppliers you previously contacted or requested
                quotations from.
              </p>
            </div>
          ) : pastSuppliers.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-dashed border-[#d7dee8] bg-[#fafbfd] p-5">
                <h3 className="text-base font-semibold text-[#223654]">No past suppliers yet</h3>
                <p className="mt-2 text-sm text-[#8b95a5]">
                  Once you complete transactions with suppliers, your recent supplier
                  history will appear here for quick access.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pastSuppliers.map((supplier) => (
                <div
                  key={supplier.supplierId}
                  className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#223654]">
                        {supplier.businessName}
                      </h3>

                      {supplier.verifiedBadge ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-[#8b95a5]">
                      {supplier.businessType} • {supplier.city}, {supplier.province}
                    </p>

                    <p className="line-clamp-3 text-sm text-[#4a5b75]">
                      {supplier.about || "No business description provided yet."}
                    </p>

                    <div className="text-sm text-[#4a5b75]">
                      <p>Completed orders: {supplier.completedOrdersCount}</p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/buyer/search/${supplier.supplierId}`}
                        className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                      >
                        View Supplier
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#223654]">Order Again</h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Quickly reuse products or requests you frequently purchase.
              </p>
            </div>

            {isLoggedInBuyer ? (
              <Link
                href="/buyer/rfqs/new"
                className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
              >
                Create RFQ
              </Link>
            ) : (
              <Link
                href="/auth/sign-up"
                className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
              >
                Create buyer account
              </Link>
            )}
          </div>

          {!isLoggedInBuyer ? (
            <div className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-6">
              <p className="text-sm text-[#8b95a5]">
                Sign up or log in to save supplier history and quickly reorder products
                from your previous requests.
              </p>
            </div>
          ) : orderAgainItems.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-dashed border-[#d7dee8] bg-[#fafbfd] p-5">
                <h3 className="text-base font-semibold text-[#223654]">No repeat orders yet</h3>
                <p className="mt-2 text-sm text-[#8b95a5]">
                  Your reusable RFQ requests will appear here once you complete orders
                  with suppliers.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orderAgainItems.map((item) => (
                <div
                  key={`${item.supplierId}-${item.rfqId}`}
                  className="rounded-2xl border border-[#edf1f7] bg-[#fafbfd] p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#223654]">
                        {item.productName}
                      </h3>

                      {item.verifiedBadge ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-[#4a5b75]">Supplier: {item.supplierName}</p>

                    <p className="text-sm text-[#8b95a5]">
                      Previous request: {item.quantity} {item.unit}
                    </p>

                    <p className="line-clamp-3 text-sm text-[#4a5b75]">
                      {item.specifications || "No additional specifications provided."}
                    </p>

                    <div className="pt-2">
                      <Link
                        href={`/buyer/rfqs/new?supplierId=${item.supplierId}&rfqId=${item.rfqId}`}
                        className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                      >
                        Reuse RFQ
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
