import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { createPurchaseOrder } from "./actions";
import { getBuyerPurchaseOrders, getPurchaseOrderCreationDraft } from "./data";

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

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

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "shipped":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default async function BuyerPurchaseOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    rfqId?: string;
    quoteId?: string;
  }>;
}) {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "documents",
    targetPath: "/buyer/purchase-orders",
    reason: "purchase-orders",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const rfqId = Number(resolvedSearchParams.rfqId || "");
  const quoteId = Number(resolvedSearchParams.quoteId || "");
  const shouldLoadDraft = !Number.isNaN(rfqId) && rfqId > 0 && !Number.isNaN(quoteId) && quoteId > 0;

  const [orders, creationDraft] = await Promise.all([
    getBuyerPurchaseOrders(),
    shouldLoadDraft ? getPurchaseOrderCreationDraft(rfqId, quoteId) : Promise.resolve(null),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#223654]">Purchase Orders</h1>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Create purchase orders from accepted quotations and track every supplier order in one place.
        </p>
      </div>

      {shouldLoadDraft ? (
        <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#223654]">Create Purchase Order</h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                This form is pre-filled from the accepted quotation. Only buyer-controlled fields remain editable.
              </p>
            </div>

            <Link
              href="/buyer/purchase-orders"
              className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
            >
              Cancel
            </Link>
          </div>

          {!creationDraft ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              The accepted quotation for this RFQ could not be loaded.
            </div>
          ) : creationDraft.existingPurchaseOrderId ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              A purchase order already exists for this accepted quotation.{" "}
              <Link
                href={`/buyer/purchase-orders/${creationDraft.existingPurchaseOrderId}`}
                className="font-semibold underline underline-offset-4"
              >
                Open purchase order
              </Link>
            </div>
          ) : (
            <form action={createPurchaseOrder} className="mt-6 space-y-6">
              <input type="hidden" name="rfqId" value={creationDraft.rfqId} />
              <input type="hidden" name="quoteId" value={creationDraft.quoteId} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Supplier</p>
                  <p className="mt-2 text-base font-semibold text-[#223654]">
                    {creationDraft.supplierName}
                  </p>
                </div>

                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Quotation</p>
                  <p className="mt-2 text-base font-semibold text-[#223654]">
                    Quote #{creationDraft.quoteId}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Product</p>
                  <p className="mt-2 text-sm font-semibold text-[#223654]">
                    {creationDraft.productName}
                  </p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    {creationDraft.quantity} {creationDraft.unit}
                  </p>
                  <p className="mt-2 text-sm text-[#8b95a5]">
                    {creationDraft.specifications || "No specifications provided."}
                  </p>
                </div>

                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Agreed Terms</p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    Price per unit: {formatCurrency(creationDraft.pricePerUnit)}
                  </p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    Initial total: {formatCurrency(creationDraft.totalAmount)}
                  </p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    Lead time: {creationDraft.leadTime || "Not specified"}
                  </p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    Delivery location: {creationDraft.deliveryLocation || "Not specified"}
                  </p>
                  <p className="mt-2 text-sm text-[#4a5b75]">
                    Preferred delivery: {formatDate(creationDraft.preferredDeliveryDate)}
                  </p>
                </div>
              </div>

              {creationDraft.quotationNotes ? (
                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4 text-sm text-[#4a5b75]">
                  <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Quotation Notes</p>
                  <p className="mt-2">{creationDraft.quotationNotes}</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#223654]">Payment method</span>
                  <input
                    type="text"
                    name="paymentMethod"
                    required
                    placeholder="e.g. Bank transfer, Cash on delivery"
                    className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#223654]">Terms and conditions</span>
                  <textarea
                    name="termsAndConditions"
                    rows={4}
                    placeholder="Add any delivery, payment, or coordination terms for this order."
                    className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#223654]">Additional notes</span>
                <textarea
                  name="additionalNotes"
                  rows={4}
                  placeholder="Add internal order context or anything the supplier should see."
                  className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-[#243f68] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#1f3658]"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#223654]">Order List</h2>
            <p className="mt-1 text-sm text-[#8b95a5]">
              Review confirmed orders, upload receipt proof when the order is shipped, and monitor completion.
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#d7dee8] bg-[#fafbfd] p-6 text-sm text-[#8b95a5]">
            No purchase orders yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {orders.map((order) => (
              <article
                key={order.poId}
                className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/buyer/purchase-orders/${order.poId}`}
                        className="text-lg font-semibold text-[#223654] underline underline-offset-4"
                      >
                        {order.productName}
                      </Link>
                      <span className="rounded-full border border-[#d7dee8] bg-white px-2 py-1 text-xs text-[#4a5b75]">
                        {order.poNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusBadgeClasses(order.status)}`}
                      >
                        {toTitleCase(order.status)}
                      </span>
                    </div>

                    <p className="text-sm text-[#4a5b75]">
                      Supplier: {order.supplierInfo?.businessName ?? "Unknown supplier"}
                    </p>
                    <p className="text-sm text-[#4a5b75]">
                      Quantity: {order.quantityLabel}
                    </p>
                    <p className="text-sm text-[#4a5b75]">
                      Total amount: {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-sm text-[#8b95a5]">
                      Created: {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <span className="rounded-full border border-[#d7dee8] bg-white px-3 py-1 text-xs text-[#4a5b75]">
                      {order.receiptFilePath ? "Receipt uploaded" : "Receipt pending"}
                    </span>
                    <Link
                      href={`/buyer/purchase-orders/${order.poId}`}
                      className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-white"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
