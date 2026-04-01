import Link from "next/link";
import { DatePickerInput } from "@/components/date-picker-input";
import { createRFQ, getNewRFQPrefillData } from "./actions";

type NewRFQPageProps = {
  searchParams?: Promise<{
    supplierId?: string;
    productId?: string;
  }>;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function NewRFQPage({
  searchParams,
}: NewRFQPageProps) {
  const params = (await searchParams) ?? {};
  const prefill = await getNewRFQPrefillData({
    supplierId: params.supplierId,
    productId: params.productId,
  });
  const formKey = [
    prefill.entryMode,
    prefill.supplier?.supplierId ?? "none",
    prefill.product?.productId ?? "none",
  ].join(":");

  return (
    <main className="mx-auto max-w-[1120px] space-y-6 px-6 py-8">
      <div className="space-y-1">
        <p className="text-[12px] text-[#9aa5b6]">My RFQs &gt; New RFQ</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight text-[#223654]">
            Send an RFQ
          </h1>
          <p className="mt-1 text-[16px] text-[#97a3b5]">
            Fill in what you need and the supplier will respond with a quote
          </p>
        </div>
      </div>

      <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#223654]">
          Supplier Info
        </p>
        <div className="mt-4 flex flex-col gap-4 rounded-[14px] border border-[#edf2f7] bg-[#fbfcfe] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {prefill.supplier?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prefill.supplier.avatarUrl}
                alt={`${prefill.supplier.businessName} avatar`}
                className="h-14 w-14 rounded-[14px] border border-[#e6edf6] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#eaf6ed] text-[22px] font-semibold text-[#4d8e55]">
                {getInitials(prefill.supplier?.businessName ?? "Supplier")}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold text-[#223654]">
                  {prefill.supplier?.businessName}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#b8dcc3] bg-[#f3fbf5] px-2.5 py-1 text-[11px] font-medium text-[#3f8a57]">
                  Verified
                </span>
              </div>
              <p className="mt-1 text-[14px] text-[#8b95a5]">
                {prefill.supplier?.businessType} • {prefill.supplier?.locationLabel}
              </p>
            </div>
          </div>

          <Link
            href={prefill.supplier?.profileHref ?? "/buyer/search"}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[13px] font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
          >
            View Profile
          </Link>
        </div>
      </section>

      <form key={formKey} action={createRFQ} className="space-y-6">
        <input
          type="hidden"
          name="supplierId"
          value={prefill.initialValues.supplierId}
        />
        <input type="hidden" name="productId" value={prefill.initialValues.productId} />

        <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#223654]">
        What do you need?
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-12">
        <div className="space-y-2 md:col-span-12">
          <label
            htmlFor="productName"
            className="text-[13px] font-medium text-[#223654]"
          >
            Product / Item <span className="text-[#ff5b4d]">*</span>
          </label>
          <input
            id="productName"
            name="productName"
            type="text"
            defaultValue={prefill.initialValues.productName}
            readOnly={prefill.entryMode === "product-request"}
            className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654] read-only:bg-[#fbfcfe]"
            required
          />
          <input type="hidden" name="categoryId" value={prefill.initialValues.categoryId} />
        </div>

        <div className="space-y-2 md:col-span-10">
          <label
            htmlFor="quantity"
            className="text-[13px] font-medium text-[#223654]"
          >
            Quantity <span className="text-[#ff5b4d]">*</span>
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue={prefill.initialValues.quantity}
            placeholder="e.g. 200"
            className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="unit"
            className="text-[13px] font-medium text-[#223654]"
          >
            Unit <span className="text-[#ff5b4d]">*</span>
          </label>
          <div className="relative">
            <select
          id="unit"
          name="unit"
          defaultValue={prefill.initialValues.unit}
          className="h-[46px] w-full appearance-none rounded-[10px] border border-[#d7dee8] bg-white pl-4 pr-11 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
          required
            >
          {[
            prefill.initialValues.unit,
            "kg",
            "g",
            "pcs",
            "box",
            "pack",
            "bottle",
            "bag",
          ]
            .filter((value, index, array) => value && array.indexOf(value) === index)
            .map((unit) => (
              <option key={unit} value={unit}>
            {unit}
              </option>
            ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#223654]">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
            </span>
          </div>
        </div>

        <div className="space-y-2 md:col-span-12">
          <label
            htmlFor="targetPricePerUnit"
            className="text-[13px] font-medium text-[#223654]"
          >
            Target Price (per unit) <span className="text-[#ff5b4d]">*</span>
          </label>
          <input
            id="targetPricePerUnit"
            name="targetPricePerUnit"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={prefill.initialValues.targetPricePerUnit}
            placeholder="e.g. 10"
            className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654] [color-scheme:light]"
            required
          />
        </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#223654]">
        Delivery Details
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="preferredDeliveryDate"
            className="text-[13px] font-medium text-[#223654]"
          >
            Preferred Date <span className="text-[#ff5b4d]">*</span>
          </label>
          <DatePickerInput
            id="preferredDeliveryDate"
            name="preferredDeliveryDate"
            defaultValue={prefill.initialValues.preferredDeliveryDate}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="deliveryLocation"
            className="text-[13px] font-medium text-[#223654]"
          >
            Location <span className="text-[#ff5b4d]">*</span>
          </label>
          <input
            id="deliveryLocation"
            name="deliveryLocation"
            type="text"
            defaultValue={prefill.initialValues.deliveryLocation}
            placeholder="Enter location"
            className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
            required
          />
        </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#223654]">
        Additional Info
          </h2>

          <div className="mt-4 grid gap-4">
        <div className="space-y-2">
          <label
            htmlFor="notes"
            className="text-[13px] font-medium text-[#223654]"
          >
            Notes / Specifications
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={6}
            defaultValue={prefill.initialValues.notes}
            placeholder="Packaging preferences, quality requirements, special conditions..."
            className="w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
          />
          <p className="text-[11px] text-[#b0b8c5]">
            Optional - helps the supplier prepare a more accurate quote
          </p>
        </div>

        <div className="space-y-2 md:max-w-[320px]">
          <label
            htmlFor="deadline"
            className="text-[13px] font-medium text-[#223654]"
          >
            RFQ deadline <span className="text-[#ff5b4d]">*</span>
          </label>
          <DatePickerInput
            id="deadline"
            name="deadline"
            defaultValue={prefill.initialValues.deadline}
            required
          />
        </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
        href="/buyer/rfqs"
        className="inline-flex h-[46px] items-center rounded-[10px] px-5 text-[14px] text-[#8b95a5] transition hover:text-[#223654]"
          >
        Cancel
          </Link>

          <button
        type="submit"
        className="inline-flex h-[46px] items-center rounded-[10px] bg-[#243f68] px-8 text-[14px] font-medium text-white transition hover:bg-[#1f3658]"
          >
        Send RFQ
          </button>
        </div>
      </form>
    </main>
  );
}
