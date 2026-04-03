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
