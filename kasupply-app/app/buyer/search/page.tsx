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
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#223654]">Find Suppliers</h1>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Browse suppliers, products, and certifications across KaSupply.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] md:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search supplier, product, category..."
          className="rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
        />

        <input
          type="text"
          name="city"
          defaultValue={city}
          placeholder="City"
          className="rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
        />

        <input
          type="text"
          name="category"
          defaultValue={category}
          placeholder="Category"
          className="rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
        />

        <label className="flex items-center gap-2 rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-sm text-[#223654]">
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={verified === "1"}
          />
          Verified only
        </label>

        <div className="flex gap-3 md:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
          >
            Search
          </button>

          <Link
            href="/buyer/search"
            className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="text-sm text-[#8b95a5]">
        {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} found
      </div>

      <div className="grid gap-4">
        {suppliers.length === 0 ? (
          <div className="rounded-2xl border border-[#edf1f7] bg-white p-6 text-sm text-[#8b95a5] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            No suppliers found.
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.supplierId}
              className="rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#223654]">
                      {supplier.businessName}
                    </h2>

                    {supplier.verifiedBadge ? (
                      <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-[#8b95a5]">
                    {supplier.businessType} • {supplier.city}, {supplier.province}
                  </p>

                  <p className="text-sm text-[#8b95a5]">
                    {supplier.businessLocation}
                  </p>

                  {supplier.about ? (
                    <p className="max-w-2xl text-sm text-[#4a5b75]">
                      {supplier.about}
                    </p>
                  ) : null}

                  <p className="text-xs text-[#8b95a5]">
                    Approved certifications: {supplier.certificationsCount}
                  </p>
                </div>

                <div>
                  <Link
                    href={`/buyer/search/${supplier.supplierId}`}
                    className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                  >
                    View supplier
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-[#223654]">
                  Top Products
                </h3>

                {supplier.products.length === 0 ? (
                  <p className="text-sm text-[#8b95a5]">No published products yet.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {supplier.products.map((product) => (
                      <div
                        key={product.productId}
                        className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-3"
                      >
                        <p className="font-medium text-[#223654]">
                          {product.productName}
                        </p>
                        <p className="text-sm text-[#8b95a5]">
                          {product.categoryName}
                        </p>
                        <p className="text-sm text-[#4a5b75]">
                          PHP {product.pricePerUnit.toLocaleString()} / {product.unit}
                        </p>
                        <p className="text-xs text-[#8b95a5]">
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
    </main>
  );
}
