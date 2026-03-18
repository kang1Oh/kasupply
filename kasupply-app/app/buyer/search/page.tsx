import Link from "next/link";
import { getSupplierSearchResults } from "./actions";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    category?: string;
    verified?: string;
  }>;
};

export default async function BuyerSearchPage({
  searchParams,
}: SearchPageProps) {
  const params = (await searchParams) ?? {};

  const q = params.q ?? "";
  const city = params.city ?? "";
  const category = params.category ?? "";
  const verified = params.verified ?? "";

  const suppliers = await getSupplierSearchResults({
    query: q,
    city,
    category,
    verifiedOnly: verified === "1",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Find Suppliers</h1>
        <p className="mt-2 text-sm text-gray-300">
          Browse suppliers, products, and certifications across KaSupply.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search supplier, product, category..."
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
        />

        <input
          type="text"
          name="city"
          defaultValue={city}
          placeholder="City"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
        />

        <input
          type="text"
          name="category"
          defaultValue={category}
          placeholder="Category"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
        />

        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white">
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={verified === "1"}
          />
          Verified only
        </label>

        <div className="md:col-span-4 flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Search
          </button>

          <Link
            href="/buyer/search"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="text-sm text-gray-300">
        {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} found
      </div>

      <div className="grid gap-4">
        {suppliers.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
            No suppliers found.
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.supplierId}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">
                      {supplier.businessName}
                    </h2>

                    {supplier.verifiedBadge ? (
                      <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-300">
                    {supplier.businessType} • {supplier.city}, {supplier.province}
                  </p>

                  <p className="text-sm text-gray-400">
                    {supplier.businessLocation}
                  </p>

                  {supplier.about ? (
                    <p className="max-w-2xl text-sm text-gray-300">
                      {supplier.about}
                    </p>
                  ) : null}

                  <p className="text-xs text-gray-400">
                    Approved certifications: {supplier.certificationsCount}
                  </p>
                </div>

                <div>
                  <Link
                    href={`/buyer/search/${supplier.supplierId}`}
                    className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                  >
                    View supplier
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-white">
                  Top Products
                </h3>

                {supplier.products.length === 0 ? (
                  <p className="text-sm text-gray-400">No published products yet.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {supplier.products.map((product) => (
                      <div
                        key={product.productId}
                        className="rounded-lg border border-white/10 bg-black/40 p-3"
                      >
                        <p className="font-medium text-white">
                          {product.productName}
                        </p>
                        <p className="text-sm text-gray-400">
                          {product.categoryName}
                        </p>
                        <p className="text-sm text-gray-300">
                          ₱{product.pricePerUnit.toLocaleString()} / {product.unit}
                        </p>
                        <p className="text-xs text-gray-400">
                          MOQ: {product.moq}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}