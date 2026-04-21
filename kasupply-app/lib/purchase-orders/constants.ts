export const PURCHASE_ORDER_STATUS_FLOW = [
  "confirmed",
  "processing",
  "shipped",
  "completed",
] as const;

export const PURCHASE_ORDER_ACTIVE_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
] as const;

export const PURCHASE_ORDER_RECEIPTS_BUCKET = "purchase-order-receipts";
export const ACCEPTED_RECEIPT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const PURCHASE_ORDER_RECEIPT_STATUSES = [
  "not_uploaded",
  "pending_review",
  "approved",
  "rejected",
] as const;
export const PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS = [
  {
    value: "cash_on_delivery",
    label: "Cash on Delivery",
  },
  {
    value: "bank_transfer",
    label: "Bank Transfer",
  },
  {
    value: "e_wallet",
    label: "E-Wallet",
  },
  {
    value: "check",
    label: "Check",
  },
  {
    value: "partial_upfront_balance_on_delivery",
    label: "Partial Upfront / Balance on Delivery",
  },
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUS_FLOW)[number] | "cancelled";
export type PurchaseOrderReceiptStatus =
  (typeof PURCHASE_ORDER_RECEIPT_STATUSES)[number];
export type PurchaseOrderPaymentMethod =
  (typeof PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS)[number]["value"];

const PURCHASE_ORDER_PAYMENT_METHOD_LABEL_MAP = new Map<
  PurchaseOrderPaymentMethod,
  string
>(
  PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

const PURCHASE_ORDER_PAYMENT_METHOD_ALIASES: Record<
  string,
  PurchaseOrderPaymentMethod
> = {
  cash_on_delivery: "cash_on_delivery",
  "cash on delivery": "cash_on_delivery",
  cod: "cash_on_delivery",
  bank_transfer: "bank_transfer",
  "bank transfer": "bank_transfer",
  e_wallet: "e_wallet",
  "e-wallet": "e_wallet",
  ewallet: "e_wallet",
  "e wallet": "e_wallet",
  check: "check",
  cheque: "check",
  partial_upfront_balance_on_delivery: "partial_upfront_balance_on_delivery",
  "partial upfront / balance on delivery": "partial_upfront_balance_on_delivery",
  "partial upfront balance on delivery": "partial_upfront_balance_on_delivery",
  "partial upfront/balance on delivery": "partial_upfront_balance_on_delivery",
};

export function normalizePurchaseOrderStatus(value: string | null | undefined) {
  return value ? value.toLowerCase().replace(/\s+/g, "_") : "confirmed";
}

export function normalizePurchaseOrderReceiptStatus(
  value: string | null | undefined,
  hasReceiptFile: boolean,
) {
  if (value) {
    return value.toLowerCase().replace(/\s+/g, "_");
  }

  return hasReceiptFile ? "pending_review" : "not_uploaded";
}

export function formatPurchaseOrderNumber(poId: number) {
  return `PO-${poId}`;
}

export function normalizePurchaseOrderPaymentMethod(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const aliasKey = trimmed.toLowerCase().replace(/\s+/g, " ");
  const normalizedAlias =
    PURCHASE_ORDER_PAYMENT_METHOD_ALIASES[aliasKey] ??
    PURCHASE_ORDER_PAYMENT_METHOD_ALIASES[
      aliasKey.replace(/[/-]+/g, "_").replace(/\s+/g, "_")
    ];

  return normalizedAlias ?? null;
}

export function isPurchaseOrderPaymentMethod(
  value: string | null | undefined,
): value is PurchaseOrderPaymentMethod {
  return PURCHASE_ORDER_PAYMENT_METHOD_OPTIONS.some(
    (option) => option.value === value,
  );
}

export function getPurchaseOrderPaymentMethodLabel(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const normalized = normalizePurchaseOrderPaymentMethod(value);

  if (normalized) {
    return PURCHASE_ORDER_PAYMENT_METHOD_LABEL_MAP.get(normalized) ?? value;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function formatReceiptFileSizeLimit() {
  return "10MB";
}

export function buildPurchaseOrderReceiptPath(
  poId: number,
  fileName: string,
  ownerSegment?: string | null,
) {
  const fileExt = fileName.split(".").pop() || "jpg";
  const safeExt = fileExt.toLowerCase();
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const ownerPrefix =
    typeof ownerSegment === "string" && ownerSegment.trim()
      ? `${ownerSegment.trim()}/${poId}`
      : String(poId);

  return `${ownerPrefix}/${baseName || "receipt"}-${Date.now()}.${safeExt}`;
}
