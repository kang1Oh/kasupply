import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS } from "@/lib/purchase-orders/constants";
import type { PurchaseOrderCreationDraft } from "./data";
import { createPurchaseOrder } from "./actions";

const RFQ_BREADCRUMB_CLASS =
  "flex items-center gap-[7px] text-[14px] font-normal text-[#bcc2cb]";
const RFQ_TITLE_CLASS = "text-[23px] font-semibold tracking-[-0.04em] text-[#455060]";
const RFQ_META_CLASS = "mt-[3px] text-[15px] font-normal leading-none text-[#c1c6cf]";
const RFQ_CARD_SECTION_HEADING_CLASS =
  "text-[17px] font-[600] uppercase leading-none text-[#27456f]";
const RFQ_MAIN_CARD_HEADER_ROW_CLASS = "border-b border-[#f0f2f5] px-[16px] py-[17px]";
const RFQ_SUPPLIER_NAME_CLASS = "truncate text-[16px] font-[500] leading-none text-[#5d6778]";
const RFQ_SUPPLIER_SUBTITLE_CLASS =
  "mt-[6px] truncate text-[14px] font-normal leading-none text-[#a7aebb]";
const FORM_LABEL_CLASS = "text-[15px] font-medium leading-none text-[#374151]";

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";

  const hasDecimals = !Number.isInteger(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBusinessType(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split(/[_\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
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

function getReferenceCode(rfqId: number, createdAt: string | null) {
  const date = createdAt ? new Date(createdAt) : null;
  const year =
    date && !Number.isNaN(date.getTime()) ? date.getFullYear() : new Date().getFullYear();

  return `RFQ-${year}-${String(rfqId).padStart(3, "0")}`;
}

function toDateInputValue(value: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function formatDateDisplayValue(value: string | null) {
  const normalizedValue = toDateInputValue(value);

  if (!normalizedValue) return "";

  const parsed = new Date(`${normalizedValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return normalizedValue;

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatQuantity(quantity: number, unit: string | null) {
  return unit ? `${quantity} ${unit}` : String(quantity);
}

function formatUnitPrice(pricePerUnit: number, unit: string | null) {
  const formattedPrice = formatCurrency(pricePerUnit);
  return unit ? `${formattedPrice} / ${unit}` : formattedPrice;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
      <div className={RFQ_MAIN_CARD_HEADER_ROW_CLASS}>
        <h2 className={RFQ_CARD_SECTION_HEADING_CLASS}>{title}</h2>
      </div>
      <div className="px-[16px] py-[16px]">{children}</div>
    </section>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full border border-[#94cfaa] bg-[#f5fbf6] px-[6px] text-[10px] font-semibold leading-none text-[#4f996e]">
      <svg viewBox="0 0 16 16" className="h-[10px] w-[10px]" aria-hidden="true">
        <path
          d="M3.5 8.1 6.4 11l6.1-6.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className={FORM_LABEL_CLASS}>{children}</p>;
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-[44px] w-full rounded-[8px] border border-[#dce2ea] bg-white px-[14px] text-[15px] font-normal text-[#4c5767] outline-none transition placeholder:text-[#b7bec9] focus:border-[#9cadc7] ${props.className ?? ""}`}
    />
  );
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-[44px] w-full appearance-none rounded-[8px] border border-[#dce2ea] bg-white px-[14px] pr-[40px] text-[15px] font-normal text-[#4c5767] outline-none transition focus:border-[#9cadc7] ${props.className ?? ""}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-[12px] flex items-center text-[#8c97a7]">
        <svg viewBox="0 0 20 20" className="h-[16px] w-[16px]" fill="none" aria-hidden="true">
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

export function CreatePurchaseOrderPage({
  creationDraft,
}: {
  creationDraft: PurchaseOrderCreationDraft;
}) {
  const referenceCode = getReferenceCode(creationDraft.rfqId, creationDraft.rfqCreatedAt);
  const supplierName = creationDraft.supplierName;
  const supplierBusinessType = formatBusinessType(creationDraft.supplierInfo?.businessType);
  const supplierLocation = creationDraft.supplierInfo?.location ?? "Location not available";
  const supplierMeta = [supplierBusinessType, supplierLocation].filter(Boolean).join(" \u00b7 ");
  const productQuantityLabel = formatQuantity(creationDraft.quantity, creationDraft.unit);
  const defaultDeliveryDate = toDateInputValue(creationDraft.preferredDeliveryDate);
  const deliveryDateDisplayValue = formatDateDisplayValue(
    creationDraft.preferredDeliveryDate,
  );
  const defaultNotes = creationDraft.specifications ?? "";

  return (
    <main className="mx-auto w-full max-w-[1120px] pb-5 pt-[2px]">
      <form action={createPurchaseOrder} className="space-y-[10px]">
        <input type="hidden" name="rfqId" value={creationDraft.rfqId} />
        <input type="hidden" name="quoteId" value={creationDraft.quoteId} />

        <nav className={RFQ_BREADCRUMB_CLASS}>
          <Link
            href={`/buyer/rfqs/${creationDraft.rfqId}`}
            className="transition hover:text-[#7f8a99]"
          >
            {referenceCode}
          </Link>
          <span>&gt;</span>
          <span className="text-[14px] font-normal text-[#6A717F]">New Purchase Order</span>
        </nav>

        <section className="pb-[20px]">
          <h1 className={RFQ_TITLE_CLASS}>Create Purchase Order</h1>
          <p className={RFQ_META_CLASS}>
            Based On Confirmed {referenceCode} {"\u00b7"} {supplierName}
          </p>
        </section>

        <Card title="Supplier Info">
          <div className="flex items-center justify-between gap-4 px-[2px]">
            <div className="flex min-w-0 items-center gap-[12px]">
              <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#eefaf3] text-[22px] font-medium leading-none text-[#4f9b72]">
                {getInitials(supplierName)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-[6px]">
                  <p className={RFQ_SUPPLIER_NAME_CLASS}>{supplierName}</p>
                  {creationDraft.supplierInfo?.verifiedBadge ? <VerifiedBadge /> : null}
                </div>
                <p className={RFQ_SUPPLIER_SUBTITLE_CLASS}>
                  {supplierMeta}
                </p>
              </div>
            </div>

            <Link
              href={`/buyer/search/${creationDraft.supplierId}`}
              className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[#e2e5ea] bg-white px-[18px] text-[13px] font-semibold text-[#5f6877] transition hover:bg-[#f8fafc]"
            >
              View Profile
            </Link>
          </div>
        </Card>

        <Card title="Order Summary">
          <div className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1.55fr)_0.55fr_0.7fr_0.65fr] border-b border-[#edf1f5] px-[2px] py-[14px] text-[14px] font-medium uppercase leading-none text-[#b5bcc7]">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1.55fr)_0.55fr_0.7fr_0.65fr] items-center border-b border-[#edf1f5] px-[2px] py-[18px]">
              <span className="truncate pr-[12px] text-[16px] font-[500] leading-none text-[#4c5767]">
                {creationDraft.productName}
              </span>
              <span className="text-right text-[16px] font-normal leading-none text-[#7f8a9b]">
                {productQuantityLabel}
              </span>
              <span className="text-right text-[16px] font-normal leading-none text-[#7f8a9b]">
                {formatUnitPrice(creationDraft.pricePerUnit, creationDraft.unit)}
              </span>
              <span className="text-right text-[16px] font-[500] leading-none text-[#4c5767]">
                {formatCurrency(creationDraft.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between px-[2px] py-[16px] text-[16px] font-normal leading-none text-[#b5bcc7]">
              <span>Subtotal</span>
              <span>{formatCurrency(creationDraft.totalAmount)}</span>
            </div>
          </div>
        </Card>

        <Card title="Delivery Details">
          <div className="grid gap-x-[66px] gap-y-[18px] md:grid-cols-2">
            <label className="space-y-[10px]">
              <FieldLabel>Expected delivery date</FieldLabel>
              <input type="hidden" name="expectedDeliveryDate" value={defaultDeliveryDate} />
              <div className="relative">
                <TextInput
                  type="text"
                  value={deliveryDateDisplayValue}
                  readOnly
                  aria-readonly="true"
                  className="pr-[42px] text-[#a7aebb]"
                />
                <span className="pointer-events-none absolute inset-y-0 right-[14px] flex items-center text-[#1f2937]">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.25 2.5v2.5M13.75 2.5v2.5M3.75 7.5h12.5M5.625 4.375h8.75a1.875 1.875 0 0 1 1.875 1.875v8.125a1.875 1.875 0 0 1-1.875 1.875h-8.75A1.875 1.875 0 0 1 3.75 14.375V6.25a1.875 1.875 0 0 1 1.875-1.875ZM7.5 10h.008v.008H7.5V10Zm2.492 0H10v.008h-.008V10Zm2.5 0h.008v.008h-.008V10ZM7.5 12.5h.008v.008H7.5V12.5Zm2.492 0H10v.008h-.008V12.5Zm2.5 0h.008v.008h-.008V12.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </label>

            <label className="space-y-[10px]">
              <FieldLabel>Delivery Address</FieldLabel>
              <TextInput
                type="text"
                name="deliveryAddress"
                defaultValue={creationDraft.deliveryLocation ?? ""}
                required
              />
            </label>
          </div>
        </Card>

        <Card title="Payment Details">
          <div className="grid gap-x-[66px] gap-y-[18px] md:grid-cols-2">
            <label className="space-y-[10px]">
              <FieldLabel>Payment Method</FieldLabel>
              <SelectField
                name="paymentMethod"
                defaultValue={creationDraft.defaultPaymentMethod}
                required
              >
                {PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === "cash_on_delivery"
                      ? "Cash on Delivery (COD)"
                      : option.label}
                  </option>
                ))}
              </SelectField>
            </label>

            <label className="space-y-[10px]">
              <FieldLabel>Payment Terms</FieldLabel>
              <TextInput
                type="text"
                name="paymentTerms"
                defaultValue={creationDraft.defaultPaymentTerms}
                required
              />
            </label>
          </div>

          <p className="mt-[12px] text-[14px] leading-none text-[#b0b6c1] whitespace-nowrap">
            Payment is settled directly between you and the supplier upon receiving the
            goods. KaSupply does not process payments.
          </p>
        </Card>

        <Card title="Additional Notes">
          <div>
            <textarea
              name="additionalNotes"
              defaultValue={defaultNotes}
              rows={4}
              className="min-h-[104px] w-full resize-none rounded-[10px] border border-[#dce2ea] bg-white px-[16px] py-[14px] text-[14px] font-normal leading-[1.45] text-[#4c5767] outline-none transition placeholder:text-[#b7bec9] focus:border-[#9cadc7]"
            />
            <div className="mt-[10px] flex justify-end text-[13px] font-normal leading-none text-[#c1c7d1]">
              From your RFQ {"\u00b7"} editable
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-[16px] pt-[2px]">
          <p className="flex items-center gap-[6px] text-[12px] font-normal leading-none text-[#b0b6c1]">
            <span className="inline-flex h-[12px] w-[12px] items-center justify-center rounded-full border border-current text-[8px]">
              i
            </span>
            <span>{supplierName} will be notified once you send this PO.</span>
          </p>

          <div className="flex items-center gap-[18px]">
            <Link
              href={`/buyer/rfqs/${creationDraft.rfqId}`}
              className="inline-flex h-[40px] items-center justify-center rounded-[7px] border border-[#d5dae3] bg-white px-[20px] text-[13px] font-semibold leading-none text-[#6d7684] transition hover:bg-[#fafbfc]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex h-[44px] items-center justify-center rounded-[7px] bg-[#233f68] px-[24px] text-[14px] font-semibold leading-none text-white transition hover:bg-[#1d3457]"
            >
              Send Purchase Order
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
