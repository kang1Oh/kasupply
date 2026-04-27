import Image from "next/image";
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

const REVIEW_PAGE_MAX_WIDTH_CLASS = "mx-auto w-full max-w-[1180px] space-y-5 pb-8";
const REVIEW_BREADCRUMB_CLASS = "flex flex-wrap items-center gap-2 text-[14px] text-[#A4ACB9]";
const REVIEW_PAGE_TITLE_CLASS = "text-[20px] font-semibold text-[#223654]";
const REVIEW_PAGE_SUBTITLE_CLASS = "text-[15px] text-[#A0A9B8]";
const REVIEW_CARD_CLASS =
  "overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]";
const REVIEW_CARD_HEADER_CLASS = "border-b border-[#E9EEF5] px-[22px] py-[14px]";
const REVIEW_CARD_TITLE_CLASS =
  "text-[17px] font-semibold uppercase tracking-[0.01em] text-[#183B6B]";
const REVIEW_CARD_BODY_CLASS = "px-[22px] py-[25px]";
const REVIEW_SUPPLIER_SUBTITLE_CLASS =
  "mt-[8px] truncate text-[14px] font-normal leading-none text-[#a7aebb]";

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
    <main className={REVIEW_PAGE_MAX_WIDTH_CLASS}>
      <section className="pb-[4px]">
        <nav className={REVIEW_BREADCRUMB_CLASS}>
          <Link
            href={`/buyer/purchase-orders/${order.poId}`}
            className="transition hover:text-[#526176]"
          >
            {referenceCode}
          </Link>
          <span>&gt;</span>
          <span className="text-[#6B7280]">Leave a Review</span>
        </nav>
      </section>

      <section className="pb-[4px]">
        <h1 className={REVIEW_PAGE_TITLE_CLASS}>Leave a Review</h1>
        <p className={REVIEW_PAGE_SUBTITLE_CLASS}>
          Share your experience with this supplier.
        </p>
      </section>

      <section className={REVIEW_CARD_CLASS}>
        <div className={REVIEW_CARD_HEADER_CLASS}>
          <h2 className={REVIEW_CARD_TITLE_CLASS}>Supplier Info</h2>
        </div>

        <div className={`${REVIEW_CARD_BODY_CLASS} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 items-center gap-[12px]">
            <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#eefaf3] text-[22px] font-medium leading-none text-[#4f9b72]">
              {getInitials(supplierName)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-[8px]">
                <p className="text-[15px] font-semibold text-[#223654]">{supplierName}</p>
                {order.supplierInfo?.verifiedBadge ? (
                  <span className="inline-flex h-[18px] items-center rounded-full border border-[#94cfaa] bg-[#f5fbf6] px-[6px] text-[10px] font-semibold leading-none text-[#4f996e]">
                    Verified
                  </span>
                ) : null}
              </div>
              <p className={REVIEW_SUPPLIER_SUBTITLE_CLASS}>
                {supplierSubtitle || "Supplier details will appear once available."}
              </p>
            </div>
          </div>

          <Link
            href={supplierProfileHref}
            className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[#e2e5ea] bg-white px-[18px] text-[13px] font-semibold text-[#5f6877] transition hover:bg-[#f8fafc]"
          >
            View Profile
          </Link>
        </div>
      </section>

      <section className={REVIEW_CARD_CLASS}>
        <div className={REVIEW_CARD_HEADER_CLASS}>
          <h2 className={REVIEW_CARD_TITLE_CLASS}>Order Summary</h2>
        </div>

        <div className={`${REVIEW_CARD_BODY_CLASS} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-[14px]">
            <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[10px] bg-[#FFE9D9]">
              <Image
                src="/icons/cardboard_box.svg"
                alt=""
                width={28}
                height={28}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[17px] font-medium leading-none text-[#1E3A5F]">
                Order #{referenceCode}
              </p>
              <p className="mt-[8px] text-[14px] font-normal leading-none text-[#8B909A]">
                Delivered {formatDate(order.completedAt)} {"\u00b7"} 1 Item {"\u00b7"} {formatCurrency(orderSummaryTotal)}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-[10px] rounded-full bg-[#DDFBEA] px-[14px] py-[8px] text-[14px] font-medium leading-none text-[#249A62]">
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
