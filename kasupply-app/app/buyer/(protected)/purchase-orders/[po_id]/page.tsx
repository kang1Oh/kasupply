import Link from "next/link";
import { notFound } from "next/navigation";
import { uploadPurchaseOrderReceipt } from "../actions";
import { getBuyerPurchaseOrderDetail } from "../data";

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Not available";

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

function getReceiptStatusBadgeClasses(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "pending_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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
    <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#223654]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[#8b95a5]">{subtitle}</p> : null}
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
    <div className="grid gap-2 border-b border-[#edf1f7] py-3 sm:grid-cols-[180px_1fr]">
      <p className="text-sm font-medium text-[#8b95a5]">{label}</p>
      <div className="text-sm text-[#223654]">{value}</div>
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
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              isComplete
                ? "border-emerald-200 bg-emerald-50"
                : "border-[#edf1f7] bg-[#fafbfd]"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                isComplete ? "bg-emerald-600 text-white" : "bg-[#d7dee8] text-[#4a5b75]"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-[#223654]">{toTitleCase(step)}</p>
              <p className="text-xs text-[#8b95a5]">
                {isCurrent ? "Current stage" : isComplete ? "Completed stage" : "Upcoming stage"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function isImageFile(url: string | null) {
  if (!url) return false;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url);
}

export default async function BuyerPurchaseOrderDetailPage({
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

  const order = await getBuyerPurchaseOrderDetail(poId);

  if (!order) {
    notFound();
  }

  const canUploadReceipt =
    order.status === "shipped" &&
    ["not_uploaded", "rejected"].includes(order.receiptStatus);
  const messageSupplierHref = order.conversationId
    ? `/buyer/messages?conversation=${order.conversationId}`
    : "/buyer/messages";

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#223654]">{order.poNumber}</h1>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${getStatusBadgeClasses(order.status)}`}
            >
              {toTitleCase(order.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#8b95a5]">
            Purchase order for {order.productName}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={messageSupplierHref}
            className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
          >
            Message Supplier
          </Link>
          <Link
            href="/buyer/purchase-orders"
            className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Supplier</p>
            <p className="mt-2 text-base font-semibold text-[#223654]">
              {order.supplierInfo?.businessName ?? "Unknown supplier"}
            </p>
          </div>
          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Quantity</p>
            <p className="mt-2 text-base font-semibold text-[#223654]">{order.quantityLabel}</p>
          </div>
          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Total Amount</p>
            <p className="mt-2 text-base font-semibold text-[#223654]">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Receipt Review</p>
            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${getReceiptStatusBadgeClasses(
                order.receiptStatus,
              )}`}
            >
              {toTitleCase(order.receiptStatus)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SectionCard
            title="Order Details"
            subtitle="Confirmed RFQ, quotation, and buyer-entered purchase order details."
          >
            <div className="divide-y divide-[#edf1f7]">
              <DetailRow label="Product" value={order.productName} />
              <DetailRow label="Related RFQ" value={order.rfqId ? `RFQ #${order.rfqId}` : "Not linked"} />
              <DetailRow label="Quotation" value={order.quoteId ? `Quote #${order.quoteId}` : "Not linked"} />
              <DetailRow label="Specifications" value={order.specifications || "No specifications provided."} />
              <DetailRow label="Quantity" value={order.quantityLabel} />
              <DetailRow label="Agreed unit price" value={formatCurrency(order.pricePerUnit)} />
              <DetailRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <DetailRow label="Delivery fee" value={formatCurrency(order.deliveryFee)} />
              <DetailRow label="Total amount" value={formatCurrency(order.totalAmount)} />
              <DetailRow label="Lead time" value={order.leadTime || "Not specified"} />
              <DetailRow label="Delivery location" value={order.deliveryLocation || "Not specified"} />
              <DetailRow
                label="Preferred delivery"
                value={formatDate(order.preferredDeliveryDate)}
              />
              <DetailRow label="Created at" value={formatDate(order.createdAt)} />
              <DetailRow label="Confirmed at" value={formatDate(order.confirmedAt)} />
              <DetailRow label="Completed at" value={formatDate(order.completedAt)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Buyer Inputs"
            subtitle="These are the editable fields the buyer supplied when creating the purchase order."
          >
            <div className="divide-y divide-[#edf1f7]">
              <DetailRow label="Payment method" value={order.paymentMethod || "Not specified"} />
              <DetailRow
                label="Terms and conditions"
                value={order.termsAndConditions || "Not specified"}
              />
              <DetailRow label="Additional notes" value={order.additionalNotes || "Not specified"} />
              <DetailRow label="Quotation notes" value={order.quotationNotes || "Not specified"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Receipt Upload"
            subtitle="Upload your offline payment receipt after the supplier marks the order as shipped."
          >
            <div className="space-y-4">
              {order.receiptFileUrl ? (
                <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                  {isImageFile(order.receiptFileUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.receiptFileUrl}
                      alt="Receipt upload"
                      className="max-h-[320px] w-full rounded-xl object-contain"
                    />
                  ) : (
                    <p className="text-sm text-[#4a5b75]">A receipt file is already attached to this order.</p>
                  )}

                  <a
                    href={order.receiptFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-white"
                  >
                    View uploaded receipt
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#d7dee8] bg-[#fafbfd] p-5 text-sm text-[#8b95a5]">
                  No receipt uploaded yet.
                </div>
              )}

              <div className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4">
                <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Receipt review status</p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${getReceiptStatusBadgeClasses(
                    order.receiptStatus,
                  )}`}
                >
                  {toTitleCase(order.receiptStatus)}
                </span>

                {order.receiptReviewNotes ? (
                  <p className="mt-3 text-sm text-[#4a5b75]">
                    Supplier notes: {order.receiptReviewNotes}
                  </p>
                ) : null}
              </div>

              {canUploadReceipt ? (
                <form action={uploadPurchaseOrderReceipt} className="space-y-3">
                  <input type="hidden" name="poId" value={order.poId} />
                  <input
                    type="file"
                    name="receiptFile"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    required
                    className="block w-full rounded-md border border-[#d7dee8] bg-white px-3 py-3 text-sm text-[#223654]"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
                  >
                    {order.receiptStatus === "rejected" ? "Upload corrected receipt" : "Upload receipt"}
                  </button>
                </form>
              ) : order.receiptStatus === "pending_review" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Your uploaded receipt is waiting for supplier review.
                </div>
              ) : order.receiptStatus === "approved" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  Your receipt has been approved. The supplier can now complete the order.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Receipt upload will be enabled once the supplier marks the order as shipped.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status Tracker"
            subtitle="Follow the supplier fulfillment progress from confirmation through completion."
          >
            <StatusTracker status={order.status} />
            {order.status === "shipped" && order.receiptStatus === "not_uploaded" ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Uploading a receipt is required before the supplier can mark the order as completed.
              </div>
            ) : null}
            {order.status === "shipped" && order.receiptStatus === "pending_review" ? (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                Your receipt is uploaded and waiting for supplier approval.
              </div>
            ) : null}
            {order.status === "shipped" && order.receiptStatus === "rejected" ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                The supplier rejected your receipt. Upload another one to continue the order.
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Supplier Information"
            subtitle="Order fulfillment contact details for this supplier."
          >
            <div className="space-y-3 text-sm text-[#4a5b75]">
              <p>
                <span className="font-medium text-[#223654]">Business:</span>{" "}
                {order.supplierInfo?.businessName ?? "Not available"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Contact:</span>{" "}
                {order.supplierInfo?.contactName ?? "Not available"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Phone:</span>{" "}
                {order.supplierInfo?.phone ?? "Not available"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Email:</span>{" "}
                {order.supplierInfo?.email ?? "Not available"}
              </p>
              <p>
                <span className="font-medium text-[#223654]">Location:</span>{" "}
                {order.supplierInfo?.location ?? "Not available"}
              </p>
            </div>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
