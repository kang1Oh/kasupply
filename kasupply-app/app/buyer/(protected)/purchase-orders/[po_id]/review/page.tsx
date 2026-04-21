import Link from "next/link";
import { notFound } from "next/navigation";
import { submitPurchaseOrderReview } from "../../actions";
import { getBuyerPurchaseOrderReviewDraft } from "../../data";
import { ReviewPageClient } from "./review-page-client";

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

function formatBusinessType(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split(/[_\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function ReviewErrorNotice({ message }: { message: string }) {
  return (
    <section className="rounded-[18px] border border-[#ffb8b1] bg-[#fff5f4] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#ff3b30] text-white">
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path
              d="M10 6.25v4.75m0 2.75h.01M17.5 10A7.5 7.5 0 1 1 2.5 10a7.5 7.5 0 0 1 15 0Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#da3b2f]">
            Unable to submit review
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-[#8c97a7]">
            {message}
          </p>
        </div>
      </div>
    </section>
  );
}

type ReviewPageProps = {
  params: Promise<{
    po_id: string;
  }>;
  searchParams?: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function BuyerPurchaseOrderReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const poId = Number(resolvedParams.po_id);

  if (!poId || Number.isNaN(poId)) {
    notFound();
  }

  const draft = await getBuyerPurchaseOrderReviewDraft(poId);

  if (!draft) {
    notFound();
  }

  const { order, existingReview } = draft;

  if (order.status !== "completed" || !order.receiptFilePath) {
    notFound();
  }

  const referenceCode = getPurchaseOrderCode(order.poId, order.createdAt);
  const supplierName = order.supplierInfo?.businessName ?? "Unknown supplier";
  const cancelHref = `/buyer/purchase-orders/${order.poId}`;
  const supplierProfileHref = order.supplierId
    ? `/buyer/search/${order.supplierId}`
    : `/buyer/purchase-orders/${order.poId}`;
  const ordersHref = "/buyer/purchase-orders";
  const reviewPageHref = `/buyer/purchase-orders/${order.poId}/review`;
  const supplierSubtitle = [
    formatBusinessType(order.supplierInfo?.businessType ?? null),
    order.supplierInfo?.location ?? null,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  const orderSummaryTotal =
    order.totalAmount ??
    ((order.subtotal ?? 0) + (order.deliveryFee ?? 0) > 0
      ? (order.subtotal ?? 0) + (order.deliveryFee ?? 0)
      : null);
  const showSubmittedModal = resolvedSearchParams.submitted === "1";
  const reviewError = String(resolvedSearchParams.error || "").trim();

  return (
    <main className="mx-auto w-full max-w-[1042px] space-y-[10px] pb-8">
      <section className="pb-[4px]">
        <nav className="flex items-center gap-[7px] text-[11px] font-medium text-[#bcc2cb]">
          <Link
            href={`/buyer/purchase-orders/${order.poId}`}
            className="transition hover:text-[#7f8a99]"
          >
            {referenceCode}
          </Link>
          <span>&gt;</span>
          <span>Leave a Review</span>
        </nav>
      </section>

      <section className="pb-[8px]">
        <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-[#455060]">
          Leave a Review
        </h1>
        <p className="mt-[5px] text-[14px] font-normal leading-none text-[#c1c6cf]">
          Share your experience with this supplier.
        </p>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className="border-b border-[#f0f2f5] px-[16px] py-[12px]">
          <h2 className="text-[12px] font-semibold uppercase leading-none text-[#27456f]">
            Supplier Info
          </h2>
        </div>

        <div className="flex items-center justify-between gap-4 px-[18px] py-[16px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#eefaf3] text-[22px] font-medium leading-none text-[#4f9b72]">
              {getInitials(supplierName)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-[6px]">
                <p className="truncate text-[14px] font-semibold leading-none text-[#5d6778]">
                  {supplierName}
                </p>
                {order.supplierInfo?.verifiedBadge ? (
                  <span className="inline-flex h-[18px] items-center rounded-full border border-[#94cfaa] bg-[#f5fbf6] px-[6px] text-[10px] font-semibold leading-none text-[#4f996e]">
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-[6px] truncate text-[13px] font-normal leading-none text-[#a7aebb]">
                {supplierSubtitle || "Supplier details will appear once available."}
              </p>
            </div>
          </div>

          <Link
            href={supplierProfileHref}
            className="inline-flex h-[28px] shrink-0 items-center justify-center rounded-[8px] border border-[#e2e5ea] bg-white px-[14px] text-[11px] font-semibold text-[#5f6877] transition hover:bg-[#f8fafc]"
          >
            View Profile
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className="border-b border-[#f0f2f5] px-[16px] py-[12px]">
          <h2 className="text-[12px] font-semibold uppercase leading-none text-[#27456f]">
            Order Summary
          </h2>
        </div>

        <div className="flex items-center justify-between gap-4 px-[18px] py-[16px]">
          <div className="flex min-w-0 items-center gap-[14px]">
            <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#fff2e7] text-[#f08b38]">
              <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" aria-hidden="true">
                <path
                  d="M7.75 5.75h11.5v12.5H7.75a2 2 0 0 1-2-2V7.75a2 2 0 0 1 2-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.75 9.25h6.5M9.75 12h4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="m16.25 5.75 2-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-none text-[#27456f]">
                Order #{referenceCode}
              </p>
              <p className="mt-[8px] text-[13px] leading-none text-[#a7aebb]">
                Delivered {formatDate(order.completedAt)} {"\u00b7"} 1 Item {"\u00b7"} {formatCurrency(orderSummaryTotal)}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7f0dd] bg-[#edf8ef] px-[11px] py-[5px] text-[12px] font-medium leading-none text-[#2f7a45]">
            <svg viewBox="0 0 16 16" className="h-[12px] w-[12px]" aria-hidden="true">
              <path
                d="M3.5 8.1 6.4 11l6.1-6.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delivered
          </span>
        </div>
      </section>

      {reviewError ? <ReviewErrorNotice message={reviewError} /> : null}

      <ReviewPageClient
        poId={order.poId}
        cancelHref={cancelHref}
        supplierProfileHref={supplierProfileHref}
        ordersHref={ordersHref}
        reviewPageHref={reviewPageHref}
        showSubmittedModal={showSubmittedModal}
        submitAction={submitPurchaseOrderReview}
        defaultValues={{
          overallRating: existingReview?.overallRating ?? null,
          productQualityRating: existingReview?.productQualityRating ?? null,
          deliveryRating: existingReview?.deliveryRating ?? null,
          communicationRating: existingReview?.communicationRating ?? null,
          valueForMoneyRating: existingReview?.valueForMoneyRating ?? null,
          reviewText: existingReview?.reviewText ?? null,
        }}
      />
    </main>
  );
}
