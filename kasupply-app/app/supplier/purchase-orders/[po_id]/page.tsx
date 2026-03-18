import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierPurchaseOrderDetail } from "../data";
import { updatePurchaseOrderStatus } from "../actions";

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
  return String(value ?? "pending")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "in_transit":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "delivered":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "paid":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "cancelled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
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

function StatusTracker({
  status,
}: {
  status: string;
}) {
  const steps = ["pending", "in_transit", "delivered", "paid", "completed"];
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
}: {
  poId: number;
  status: string;
}) {
  const actions = [
    { status: "in_transit", label: "Mark as In Transit", showWhen: ["pending"] },
    { status: "delivered", label: "Mark as Delivered", showWhen: ["in_transit"] },
    { status: "paid", label: "Mark as Paid", showWhen: ["delivered"] },
    { status: "completed", label: "Mark as Completed", showWhen: ["paid"] },
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
            className="w-full rounded-2xl bg-[#243f68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e3658]"
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
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url);
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
                    <p>{order.rfqId ? `RFQ-${order.rfqId}` : "RFQ not linked"}</p>
                    <p>{order.quoteId ? `Quote #${order.quoteId}` : "Quote not linked"}</p>
                  </div>
                }
              />
              <DetailRow label="Product" value={order.product} />
              <DetailRow label="Quantity" value={order.quantity} />
              <DetailRow
                label="Agreed price per unit"
                value={formatCurrency(order.pricePerUnit)}
              />
              <DetailRow label="Total amount" value={formatCurrency(order.totalAmount)} />
              <DetailRow label="Ordered at" value={formatDate(order.orderDate)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Buyer Proof of Payment"
            subtitle="Payment receipt, reference number, and payment date if the buyer has already uploaded them."
          >
            <div className="space-y-4">
              {order.paymentProof ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {isImageFile(order.paymentProof) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.paymentProof}
                      alt="Buyer proof of payment"
                      className="max-h-[320px] w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                      Payment proof file uploaded for this order.
                    </div>
                  )}

                  <a
                    href={order.paymentProof}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    View Proof of Payment
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No proof of payment uploaded yet.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Payment reference
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {order.paymentReference ?? "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Payment date
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(order.paymentDate)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status Tracker"
            subtitle="Update the supplier-side order progress as delivery and payment move forward."
          >
            <StatusTracker status={order.status} />
            <div className="mt-5">
              <StatusActions poId={order.poId} status={order.status} />
            </div>
          </SectionCard>

          <SectionCard
            title="Supplier Invoice"
            subtitle="Invoice details are currently stored inside the purchase order record for this capstone flow."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Invoice number
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {order.invoiceNumber ?? "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Invoice issued at
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(order.invoiceIssueDate)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Invoice status
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {order.invoiceStatus ? toTitleCase(order.invoiceStatus) : "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Invoice amount
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatCurrency(order.invoiceAmount)}
                  </p>
                </div>
              </div>

              {order.invoiceFile ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    An invoice file is already attached to this purchase order.
                  </p>
                  <a
                    href={order.invoiceFile}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-2xl border border-[#243f68] px-4 py-2 text-sm font-semibold text-[#243f68] transition hover:bg-white"
                  >
                    View Invoice
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    No invoice file has been attached yet. You can store invoice metadata directly in
                    `purchase_orders` for now.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-4 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-400"
                  >
                    Generate / Upload Invoice
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
