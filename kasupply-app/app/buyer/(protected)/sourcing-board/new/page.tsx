import Link from "next/link";
import { createSourcingRequest, getSourcingRequestFormData } from "./actions";

export default async function NewSourcingRequestPage() {
  const { categories } = await getSourcingRequestFormData();

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#223654]">
            Post Sourcing Request
          </h1>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Publish a public RFQ and notify the top matched suppliers on the platform.
          </p>
        </div>

        <Link
          href="/buyer/sourcing-board"
          className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
        >
          Back to Sourcing Board
        </Link>
      </div>

      <form action={createSourcingRequest} className="space-y-6">
        <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Request Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-medium text-[#223654]">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                required
                defaultValue=""
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="unit" className="text-sm font-medium text-[#223654]">
                Unit
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                placeholder="e.g. box, kg, pallet"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="productName" className="text-sm font-medium text-[#223654]">
                Product Name
              </label>
              <input
                id="productName"
                name="productName"
                type="text"
                placeholder="Enter the product you need"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium text-[#223654]">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="deadline" className="text-sm font-medium text-[#223654]">
                Supplier Response Deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="targetPricePerUnit"
                className="text-sm font-medium text-[#223654]"
              >
                Target Price Per Unit
              </label>
              <input
                id="targetPricePerUnit"
                name="targetPricePerUnit"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="preferredDeliveryDate"
                className="text-sm font-medium text-[#223654]"
              >
                Preferred Delivery Date
              </label>
              <input
                id="preferredDeliveryDate"
                name="preferredDeliveryDate"
                type="date"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="deliveryLocation"
                className="text-sm font-medium text-[#223654]"
              >
                Delivery Location
              </label>
              <input
                id="deliveryLocation"
                name="deliveryLocation"
                type="text"
                placeholder="Optional delivery city, warehouse, or site address"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="specifications"
                className="text-sm font-medium text-[#223654]"
              >
                Specifications
              </label>
              <textarea
                id="specifications"
                name="specifications"
                rows={6}
                placeholder="Describe specifications, quality requirements, packaging, delivery notes, and any niche requirements."
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-[#243f68] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#1f3658]"
          >
            Publish Sourcing Request
          </button>

          <Link
            href="/buyer/sourcing-board"
            className="rounded-md border border-[#d7dee8] bg-white px-5 py-3 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
