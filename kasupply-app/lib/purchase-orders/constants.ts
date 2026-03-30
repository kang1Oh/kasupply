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
export const PURCHASE_ORDER_RECEIPT_STATUSES = [
  "not_uploaded",
  "pending_review",
  "approved",
  "rejected",
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUS_FLOW)[number] | "cancelled";
export type PurchaseOrderReceiptStatus =
  (typeof PURCHASE_ORDER_RECEIPT_STATUSES)[number];

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

export function buildPurchaseOrderReceiptPath(poId: number, fileName: string) {
  const fileExt = fileName.split(".").pop() || "jpg";
  const safeExt = fileExt.toLowerCase();
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${poId}/${baseName || "receipt"}-${Date.now()}.${safeExt}`;
}
