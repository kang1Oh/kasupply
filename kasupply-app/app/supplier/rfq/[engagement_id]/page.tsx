import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierRfqEngagementDetail } from "../data";
import { declineEngagement, submitFinalQuotation } from "../actions";
import { SupplierQuotationForm } from "./quotation-form";

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
      className: "bg-[#ECF8F1] text-[#2A8A57]",
    };
  }

  if (normalized === "closed") {
    return {
      label: "Closed",
      className: "bg-[#EEF1F5] text-[#8793A7]",
    };
  }

  if (normalized === "declined") {
    return {
      label: "Declined",
      className: "bg-[#FFF0ED] text-[#F36E56]",
    };
  }

  if (normalized === "quoted" || normalized === "responded" || normalized === "negotiating") {
    return {
      label: "Responded",
      className: "bg-[#EEF4FF] text-[#3D7BFF]",
    };
  }

  return {
    label: "New Request",
    className: "bg-[#FFF1E8] text-[#FF8A39]",
  };
}

function getProgressState(data: Awaited<ReturnType<typeof getSupplierRfqEngagementDetail>>) {
  const status = String(data?.engagement.status ?? "").toLowerCase();
  const quotationStatus = String(data?.latestQuotation?.status ?? "").toLowerCase();
  const hasPurchaseOrder = Boolean(data?.purchaseOrder?.po_id);
  const poReceived = hasPurchaseOrder;

  return {
    received: true,
    respond: ["viewing", "negotiating", "quoted", "accepted", "closed"].includes(status),
    accepted: status === "accepted" || quotationStatus === "accepted",
    poReceived,
  };
}

