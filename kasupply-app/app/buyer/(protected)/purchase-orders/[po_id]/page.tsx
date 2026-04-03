import Link from "next/link";
import { notFound } from "next/navigation";
import { ModalShell } from "@/components/modals";
import { cancelPurchaseOrder, uploadPurchaseOrderReceipt } from "../actions";
import { getBuyerPurchaseOrderDetail } from "../data";
import { ReceiptUploadWidget } from "./receipt-upload-widget";

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Not available";

  const hasDecimals = !Number.isInteger(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

function formatStepTimestamp(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function toTitleCase(value: string | null) {
  return String(value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(value: string | null | undefined) {
  const initials = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "PO";
}

function getPurchaseOrderCode(poId: number, createdAt: string | null) {
  if (!createdAt) {
    return `PO-${String(poId).padStart(4, "0")}`;
  }

  const parsed = new Date(createdAt);
  const year = Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();

  return `PO-${year}-${String(poId).padStart(4, "0")}`;
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-[#ffe2cc] bg-[#fff2e7] text-[#f08b38]";
    case "processing":
      return "border-[#ffe2cc] bg-[#fff2e7] text-[#f08b38]";
    case "shipped":
      return "border-[#ead7fb] bg-[#f7efff] text-[#a15bd3]";
    case "completed":
      return "border-[#d7f0dd] bg-[#edf8ef] text-[#2f7a45]";
    case "cancelled":
      return "border-[#ffd9d6] bg-[#fff1f0] text-[#e05547]";
    default:
      return "border-[#dde3eb] bg-[#f8fafc] text-[#526176]";
  }
}

function getFileName(path: string | null) {
  if (!path) return "receipt";
  return path.split("/").pop() || "receipt";
}

function buildDetailHref(
  poId: number,
  params: Record<string, string | null | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/buyer/purchase-orders/${poId}?${query}` : `/buyer/purchase-orders/${poId}`;
}

function isImageFile(url: string | null) {
  if (!url) return false;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#e8edf5] bg-white px-4 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#3b5a83]">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c0c8d4]">
        {label}
      </p>
      <div className="mt-1.5 text-[16px] font-semibold leading-tight text-[#223654]">
        {value}
      </div>
    </div>
  );
}

function StatusStepper({
  status,
  timeline,
}: {
  status: string;
  timeline: Record<string, string | null>;
}) {
  const steps = [
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "completed", label: "Completed" },
  ];
  const safeStatus = status === "cancelled" ? "confirmed" : status;
  const activeIndex = steps.findIndex((step) => step.key === safeStatus);

  return (
    <section className="rounded-[22px] border border-[#e8edf5] bg-white px-4 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-5">
      <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isComplete = activeIndex > index;
          const isCurrent = activeIndex === index;
          const isFuture = activeIndex < index;
          const circleClassName = isCurrent
            ? "border-[#3f73e0] bg-[#3f73e0] text-white"
            : isComplete
              ? "border-[#223f68] bg-[#223f68] text-white"
              : "border-[#b9c2d0] bg-white text-[#9ca7b6]";
          const connectorClassName = activeIndex > index
            ? "bg-[#223f68]"
            : activeIndex === index
              ? "bg-[linear-gradient(90deg,#223f68_0%,#cfd7e4_100%)]"
              : "bg-[#cfd7e4]";

          return (
            <div key={step.key} className="flex min-w-[144px] flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold transition ${circleClassName}`}
                >
                  {isComplete ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="m5.5 10 2.5 2.5 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <p
                  className={`mt-3 text-[12px] font-semibold uppercase tracking-[0.04em] ${
                    isFuture ? "text-[#9ca7b6]" : "text-[#223654]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-[11px] text-[#9ca7b6]">
                  {timeline[step.key] ? formatStepTimestamp(timeline[step.key]) : "-"}
                </p>
              </div>

              {index < steps.length - 1 ? (
                <div className="mx-3 mt-4 h-px min-w-[60px] flex-1 sm:min-w-[88px]">
                  <div className={`h-full w-full ${connectorClassName}`} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NotificationCard({
  tone,
  title,
  description,
  children,
}: {
  tone: "blue" | "orange" | "purple" | "red" | "green" | "slate";
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const toneClasses = {
    blue: {
      container: "border-[#9db8ff] bg-[#f7faff]",
      icon: "bg-[#3f73e0] text-white",
      title: "text-[#2b5bc7]",
      description: "text-[#7f90aa]",
    },
    orange: {
      container: "border-[#ffbe92] bg-[#fff8f2]",
      icon: "bg-[#ff7a1a] text-white",
      title: "text-[#f08b38]",
      description: "text-[#8c97a7]",
    },
    purple: {
      container: "border-[#d4b6fa] bg-[#fbf7ff]",
      icon: "bg-[#6f35d4] text-white",
      title: "text-[#6f35d4]",
      description: "text-[#8c97a7]",
    },
    red: {
      container: "border-[#ffb8b1] bg-[#fff5f4]",
      icon: "bg-[#ff3b30] text-white",
      title: "text-[#da3b2f]",
      description: "text-[#8c97a7]",
    },
    green: {
      container: "border-[#9fd2ae] bg-[#f4fbf5]",
      icon: "bg-[#267c46] text-white",
      title: "text-[#2f7a45]",
      description: "text-[#7f90aa]",
    },
    slate: {
      container: "border-[#d9e1ec] bg-[#fbfcfe]",
      icon: "bg-[#526176] text-white",
      title: "text-[#223654]",
      description: "text-[#8c97a7]",
    },
  }[tone];

  return (
    <section className={`rounded-[18px] border px-4 py-4 ${toneClasses.container}`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${toneClasses.icon}`}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path
              d="m5.5 10 2.5 2.5 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold ${toneClasses.title}`}>{title}</p>
          <p className={`mt-1 text-[13px] leading-5 ${toneClasses.description}`}>
            {description}
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

function ReceiptPreview({
  receiptFileUrl,
  receiptFilePath,
  description,
}: {
  receiptFileUrl: string | null;
  receiptFilePath: string | null;
  description: string;
}) {
  if (!receiptFileUrl) {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-[#e8edf5] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#223654]">Payment Receipt</p>
          <p className="mt-1 text-[13px] text-[#8c97a7]">{description}</p>
        </div>
        <a
          href={receiptFileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d9e1ec] bg-white px-4 text-[13px] font-medium text-[#526176] transition hover:border-[#c5d0df] hover:text-[#223654]"
        >
          View Receipt
        </a>
      </div>

      {isImageFile(receiptFileUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={receiptFileUrl}
          alt="Uploaded receipt"
          className="mt-4 max-h-[300px] w-full rounded-[16px] border border-[#edf1f7] object-contain"
        />
      ) : (
        <div className="mt-4 rounded-[16px] border border-dashed border-[#d7dee8] bg-[#fafbfd] px-4 py-6 text-[13px] text-[#8c97a7]">
          Attached file: {getFileName(receiptFilePath)}
        </div>
      )}
    </section>
  );
}

export default async function BuyerPurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    po_id: string;
  }>;
  searchParams?: Promise<{
    modal?: string;
    receiptError?: string;
  }>;
}) {
  const resolvedParams = await params;
  const poId = Number(resolvedParams.po_id);

  if (!poId || Number.isNaN(poId)) {
    notFound();
  }

  const order = await getBuyerPurchaseOrderDetail(poId);
  const resolvedSearchParams = (await searchParams) ?? {};
  const receiptError =
    typeof resolvedSearchParams.receiptError === "string"
      ? resolvedSearchParams.receiptError
      : null;

  if (!order) {
    notFound();
  }

  const canCancelOrder = ["confirmed", "processing"].includes(order.status);
  const messageSupplierHref = order.conversationId
    ? `/buyer/messages?conversation=${order.conversationId}`
    : "/buyer/messages";
  const supplierProfileHref = order.supplierId
    ? `/buyer/suppliers/${order.supplierId}`
    : messageSupplierHref;
  const showCancelModal = resolvedSearchParams.modal === "cancel" && canCancelOrder;
  const referenceCode = getPurchaseOrderCode(order.poId, order.createdAt);
  const placedOnDate = formatDate(order.confirmedAt ?? order.createdAt);
  const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";
  const stepTimeline = {
    confirmed: order.confirmedAt ?? order.createdAt,
    processing: order.status === "processing" ? order.updatedAt : null,
    shipped: order.status === "shipped" ? order.updatedAt : null,
    completed: order.completedAt,
  };
  const orderSummaryTotal =
    order.totalAmount ??
    ((order.subtotal ?? 0) + (order.deliveryFee ?? 0) > 0
      ? (order.subtotal ?? 0) + (order.deliveryFee ?? 0)
      : null);
  const shouldShowReceiptUpload =
    order.status === "shipped" &&
    ["not_uploaded", "rejected"].includes(order.receiptStatus);
  const shouldShowReceiptPendingReview =
    order.status === "shipped" && order.receiptStatus === "pending_review";
  const shouldShowReceiptApproved =
    order.status === "shipped" && order.receiptStatus === "approved";
  const showCompletedReceipt = order.status === "completed" && Boolean(order.receiptFileUrl);
  const notesFromBuyer = [order.additionalNotes, order.quotationNotes]
    .filter(Boolean)
    .join(" ");
  const deliveryFeeLabel =
    order.status === "confirmed" && (!order.deliveryFee || order.deliveryFee <= 0)
      ? "Not yet set"
      : formatCurrency(order.deliveryFee);

  return (
    <>
      <main className="space-y-5 pb-2">
        <nav className="flex flex-wrap items-center gap-2 text-[12px] text-[#b0bac7]">
          <Link href="/buyer/purchase-orders" className="transition hover:text-[#526176]">
            Purchase Orders
          </Link>
          <span>&gt;</span>
          <span className="text-[#98a3b4]">{referenceCode}</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[31px] font-semibold tracking-[-0.03em] text-[#223654]">
              {referenceCode}
            </h1>
            <p className="mt-1 text-[15px] text-[#8a96a8]">
              Placed on {placedOnDate} | {supplierName}
            </p>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold ${getStatusBadgeClasses(
              order.status,
            )}`}
          >
            <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-current/80" />
            {toTitleCase(order.status)}
          </span>
        </div>

        <StatusStepper status={order.status} timeline={stepTimeline} />

        <SectionCard title="Supplier Info">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#edf8ef] text-[20px] font-semibold text-[#2f7a45]">
                {getInitials(supplierName)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#223654]">
                    {supplierName}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-[#9fd2ae] bg-[#f3fbf5] px-2.5 py-1 text-[11px] font-medium text-[#2f7a45]">
                    Partner Supplier
                  </span>
                </div>

                <p className="mt-1 text-[14px] text-[#8c97a7]">
                  {order.supplierInfo?.location ?? "Location not available"}
                </p>
              </div>
            </div>

            <Link
              href={supplierProfileHref}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#d9e1ec] bg-white px-4 text-[13px] font-medium text-[#526176] transition hover:border-[#c5d0df] hover:text-[#223654]"
            >
              View Profile
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Order Summary">
          <div className="overflow-hidden rounded-[16px] border border-[#edf1f7]">
            <div className="grid grid-cols-[minmax(0,1.4fr)_0.6fr_0.7fr_0.7fr] gap-4 border-b border-[#edf1f7] bg-[#fbfcfe] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0bac7]">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1.4fr)_0.6fr_0.7fr_0.7fr] gap-4 px-4 py-4 text-[15px] text-[#223654]">
              <span className="font-semibold">{order.productName}</span>
              <span className="text-right text-[#8c97a7]">{order.quantityLabel}</span>
              <span className="text-right text-[#8c97a7]">
                {formatCurrency(order.pricePerUnit)}
              </span>
              <span className="text-right font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>

            <div className="border-t border-[#edf1f7] px-4 py-3 text-[14px]">
              <div className="flex items-center justify-between py-1 text-[#b0bac7]">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-[#b0bac7]">
                <span>Delivery Fee</span>
                <span>{deliveryFeeLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#edf1f7] pt-3 text-[16px] font-semibold text-[#223654]">
                <span>Total</span>
                <span>{formatCurrency(orderSummaryTotal)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="More Details">
          <div className="grid gap-5 md:grid-cols-2">
            <DetailMetric label="Deliver To" value={order.deliveryLocation || "Not specified"} />
            <DetailMetric
              label="Expected Delivery"
              value={formatDate(order.preferredDeliveryDate)}
            />
            <DetailMetric label="Payment Method" value={order.paymentMethod || "Not specified"} />
            <DetailMetric
              label="Payment Terms"
              value={order.termsAndConditions || "Not specified"}
            />
          </div>

          <div className="mt-5 border-t border-[#edf1f7] pt-5">
            <DetailMetric
              label="Notes From Buyer"
              value={notesFromBuyer || "No additional instructions provided."}
            />
          </div>
        </SectionCard>

        {order.status === "confirmed" ? (
          <NotificationCard
            tone="blue"
            title="Purchase order sent"
            description="The purchase order has been submitted to the supplier. Please wait for them to confirm and begin preparing your order."
          />
        ) : null}

        {order.status === "processing" ? (
          <NotificationCard
            tone="orange"
            title="Order is being processed"
            description="Your supplier is currently preparing this order. You will be notified once it has been dispatched."
          />
        ) : null}

        {receiptError ? (
          <NotificationCard
            tone="red"
            title="Receipt upload failed"
            description={receiptError}
          />
        ) : null}

        {order.status === "shipped" && order.receiptStatus === "not_uploaded" ? (
          <>
            <NotificationCard
              tone="purple"
              title="Order on its way"
              description="This order has been dispatched by the supplier. Once it is delivered and payment is completed, upload the receipt to continue the order."
            />
              <ReceiptUploadWidget
                poId={order.poId}
                mode="first_upload"
                existingReceiptFilePath={order.receiptFilePath}
                submitAction={uploadPurchaseOrderReceipt}
              />
          </>
        ) : null}

        {shouldShowReceiptPendingReview ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="Your receipt has been uploaded and is awaiting supplier verification."
            />
            <NotificationCard
              tone="slate"
              title="Receipt submitted for review"
              description="The supplier is reviewing your proof of payment. Once approved, they can mark this order as completed."
            />
          </>
        ) : null}

        {shouldShowReceiptUpload && order.receiptStatus === "rejected" ? (
          <>
            {order.receiptFileUrl ? (
              <ReceiptPreview
                receiptFileUrl={order.receiptFileUrl}
                receiptFilePath={order.receiptFilePath}
                description="Previously submitted receipt."
              />
            ) : null}
              <ReceiptUploadWidget
                poId={order.poId}
                mode="resubmit"
                reviewNotes={order.receiptReviewNotes}
                currentFileName={getFileName(order.receiptFilePath)}
                existingReceiptFilePath={order.receiptFilePath}
                submitAction={uploadPurchaseOrderReceipt}
            />
          </>
        ) : null}

        {shouldShowReceiptApproved ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="The supplier has approved your uploaded receipt."
            />
            <NotificationCard
              tone="green"
              title="Receipt approved"
              description="Your payment receipt was accepted. The supplier may now mark the order as completed."
            />
          </>
        ) : null}

        {showCompletedReceipt ? (
          <>
            <ReceiptPreview
              receiptFileUrl={order.receiptFileUrl}
              receiptFilePath={order.receiptFilePath}
              description="Receipt uploaded and accepted for this purchase order."
            />
            <NotificationCard
              tone="green"
              title="Order completed successfully"
              description={`This order was fulfilled and marked complete on ${formatDate(
                order.completedAt,
              )}. Total payment collected: ${formatCurrency(orderSummaryTotal)}.`}
            />
          </>
        ) : null}

        {order.status === "cancelled" ? (
          <NotificationCard
            tone="red"
            title="Order cancelled"
            description="This purchase order has been cancelled and is no longer active."
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={messageSupplierHref}
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d9e1ec] bg-white px-5 text-[14px] font-medium text-[#526176] transition hover:border-[#c5d0df] hover:text-[#223654]"
            >
              Message Supplier
            </Link>
            <Link
              href="/buyer/purchase-orders"
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d9e1ec] bg-white px-5 text-[14px] font-medium text-[#526176] transition hover:border-[#c5d0df] hover:text-[#223654]"
            >
              Back to Orders
            </Link>
          </div>

          {canCancelOrder ? (
            <Link
              href={buildDetailHref(order.poId, { modal: "cancel" })}
              className="inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[14px] font-semibold text-[#ff5a47] transition hover:bg-[#fff5f3]"
            >
              Cancel Order
            </Link>
          ) : null}
        </div>
      </main>

      {showCancelModal ? (
        <ModalShell
          title="Cancel this order?"
          description="The supplier will be notified and this purchase order will be voided."
          closeHref={buildDetailHref(order.poId)}
          closeLabel="Keep"
          maxWidthClassName="max-w-md"
          panelClassName="rounded-[28px] border border-[#e8edf5] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
          overlayClassName="bg-[#0f172a]/35 p-4"
        >
          <form action={cancelPurchaseOrder} className="mt-2 flex justify-end">
            <input type="hidden" name="poId" value={order.poId} />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#93a4bd] px-5 text-[14px] font-semibold text-white transition hover:bg-[#7f92ae]"
            >
              Cancel Order
            </button>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
