import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierPurchaseOrderDetail } from "../data";
import {
  reviewPurchaseOrderReceipt,
  updatePurchaseOrderDeliveryFee,
  updatePurchaseOrderStatus,
} from "../actions";

function formatCurrency(value: number | null) {
  if (value === null) return "Not available";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function toTitleCase(value: string | null) {
  return String(value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "processing":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "shipped":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "cancelled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getReceiptStatusBadgeClasses(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "pending_review":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[180px_1fr]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function StatusTracker({ status }: { status: string }) {
  const steps = ["confirmed", "processing", "shipped", "completed"];
  const activeIndex = steps.indexOf(status);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isComplete = activeIndex >= index;
        const isCurrent = status === step;

        return (
          <div
            key={step}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              isComplete
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                isComplete
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-slate-900">{toTitleCase(step)}</p>
              <p className="text-xs text-slate-500">
                {isCurrent ? "Current order stage" : isComplete ? "Completed stage" : "Upcoming stage"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusActions({
  poId,
  status,
  receiptStatus,
}: {
  poId: number;
  status: string;
  receiptStatus: string;
}) {
  const actions = [
    {
      status: "processing",
      label: "Mark as Processing",
      showWhen: ["confirmed"],
    },
    {
      status: "shipped",
      label: "Mark as Shipped",
      showWhen: ["processing"],
    },
    {
      status: "completed",
      label:
        receiptStatus === "approved"
          ? "Mark as Completed"
          : receiptStatus === "pending_review"
            ? "Waiting for Receipt Approval"
            : receiptStatus === "rejected"
              ? "Waiting for Corrected Receipt"
              : "Waiting for Buyer Receipt",
      showWhen: ["shipped"],
      disabled: receiptStatus !== "approved",
    },
  ].filter((action) => action.showWhen.includes(status));

  if (actions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        No further supplier status actions are available for this order.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {actions.map((action) => (
        <form action={updatePurchaseOrderStatus} key={action.status}>
          <input type="hidden" name="po_id" value={poId} />
          <input type="hidden" name="next_status" value={action.status} />
          <button
            type="submit"
            disabled={Boolean(action.disabled)}
            className="w-full rounded-2xl bg-[#243f68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e3658] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}

function isImageFile(url: string | null) {
  if (!url) return false;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url);
}

export default async function SupplierPurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{
    po_id: string;
  }>;
}) {
  const resolvedParams = await params;
  const poId = Number(resolvedParams.po_id);

  if (!poId || Number.isNaN(poId)) {
    notFound();
  }

  const order = await getSupplierPurchaseOrderDetail(poId);

  if (!order) {
    notFound();
  }

  const messageBuyerHref = order.conversationId
    ? `/supplier/messages?conversation=${order.conversationId}`
    : `/supplier/messages?q=${encodeURIComponent(order.buyer)}`;
  const canReviewReceipt =
    order.status === "shipped" &&
    Boolean(order.receiptFilePath) &&
    !["approved"].includes(order.receiptStatus);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Purchase Order
          </h1>
          <p className="mt-2 text-sm text-slate-500">{order.poNumber}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={messageBuyerHref}
            className="rounded-2xl bg-[#243f68] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3658]"
          >
            Message Buyer
          </Link>
          <Link
            href="/supplier/purchase-orders"
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Buyer
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {order.buyerInfo?.businessName ?? order.buyer}
            </h2>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p>Contact: {order.buyerInfo?.contactName ?? "Not available"}</p>
              <p>Phone: {order.buyerInfo?.phone ?? "Not available"}</p>
              <p>Email: {order.buyerInfo?.email ?? "Not available"}</p>
              <p>Location: {order.buyerInfo?.location ?? "Location not available"}</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${getStatusBadgeClasses(
                order.status,
              )}`}
            >
              {toTitleCase(order.status)}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Supplier
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {order.supplierInfo?.businessName ?? "Your business"}
            </h2>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p>Contact: {order.supplierInfo?.contactName ?? "Not available"}</p>
              <p>Phone: {order.supplierInfo?.phone ?? "Not available"}</p>
              <p>Email: {order.supplierInfo?.email ?? "Not available"}</p>
              <p>Location: {order.supplierInfo?.location ?? "Location not available"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SectionCard
            title="Purchase Order Information"
            subtitle="Commercial details and sourcing references for this confirmed order."
          >
            <div className="divide-y divide-slate-100">
              <DetailRow label="PO number" value={order.poNumber} />
              <DetailRow
                label="Related RFQ / Quote"
                value={
                  <div className="space-y-1">
                    <p>{order.rfqId ? `RFQ #${order.rfqId}` : "RFQ not linked"}</p>
                    <p>{order.quoteId ? `Quote #${order.quoteId}` : "Quote not linked"}</p>
                  </div>
                }
              />
              <DetailRow label="Product" value={order.productName} />
              <DetailRow label="Specifications" value={order.specifications || "No specifications provided."} />
              <DetailRow label="Quantity" value={order.quantityLabel} />
              <DetailRow label="Agreed price per unit" value={formatCurrency(order.pricePerUnit)} />
              <DetailRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <DetailRow label="Delivery fee" value={formatCurrency(order.deliveryFee)} />
              <DetailRow label="Total amount" value={formatCurrency(order.totalAmount)} />
              <DetailRow label="Lead time" value={order.leadTime || "Not specified"} />
              <DetailRow label="Delivery location" value={order.deliveryLocation || "Not specified"} />
              <DetailRow label="Preferred delivery" value={formatDate(order.preferredDeliveryDate)} />
              <DetailRow label="Confirmed at" value={formatDate(order.orderDate)} />
              <DetailRow label="Completed at" value={formatDate(order.completedAt)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Buyer Order Inputs"
            subtitle="Buyer-entered commercial details attached to this purchase order."
          >
            <div className="divide-y divide-slate-100">
              <DetailRow label="Payment method" value={order.paymentMethod || "Not specified"} />
              <DetailRow label="Terms and conditions" value={order.termsAndConditions || "Not specified"} />
              <DetailRow label="Additional notes" value={order.additionalNotes || "Not specified"} />
              <DetailRow label="Quotation notes" value={order.quotationNotes || "Not specified"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Buyer Receipt"
            subtitle="Review the buyer receipt before allowing the order to be completed."
          >
            <div className="space-y-4">
              {order.receiptFileUrl ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {isImageFile(order.receiptFileUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.receiptFileUrl}
                      alt="Buyer receipt"
                      className="max-h-[320px] w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                      Receipt file uploaded for this order.
                    </div>
                  )}

                  <a
                    href={order.receiptFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    View Receipt
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No receipt uploaded yet.
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Receipt review status
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${getReceiptStatusBadgeClasses(
                    order.receiptStatus,
                  )}`}
                >
                  {toTitleCase(order.receiptStatus)}
                </span>

                {order.receiptReviewNotes ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Review notes: {order.receiptReviewNotes}
                  </p>
                ) : null}
              </div>

              {canReviewReceipt ? (
                <form action={reviewPurchaseOrderReceipt} className="space-y-4">
                  <input type="hidden" name="po_id" value={order.poId} />
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Review notes
                    </span>
                    <textarea
                      name="review_notes"
                      rows={4}
                      defaultValue={order.receiptReviewNotes ?? ""}
                      placeholder="Add a short reason if you need the buyer to re-upload the receipt."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#243f68]"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      name="decision"
                      value="approved"
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Approve Receipt
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="rejected"
                      className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                    >
                      Reject Receipt
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status Tracker"
            subtitle="Update fulfillment as the order moves from confirmation to completion."
          >
            <StatusTracker status={order.status} />
            <div className="mt-5">
              <StatusActions
                poId={order.poId}
                status={order.status}
                receiptStatus={order.receiptStatus}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Delivery Fee"
            subtitle="Suppliers can set or revise the delivery fee while the order is still active."
          >
            <form action={updatePurchaseOrderDeliveryFee} className="space-y-4">
              <input type="hidden" name="po_id" value={order.poId} />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Delivery fee</span>
                <input
                  type="number"
                  name="delivery_fee"
                  min="0"
                  step="0.01"
                  defaultValue={order.deliveryFee ?? 0}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#243f68]"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl border border-[#243f68] px-4 py-3 text-sm font-semibold text-[#243f68] transition hover:bg-slate-50"
              >
                Save Delivery Fee
              </button>
            </form>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
