import Link from "next/link";
import { createRFQ, getNewRFQPrefillData } from "./actions";

type NewRFQPageProps = {
  searchParams?: Promise<{
    supplierId?: string;
    rfqId?: string;
    productId?: string;
  }>;
};

export default async function NewRFQPage({
  searchParams,
}: NewRFQPageProps) {
  const params = (await searchParams) ?? {};

  const prefill = await getNewRFQPrefillData({
    supplierId: params.supplierId,
    rfqId: params.rfqId,
    productId: params.productId,
  });

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#223654]">Create RFQ</h1>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Send a request for quotation to a supplier.
          </p>
        </div>

        <Link
          href="/buyer/rfqs"
          className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
        >
          Back to RFQs
        </Link>
      </div>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 text-sm text-[#4a5b75] md:grid-cols-3">
          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
              Entry Mode
            </p>
            <p className="mt-1 font-medium text-[#223654]">{prefill.entryMode}</p>
          </div>

          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
              Supplier
            </p>
            <p className="mt-1 font-medium text-[#223654]">
              {prefill.supplier?.businessName ?? "Not selected"}
            </p>
          </div>

          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
              Prefill Source
            </p>
            <p className="mt-1 font-medium text-[#223654]">
              {prefill.reusedRfq
                ? `RFQ #${prefill.reusedRfq.rfqId}`
                : prefill.product?.productName}
            </p>
          </div>
        </div>
      </section>

      <form action={createRFQ} className="space-y-6">
        <input
          type="hidden"
          name="supplierId"
          value={prefill.initialValues.supplierId}
        />

        <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Request Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="categoryId"
                className="text-sm font-medium text-[#223654]"
              >
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={prefill.initialValues.categoryId}
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                required
              >
                <option value="">Select category</option>
                {prefill.categories.map((category) => (
                  <option
                    key={category.categoryId}
                    value={category.categoryId}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="unit"
                className="text-sm font-medium text-[#223654]"
              >
                Unit
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                defaultValue={prefill.initialValues.unit}
                placeholder="e.g. kg, box, pack"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="productName"
                className="text-sm font-medium text-[#223654]"
              >
                Product Name
              </label>
              <input
                id="productName"
                name="productName"
                type="text"
                defaultValue={prefill.initialValues.productName}
                placeholder="Enter requested product"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="quantity"
                className="text-sm font-medium text-[#223654]"
              >
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                defaultValue={prefill.initialValues.quantity}
                placeholder="Enter quantity"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deadline"
                className="text-sm font-medium text-[#223654]"
              >
                Deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={prefill.initialValues.deadline}
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                required
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
                rows={5}
                defaultValue={prefill.initialValues.specifications}
                placeholder="Enter product specifications, packaging, preferred quality, delivery notes, etc."
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
            Submit RFQ
          </button>

          <Link
            href="/buyer/rfqs"
            className="rounded-md border border-[#d7dee8] bg-white px-5 py-3 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
