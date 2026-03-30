"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";
import {
  PURCHASE_ORDER_RECEIPTS_BUCKET,
  buildPurchaseOrderReceiptPath,
} from "@/lib/purchase-orders/constants";
import {
  getCurrentBuyerReceiptUploadInfo,
  getPurchaseOrderCreationDraft,
} from "./data";

function revalidatePurchaseOrderPaths(params: {
  poId: number;
  rfqId: number | null;
}) {
  revalidatePath("/buyer/purchase-orders");
  revalidatePath(`/buyer/purchase-orders/${params.poId}`);
  revalidatePath("/supplier/purchase-orders");
  revalidatePath(`/supplier/purchase-orders/${params.poId}`);

  if (params.rfqId) {
    revalidatePath(`/buyer/rfqs/${params.rfqId}`);
    revalidatePath(`/buyer/sourcing-board/${params.rfqId}`);
  }
}

export async function createPurchaseOrder(formData: FormData) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");
  const paymentMethod = String(formData.get("paymentMethod") || "").trim();
  const termsAndConditions = String(formData.get("termsAndConditions") || "").trim();
  const additionalNotes = String(formData.get("additionalNotes") || "").trim();

  if (!rfqId || Number.isNaN(rfqId) || !quoteId || Number.isNaN(quoteId)) {
    throw new Error("Missing RFQ or quotation reference.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }

  const draft = await getPurchaseOrderCreationDraft(rfqId, quoteId);

  if (!draft) {
    throw new Error("Accepted quotation not found for this RFQ.");
  }

  if (draft.existingPurchaseOrderId) {
    redirect(`/buyer/purchase-orders/${draft.existingPurchaseOrderId}`);
  }

  const { data: insertedOrder, error: insertError } = await supabase
    .from("purchase_orders")
    .insert({
      quote_id: quoteId,
      buyer_id: buyerContext.buyerId,
      supplier_id: draft.supplierId,
      product_id: null,
      quantity: draft.quantity,
      total_amount: draft.totalAmount,
      status: "confirmed",
      payment_method: paymentMethod,
      terms_and_conditions: termsAndConditions || null,
      additional_notes: additionalNotes || null,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("po_id")
    .single();

  if (insertError || !insertedOrder) {
    throw new Error(insertError?.message || "Failed to create purchase order.");
  }

  revalidatePurchaseOrderPaths({
    poId: insertedOrder.po_id,
    rfqId,
  });

  redirect(`/buyer/purchase-orders/${insertedOrder.po_id}`);
}

export async function uploadPurchaseOrderReceipt(formData: FormData) {
  const supabase = await createClient();

  const poId = Number(formData.get("poId")?.toString() ?? "");
  const receiptFile = formData.get("receiptFile") as File | null;

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  if (!receiptFile || receiptFile.size === 0) {
    throw new Error("Receipt file is required.");
  }

  const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

  if (!allowedTypes.has(receiptFile.type)) {
    throw new Error("Please upload a JPG, JPEG, PNG, or WEBP receipt image.");
  }

  if (receiptFile.size > 10 * 1024 * 1024) {
    throw new Error("The receipt file must be 10MB or smaller.");
  }

  const uploadInfo = await getCurrentBuyerReceiptUploadInfo(poId);

  if (!uploadInfo) {
    throw new Error("Purchase order not found.");
  }

  if (uploadInfo.status === "completed" || uploadInfo.status === "cancelled") {
    throw new Error("This purchase order can no longer accept a receipt upload.");
  }

  if (uploadInfo.status !== "shipped") {
    throw new Error("Receipt upload becomes available after the supplier marks the order as shipped.");
  }

  if (
    uploadInfo.existingReceiptFilePath &&
    !["rejected", "not_uploaded"].includes(uploadInfo.receiptStatus)
  ) {
    throw new Error("This receipt is already waiting for supplier review.");
  }

  const nextReceiptPath = buildPurchaseOrderReceiptPath(poId, receiptFile.name);

  const { error: uploadError } = await supabase.storage
    .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
    .upload(nextReceiptPath, receiptFile, {
      upsert: true,
      contentType: receiptFile.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload receipt.");
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      receipt_file_url: nextReceiptPath,
      receipt_status: "pending_review",
      receipt_review_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("buyer_id", uploadInfo.buyerId)
    .select("po_id, quote_id")
    .single();

  if (updateError || !updatedOrder) {
    await supabase.storage.from(PURCHASE_ORDER_RECEIPTS_BUCKET).remove([nextReceiptPath]);
    throw new Error(updateError?.message || "Failed to attach receipt to this order.");
  }

  if (
    uploadInfo.existingReceiptFilePath &&
    uploadInfo.existingReceiptFilePath !== nextReceiptPath
  ) {
    await supabase.storage
      .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
      .remove([uploadInfo.existingReceiptFilePath]);
  }

  const { data: quotation } = await supabase
    .from("quotations")
    .select("engagement_id")
    .eq("quote_id", updatedOrder.quote_id)
    .maybeSingle();

  let rfqId: number | null = null;

  if (quotation?.engagement_id) {
    const { data: engagement } = await supabase
      .from("rfq_engagements")
      .select("rfq_id")
      .eq("engagement_id", quotation.engagement_id)
      .maybeSingle();

    rfqId = engagement?.rfq_id ?? null;
  }

  revalidatePurchaseOrderPaths({
    poId,
    rfqId,
  });

  redirect(`/buyer/purchase-orders/${poId}`);
}
