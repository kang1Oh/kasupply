import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierRfqEngagementDetail } from "../data";
import { declineEngagement, submitFinalQuotation } from "../actions";
import { SupplierQuotationForm } from "./quotation-form";
import { QuotationResponseActions } from "./quotation-response-actions";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
      <path
        d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.12c0 .48-.16.94-.46 1.31l-1.2 1.53a1 1 0 0 0 .79 1.61h10.24a1 1 0 0 0 .79-1.61l-1.2-1.53a2.1 2.1 0 0 1-.46-1.31V9A4.25 4.25 0 0 0 12 4.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 18a1.75 1.75 0 0 0 3.5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.2" cy="5.8" r="2.1" fill="#FF6A55" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
      <path
        d="M7 18.25h8.75A2.25 2.25 0 0 0 18 16V8.25A2.25 2.25 0 0 0 15.75 6H8.25A2.25 2.25 0 0 0 6 8.25V16a2.25 2.25 0 0 0 2.25 2.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.25 18.25-2.75 2V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[10px] w-[10px]" fill="none" aria-hidden="true">
      <path
        d="m7 4 5 6-5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.75v4.5l3 1.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatDateInput(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return "Not specified";
  if (quantity != null && unit) return `${quantity} ${unit}`;
  if (quantity != null) return String(quantity);
  return unit ?? "Not specified";
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "Not set";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("PHP", "₱");
}

function formatCurrencyPerUnit(value: number | null, unit: string | null) {
  if (value == null || Number.isNaN(value)) return "Not set";
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("PHP", "₱");

  return unit ? `${formatted}/${unit}` : formatted;
}

function formatNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return "Not set";
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPurchaseOrderNumber(
  poId: number | null | undefined,
  createdAt: string | null | undefined,
) {
  if (poId == null) return "PO-Not set";
  const parsed = createdAt ? new Date(createdAt) : null;
  const year =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();
  return `PO-${year}-${String(poId).padStart(4, "0")}`;
}

function getLocation(data: Awaited<ReturnType<typeof getSupplierRfqEngagementDetail>>) {
  if (!data?.buyer) return "Location not set";

  return (
    data.rfq?.delivery_location ||
    [data.buyer.businessLocation, data.buyer.city, data.buyer.province]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(", ") ||
    "Location not set"
  );
}

function getTopBadge(status: string | null) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "accepted") {
    return {
      label: "Accepted",
      className: "bg-[#DDFBEA] text-[#249A62]",
      dotClassName: "bg-[#249A62]",
    };
  }

  if (normalized === "closed") {
    return {
      label: "Closed",
      className: "bg-[#F1F3F6] text-[#4F5D73]",
      dotClassName: "bg-[#4F5D73]",
    };
  }

  if (normalized === "declined") {
    return {
      label: "Declined",
      className: "bg-[#FFF0ED] text-[#F36E56]",
      dotClassName: "bg-[#F36E56]",
    };
  }

  if (normalized === "quoted" || normalized === "responded" || normalized === "negotiating") {
    return {
      label: "Responded",
      className: "bg-[#E4EEFF] text-[#3D72F6]",
      dotClassName: "bg-[#3D72F6]",
    };
  }

  return {
    label: "New Request",
    className: "bg-[#FFF1E8] text-[#FF8A39]",
    dotClassName: "bg-[#FF8A39]",
  };
}

function getProgressState(data: Awaited<ReturnType<typeof getSupplierRfqEngagementDetail>>) {
  const status = String(data?.engagement.status ?? "").toLowerCase();
  const quotationStatus = String(data?.latestQuotation?.status ?? "").toLowerCase();
  const hasPurchaseOrder = Boolean(data?.purchaseOrder?.po_id);
  const quotationSubmitted =
    Boolean(data?.latestQuotation) || ["quoted", "accepted", "closed"].includes(status);

  return {
    received: true,
    respond: ["viewing", "negotiating", "quoted", "accepted", "closed"].includes(status),
    quotationSubmitted,
    accepted: status === "accepted" || quotationStatus === "accepted",
    poReceived: hasPurchaseOrder,
  };
}

