import Link from "next/link";
import { getSupplierSearchResults } from "./search/actions";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getPastSuppliers } from "./actions";
import { getOrderAgainItems } from "./actions";

export default async function BuyerPage() {
  const recommendedSuppliers = await getSupplierSearchResults();
  const featuredSuppliers = recommendedSuppliers.slice(0, 3);
  const status = await getUserOnboardingStatus();

  const isLoggedInBuyer =
  status.authenticated &&
  status.role === "buyer" &&
  status.hasBusinessProfile &&
  status.hasBuyerProfile &&
  status.hasSubmittedBuyerDocuments;
  const pastSuppliers = isLoggedInBuyer ? await getPastSuppliers() : [];
  const orderAgainItems = isLoggedInBuyer ? await getOrderAgainItems() : [];

  return (
    <div className="space-y-8">
      {/* hero section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-30" />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative px-6 py-16 md:px-10 md:py-24">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-300">
              KaSupply
            </p>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Find trusted local suppliers for your business needs.
            </h1>

            <p className="max-w-2xl text-sm text-gray-300 md:text-base">
              Discover suppliers, browse products, and prepare requests for
              quotation through one buyer-friendly marketplace.
            </p>

            <form
              action="/buyer/search"
              method="get"
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 md:flex-row"
            >
              <input
                type="text"
                name="q"
                placeholder="Search supplier, product, or category..."
                className="flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              />

              <button
                type="submit"
                className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black"
              >
                Search Suppliers
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/buyer/search"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Browse all suppliers
              </Link>

              <Link
                href="/auth/sign-up"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Create buyer account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* recommended suppliers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Recommended Suppliers</h2>
            <p className="mt-1 text-sm text-gray-300">
              Explore suppliers currently available on KaSupply.
            </p>
          </div>

          <Link
            href="/buyer/search"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
          >
            View all
          </Link>
        </div>

        {featuredSuppliers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
            No suppliers available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredSuppliers.map((supplier) => (
              <div
                key={supplier.supplierId}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {supplier.businessName}
                    </h3>

                    {supplier.verifiedBadge ? (
                      <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-300">
                    {supplier.businessType} • {supplier.city}, {supplier.province}
                  </p>

                  <p className="line-clamp-3 text-sm text-gray-400">
                    {supplier.about || "No business description provided yet."}
                  </p>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Top Products
                    </p>

                    {supplier.products.length === 0 ? (
                      <p className="text-sm text-gray-500">No published products yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {supplier.products.slice(0, 3).map((product) => (
                          <span
                            key={product.productId}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300"
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
                      className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
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

      {/* past suppliers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Past Suppliers</h2>
            <p className="mt-1 text-sm text-gray-300">
              Suppliers you previously engaged with will appear here.
            </p>
          </div>

          {isLoggedInBuyer ? (
            <Link
              href="/buyer/rfqs"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              View RFQs
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Log in to view history
            </Link>
          )}
        </div>

        {!isLoggedInBuyer ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-300">
              Log in as a buyer to view suppliers you previously contacted or requested
              quotations from.
            </p>
          </div>
        ) : (
          pastSuppliers.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">No past suppliers yet</h3>
                <p className="mt-2 text-sm text-gray-400">
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
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {supplier.businessName}
                      </h3>

                      {supplier.verifiedBadge ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-gray-300">
                      {supplier.businessType} • {supplier.city}, {supplier.province}
                    </p>

                    <p className="line-clamp-3 text-sm text-gray-400">
                      {supplier.about || "No business description provided yet."}
                    </p>

                    <div className="text-sm text-gray-300">
                      <p>Completed orders: {supplier.completedOrdersCount}</p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/buyer/search/${supplier.supplierId}`}
                        className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
                      >
                        View Supplier
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* order again */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Order Again</h2>
            <p className="mt-1 text-sm text-gray-300">
              Quickly reuse products or requests you frequently purchase.
            </p>
          </div>

          {isLoggedInBuyer ? (
            <Link
              href="/buyer/rfqs/new"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Create RFQ
            </Link>
          ) : (
            <Link
              href="/auth/sign-up"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Create buyer account
            </Link>
          )}
        </div>

        {!isLoggedInBuyer ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-300">
              Sign up or log in to save supplier history and quickly reorder products
              from your previous requests.
            </p>
          </div>
        ) : (
          orderAgainItems.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">No repeat orders yet</h3>
                <p className="mt-2 text-sm text-gray-400">
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
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {item.productName}
                      </h3>

                      {item.verifiedBadge ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-gray-300">
                      Supplier: {item.supplierName}
                    </p>

                    <p className="text-sm text-gray-400">
                      Previous request: {item.quantity} {item.unit}
                    </p>

                    <p className="line-clamp-3 text-sm text-gray-400">
                      {item.specifications || "No additional specifications provided."}
                    </p>

                    <div className="pt-2">
                      <Link
                        href={`/buyer/rfqs/new?supplierId=${item.supplierId}&rfqId=${item.rfqId}`}
                        className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
                      >
                        Reuse RFQ
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}