function ProgressItem({
  label,
  index,
  complete,
  current,
}: {
  label: string;
  index: number;
  complete?: boolean;
  current?: boolean;
}) {
  return (
    <div className="flex items-center gap-[8px]">
      <div
        className={`flex h-[20px] w-[20px] items-center justify-center rounded-full text-[10px] font-semibold ${
          current
            ? "bg-[#4AA264] text-white"
            : complete
              ? "bg-[#233F68] text-white"
              : "bg-[#E5E7EB] text-[#B6BDC8]"
        }`}
      >
        {index}
      </div>
      <span
        className={`text-[12px] font-medium ${
          current
            ? "text-[#4AA264]"
            : complete
              ? "text-[#233F68]"
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[#E5EBF3] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <div className="border-b border-[#EDF1F6] px-[20px] py-[14px]">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.02em] text-[#223654]">
          {title}
        </h2>
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
      <div className="mt-[4px] text-[14px] font-medium leading-[1.45] text-[#334155]">
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
  const topBadge = poReceived
    ? {
        label: "Closed",
        className: "bg-[#EEF1F5] text-[#8793A7]",
      }
    : getTopBadge(data.engagement.status);
  const buyerInitials =
    data.buyer.businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "BY";
  const buyerSubline = [data.buyer.businessType, buyerLocation]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");

  return (
    <div className="-m-6 min-h-screen bg-[#F7F9FC]">
      <div className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[12px] text-[#A4ACB9]">
            <span>KaSupply</span>
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
        <section className="rounded-[18px] border border-[#E5EBF3] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-[12px] border-b border-[#EDF1F6] px-[20px] py-[16px] lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[16px] font-semibold text-[#223654]">
                {productTitle} — {quantityLabel}
              </h1>
              <p className="mt-[4px] text-[12px] text-[#A0A9B8]">
                {rfqNumber} · Sent {sentDate}
              </p>
            </div>

            <span
              className={`inline-flex h-[28px] items-center rounded-full px-[12px] text-[11px] font-semibold ${topBadge.className}`}
            >
              {topBadge.label}
            </span>
          </div>

          <div className="px-[20px] py-[14px]">
            <div className="flex items-center gap-[10px] overflow-x-auto">
              <ProgressItem label="Received" index={1} complete />
              <div
                className={`h-px min-w-[78px] flex-1 ${
                  progress.respond ? "bg-[#7DC890]" : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem
                label="Respond"
                index={2}
                current={progress.respond && !progress.accepted}
                complete={progress.accepted || progress.poReceived}
              />
              <div
                className={`h-px min-w-[78px] flex-1 ${
                  progress.accepted ? "bg-[#7DC890]" : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem
                label="Accepted"
                index={3}
                current={progress.accepted && !progress.poReceived}
                complete={progress.poReceived}
              />
              <div
                className={`h-px min-w-[78px] flex-1 ${
                  progress.poReceived ? "bg-[#7DC890]" : "bg-[#E5E7EB]"
                }`}
              />
              <ProgressItem label="PO Received" index={4} current={progress.poReceived} />
            </div>
          </div>
        </section>

        <div className="mt-[16px] space-y-[16px]">
          <SectionCard title="Buyer Info">
            <div className="flex items-center gap-[14px]">
              <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#EDF9F1] text-[18px] font-medium text-[#2E8B57]">
                {buyerInitials}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="text-[14px] font-semibold text-[#223654]">
                    {data.buyer.businessName}
                  </p>
                  <span className="inline-flex h-[22px] items-center rounded-full border border-[#B8E0C7] bg-[#F4FCF7] px-[8px] text-[10px] font-semibold text-[#2F8C57]">
                    Verified
                  </span>
                </div>
                <p className="mt-[3px] text-[12px] text-[#8E99AB]">
                  {buyerSubline || "Buyer profile details not available"}
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
              quoteAccepted ? "Agreed Terms" : quoteSent ? "Your Quote Sent" : "Your Quotation"
            }
          >
            {poReceived ? (
              <>
                <div className="flex items-center justify-end text-[12px] font-medium text-[#A0A9B8]">
                  Agreed on {agreedDate}
                </div>

                <div className="mt-[14px] grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#2A8A57]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#2A8A57]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#2A8A57]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#2A8A57]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {productMoq != null
                        ? `${formatNumber(productMoq)}${data.rfq.unit ? ` ${data.rfq.unit}` : ""}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-[14px] rounded-[12px] border border-[#84D1A0] bg-[#F6FFF9] px-[14px] py-[12px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#267C49] text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px]"
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
                <div className="flex items-center justify-end text-[12px] font-medium text-[#A0A9B8]">
                  Agreed on {agreedDate}
                </div>

                <div className="mt-[10px] rounded-[12px] border border-[#84D1A0] bg-[#F6FFF9] px-[14px] py-[12px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#267C49] text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px]"
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
                        Buyer accepted your quotation
                      </p>
                      <p className="mt-[2px] text-[12px] leading-[1.45] text-[#7C8B9F]">
                        Both parties agreed on {agreedDate}. Awaiting Purchase Order from{" "}
                        {data.buyer.businessName}. You&apos;ll be notified once the Purchase Order
                        form is sent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[14px] grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
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
                <div className="rounded-[12px] border border-[#BCD2FF] bg-[#F7FAFF] px-[14px] py-[12px]">
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Quoted Price
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrencyPerUnit(
                        data.latestQuotation?.price_per_unit ?? null,
                        data.rfq.unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Total Amount
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {formatCurrency(quotedTotal)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Lead Time
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {data.latestQuotation?.lead_time || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                      Minimum Order Qty.
                    </p>
                    <p className="mt-[8px] text-[15px] font-semibold text-[#223654]">
                      {productMoq != null
                        ? `${formatNumber(productMoq)}${data.rfq.unit ? ` ${data.rfq.unit}` : ""}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-[12px] rounded-[12px] border border-[#E5EBF3] bg-[#FBFCFE] px-[14px] py-[12px]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#A0A9B8]">
                    Your Note to Buyer
                  </p>
                  <p className="mt-[8px] text-[13px] leading-[1.55] text-[#4E5C72]">
                    {data.latestQuotation?.notes?.trim() || "No note provided."}
                  </p>
                </div>

                <div className="mt-[18px] flex flex-wrap items-center gap-[10px]">
                  <Link
                    href={buyerMessageHref}
                    className="inline-flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#2D6BFF] px-[20px] text-[13px] font-semibold text-white sm:min-w-[260px]"
                  >
                    Message Buyer
                  </Link>
                  <Link
                    href="/supplier/rfq"
                    className="inline-flex h-[44px] min-w-[182px] items-center justify-center rounded-[10px] border border-[#D8E0EC] bg-white px-[18px] text-[13px] font-medium text-[#97A3B5]"
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
                  defaultLeadTime=""
                  defaultMoq={productMoq ?? data.rfq.quantity ?? null}
                  defaultNotes=""
                  submitAction={submitFinalQuotation}
                />

                <div className="mt-[18px] flex flex-wrap items-center gap-[10px]">
                  <button
                    type="submit"
                    form="quotation-form"
                    className="inline-flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#233F68] px-[20px] text-[13px] font-semibold text-white sm:min-w-[260px]"
                  >
                    Submit Quotation
                  </button>

                  <form action={declineEngagement}>
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="return_to" value="/supplier/rfq" />
                    <button
                      type="submit"
                      className="inline-flex h-[44px] min-w-[122px] items-center justify-center rounded-[10px] border border-[#FF6C57] bg-white px-[18px] text-[13px] font-medium text-[#FF5A44]"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