function ProgressItem({
  label,
  index,
  complete,
  current,
  tone = "default",
}: {
  label: string;
  index: number;
  complete?: boolean;
  current?: boolean;
  tone?: "default" | "closed";
}) {
  const currentClassName =
    tone === "closed"
      ? "bg-[#4F5D73] text-white"
      : "bg-[#4FA171] text-white";
  const currentTextClassName =
    tone === "closed" ? "text-[#4F5D73]" : "text-[#4FA171]";

  return (
    <div className="flex items-center gap-[8px]">
      <div
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[13px] font-normal ${
          current
            ? currentClassName
            : complete
              ? "bg-[#1E3A5F] text-white"
              : "bg-[#E5E7EB] text-[#B6BDC8]"
        }`}
      >
        {index}
      </div>
      <span
        className={`text-[15px] font-medium ${
          current
            ? currentTextClassName
            : complete
              ? "text-[#1E3A5F]"
              : "text-[#C0C5CE]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  headerRight,
  children,
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[#E5EBF3] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-[12px] border-b border-[#EDF1F6] px-[20px] py-[14px]">
        <h2 className="text-[14px] font-[600] uppercase tracking-[0.02em] text-[#223654]">
          {title}
        </h2>
        {headerRight ? headerRight : null}
      </div>
      <div className="px-[20px] py-[18px]">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
        {label}
      </p>
      <div className="mt-[4px] text-[14px] font-normal leading-[1.45] text-[#334155]">
        {value}
      </div>
    </div>
  );
}

export default async function SupplierRfqQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ engagement_id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const engagementId = Number(resolvedParams.engagement_id);

  if (!engagementId || Number.isNaN(engagementId)) {
    notFound();
  }

  const data = await getSupplierRfqEngagementDetail(engagementId);

  if (!data || !data.rfq) {
    notFound();
  }

  const progress = getProgressState(data);
  const createdDate = data.rfq.created_at ? new Date(data.rfq.created_at) : null;
  const rfqNumber = `RFQ-${createdDate?.getFullYear() ?? new Date().getFullYear()}-${String(
    data.rfq.rfq_id,
  ).padStart(3, "0")}`;
  const productTitle = data.rfq.product_name;
  const quantityLabel = formatQuantity(data.rfq.quantity, data.rfq.unit);
  const sentDate = formatDate(data.rfq.created_at);
  const preferredDelivery = formatDate(
    data.rfq.preferred_delivery_date ?? data.rfq.deadline,
  );
  const targetPrice = data.rfq.target_price_per_unit ?? null;
  const productMoq =
    typeof data.rfq.product_moq === "number" && Number.isFinite(data.rfq.product_moq)
      ? data.rfq.product_moq
      : null;
  const forcedView = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;
  const quoteSent = forcedView === "sent" || Boolean(data.latestQuotation);
  const poReceived = progress.poReceived;
  const quoteAccepted = progress.accepted && !progress.poReceived;
  const showingAgreedTerms = quoteAccepted || poReceived;
  const quoteCreatedAt = formatDate(data.latestQuotation?.created_at ?? null);
  const agreedDate = formatDate(
    data.latestQuotation?.updated_at ?? data.latestQuotation?.created_at ?? null,
  );
  const quotedTotal =
    data.latestQuotation?.price_per_unit != null && data.latestQuotation?.quantity != null
      ? data.latestQuotation.price_per_unit * data.latestQuotation.quantity
      : null;
  const buyerMessageHref = "/supplier/messages";
  const returnTo = `/supplier/rfq/${engagementId}`;
  const buyerLocation = getLocation(data);
  const poNumber = formatPurchaseOrderNumber(
    data.purchaseOrder?.po_id,
    data.purchaseOrder?.created_at,
  );
  const purchaseOrderHref = data.purchaseOrder?.po_id
    ? `/supplier/purchase-orders/${data.purchaseOrder.po_id}`
    : "/supplier/purchase-orders";
  const topBadge = poReceived ? getTopBadge("closed") : getTopBadge(data.engagement.status);
  const finalProgressLabel = poReceived ? "Closed" : "PO Received";
  const buyerInitials =
    data.buyer.businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "BY";
  const buyerSublineDisplay = [data.buyer.businessType, buyerLocation]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" | ");
  const buyerSubline = [data.buyer.businessType, buyerLocation]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");

  return (
    <div className="-m-6 min-h-screen bg-[#F7F9FC]">
      <div className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[12px] text-[#A4ACB9]">
            <span className="font-normal">KaSupply</span>
            <span className="text-[#CBD2DE]">
              <ChevronRightIcon />
            </span>
            <span>RFQs</span>
            <span className="text-[#CBD2DE]">
              <ChevronRightIcon />
            </span>
            <span className="font-semibold text-[#506073]">{rfqNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#E6ECF3] bg-[#FBFCFE] text-[#B1B8C5]"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#E6ECF3] bg-[#FBFCFE] text-[#B1B8C5]"
              aria-label="Messages"
            >
              <MessageIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="px-[20px] py-[18px]">
        <section>
          <div className="flex flex-col gap-[8px] px-[6px] py-[4px] lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[18px] font-semibold text-[#223654]">
                {productTitle} — {quantityLabel}
              </h1>
              <p className="mt-[4px] text-[15px] text-[#A0A9B8]">
                {rfqNumber} · Sent {sentDate}
              </p>
            </div>

            <span
              className={`inline-flex h-[30px] items-center gap-[8px] rounded-full px-[14px] text-[11px] font-semibold ${topBadge.className}`}
            >
              <span className={`h-[6px] w-[6px] rounded-full ${topBadge.dotClassName}`} />
              {topBadge.label}
            </span>
          </div>

          <div className="mt-[10px] px-[6px] pt-[12px]">
            <div className="flex items-center gap-[10px] overflow-x-auto pb-[2px]">
              <ProgressItem label="Received" index={1} complete />
              <div
                className={`h-[2px] min-w-[78px] flex-1 rounded-full ${
                  progress.accepted || progress.poReceived
                    ? "bg-[#1E3A5F]"
                    : progress.quotationSubmitted
                      ? "bg-[#1E3A5F]"
                      : progress.respond
                        ? "bg-[#4FA171]"
                      : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem
                label="Respond"
                index={2}
                current={
                  progress.respond &&
                  !progress.quotationSubmitted &&
                  !progress.accepted &&
                  !progress.poReceived
                }
                complete={
                  progress.quotationSubmitted || progress.accepted || progress.poReceived
                }
              />
              <div
                className={`h-[2px] min-w-[78px] flex-1 rounded-full ${
                  progress.accepted || progress.poReceived ? "bg-[#1E3A5F]" : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem
                label="Accepted"
                index={3}
                complete={progress.accepted || progress.poReceived}
              />
              <div
                className={`h-[2px] min-w-[78px] flex-1 rounded-full ${
                  progress.poReceived
                    ? "bg-[#4F5D73]"
                    : progress.accepted
                      ? "bg-[#4FA171]"
                      : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem
                label={finalProgressLabel}
                index={4}
                current={progress.accepted || progress.poReceived}
                tone={poReceived ? "closed" : "default"}
              />
            </div>
          </div>
        </section>

        <div className="mt-[14px] space-y-[16px]">
          <SectionCard title="Buyer Info">
            <div className="flex items-start gap-[14px]">
              <div className="mt-[2px] flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#EDF9F1] text-[18px] font-medium text-[#2E8B57]">
                {buyerInitials}
              </div>

              <div className="min-w-0 pt-[1px]">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="text-[15px] font-semibold text-[#223654]">
                    {data.buyer.businessName}
                  </p>
                  <span className="inline-flex h-[22px] items-center rounded-[6px] border border-[#B8E0C7] bg-[#F4FCF7] px-[8px] text-[10px] font-semibold text-[#2F8C57]">
                    Verified
                  </span>
                </div>
                <p className="mt-[2px] text-[14px] text-[#8E99AB]">
                  {buyerSublineDisplay || buyerSubline || "Buyer profile details not available"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="RFQ Details">
            <div className="grid gap-x-[22px] gap-y-[16px] md:grid-cols-2 xl:grid-cols-3">
              <DetailItem label="Product" value={productTitle} />
              <DetailItem label="Quantity" value={quantityLabel} />
              <DetailItem
                label="Target Price"
                value={formatCurrencyPerUnit(targetPrice, data.rfq.unit)}
              />
              <DetailItem label="Preferred Delivery" value={preferredDelivery} />
              <DetailItem label="Delivery Location" value={buyerLocation} />
              <DetailItem
                label="Notes"
                value={data.rfq.specifications?.trim() || "No additional notes provided."}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={
              showingAgreedTerms ? "Agreed Terms" : quoteSent ? "Your Quote Sent" : "Your Quotation"
            }
            headerRight={
              showingAgreedTerms ? (
                <span className="text-[14px] font-normal text-[#A0A9B8]">
                  Agreed on {agreedDate}
                </span>
              ) : null
            }
          >
            {poReceived ? (
              <>
                <div className="grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {productMoq != null
                        ? `${formatNumber(productMoq)}${data.rfq.unit ? ` ${data.rfq.unit}` : ""}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-[14px] rounded-[12px] border border-[#84D1A0] bg-[#FDFFFE] px-[14px] py-[12px]">
                  <div className="flex items-start gap-[12px]">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#267C49] text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="block h-[31px] w-[31px]"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="m7.5 12.5 3 3 6-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#267C49]">
                        Purchase Order {poNumber} received
                      </p>
                      <p className="mt-[2px] text-[12px] leading-[1.45] text-[#7C8B9F]">
                        {data.buyer.businessName} has sent a Purchase Order. Go to Purchase Orders
                        to confirm and start fulfilling.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
                  <Link
                    href={purchaseOrderHref}
                    className="inline-flex h-[44px] min-w-[220px] flex-1 items-center justify-center rounded-[10px] bg-[#233F68] px-[18px] text-[13px] font-medium text-white"
                  >
                    View Purchase Order
                  </Link>
                </div>
              </>
            ) : quoteAccepted ? (
              <>
                <div className="mt-[10px] rounded-[12px] border border-[#84D1A0] bg-[#FDFFFE] px-[18px] py-[16px]">
                  <div className="flex items-center gap-[12px]">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#267C49] text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="block h-[31px] w-[31px]"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="m7.5 12.5 3 3 6-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#267C49]">
                        Buyer accepted your quotation
                      </p>
                      <p className="mt-[2px] text-[13px] leading-[1.45] text-[#7C8B9F]">
                        Both parties agreed on {agreedDate}. Awaiting Purchase Order from{" "}
                        {data.buyer.businessName}. You&apos;ll be notified once the Purchase Order
                        form is sent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[14px] grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#F8F8F8] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#F8F8F8] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#F8F8F8] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#F8F8F8] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[15px] font-normal text-[#223654]">
                      {productMoq != null
                        ? `${formatNumber(productMoq)}${data.rfq.unit ? ` ${data.rfq.unit}` : ""}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-[18px] flex flex-wrap items-center gap-[10px]">
                  <Link
                    href="/supplier/rfq"
                    className="inline-flex h-[44px] min-w-[220px] flex-1 items-center justify-center rounded-[10px] border border-[#D8E0EC] bg-white px-[18px] text-[13px] font-medium text-[#66758A]"
                  >
                    Back to RFQs
                  </Link>
                </div>
              </>
            ) : quoteSent ? (
              <>
                <div className="rounded-[12px] border border-[#BCD2FF] bg-[#FDFFFE] px-[14px] py-[12px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#2D6BFF] text-white">
                      <ClockIcon />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#2D6BFF]">
                        Waiting for buyer&apos;s response
                      </p>
                      <p className="mt-[2px] text-[12px] leading-[1.45] text-[#96A2B5]">
                        Your quotation was sent on {quoteCreatedAt}. {data.buyer.businessName} is
                        reviewing it and will respond shortly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[14px] grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[13px] font-normal text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[13px] font-normal text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[13px] font-normal text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#1A6B3C]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[13px] font-normal text-[#223654]">
                      {productMoq != null
                        ? `${formatNumber(productMoq)}${data.rfq.unit ? ` ${data.rfq.unit}` : ""}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-[12px] rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                    Your Note to Buyer
                  </p>
                  <p className="mt-[8px] text-[13px] leading-[1.55] text-[#4E5C72]">
                    {data.latestQuotation?.notes?.trim() || "No note provided."}
                  </p>
                </div>

                <div className="mt-[18px] flex flex-wrap items-center gap-[6px] sm:flex-nowrap">
                  <Link
                    href={buyerMessageHref}
                    className="inline-flex h-[36px] flex-1 items-center justify-center rounded-[8px] bg-[#356FEA] px-[20px] text-[14px] font-medium text-white"
                  >
                    Message Buyer
                  </Link>
                  <Link
                    href="/supplier/rfq"
                    className="inline-flex h-[36px] flex-1 items-center justify-center rounded-[8px] border border-[#BFCBDA] bg-white px-[18px] text-[14px] font-medium text-[#A0A9B8]"
                  >
                    Go back to RFQs
                  </Link>
                </div>
              </>
            ) : (
              <>
                <SupplierQuotationForm
                  engagementId={engagementId}
                  returnTo={returnTo}
                  quantity={data.rfq.quantity}
                  validUntil={formatDateInput(data.rfq.deadline)}
                  rfqDeadline={formatDateInput(data.rfq.deadline)}
                  defaultPricePerUnit={targetPrice ?? null}
                  defaultLeadTime={data.rfq.product_lead_time ?? ""}
                  defaultMoq={productMoq ?? data.rfq.quantity ?? null}
                  defaultNotes=""
                  submitAction={submitFinalQuotation}
                />

                <QuotationResponseActions
                  engagementId={engagementId}
                  returnTo="/supplier/rfq"
                  declineAction={declineEngagement}
                />
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
