"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PURCHASE_ORDER_STATUS_FLOW } from "@/lib/purchase-orders/constants";

type SupplierProfileRow = {
  supplier_id: number;
};

function revalidatePurchaseOrderPaths(poId: number) {
  revalidatePath("/supplier/purchase-orders");
  revalidatePath(`/supplier/purchase-orders/${poId}`);
  revalidatePath("/buyer/purchase-orders");
  revalidatePath(`/buyer/purchase-orders/${poId}`);
}

async function getCurrentSupplierId() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return {
    supabase,
    supplierId: supplierProfile.supplier_id,
  };
}

async function getOrderRfqId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: number,
) {
  const { data: quotation } = await supabase
    .from("quotations")
    .select("engagement_id")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (!quotation?.engagement_id) {
    return null;
  }

  const { data: engagement } = await supabase
    .from("rfq_engagements")
    .select("rfq_id")
    .eq("engagement_id", quotation.engagement_id)
    .maybeSingle();

  return engagement?.rfq_id ?? null;
}

export async function updatePurchaseOrderStatus(formData: FormData) {
  const { supabase, supplierId } = await getCurrentSupplierId();

  const poId = Number(formData.get("po_id"));
  const nextStatus = String(
    formData.get("next_status") || formData.get("status") || "",
  )
    .trim()
    .toLowerCase();
  const redirectTo = String(formData.get("redirect_to") || "").trim();

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  if (![...PURCHASE_ORDER_STATUS_FLOW, "cancelled"].includes(nextStatus)) {
    throw new Error("Invalid status transition.");
  }

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select(
      "po_id, supplier_id, quote_id, status, receipt_file_url, receipt_status",
    )
    .eq("supplier_id", supplierId)
    .eq("po_id", poId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message || "Failed to load purchase order.");
  }

  if (!order) {
    throw new Error("Purchase order not found.");
  }

  const currentStatus = String(order.status || "").toLowerCase();
  const currentIndex = PURCHASE_ORDER_STATUS_FLOW.indexOf(
    currentStatus as (typeof PURCHASE_ORDER_STATUS_FLOW)[number],
  );
  const nextIndex = PURCHASE_ORDER_STATUS_FLOW.indexOf(
    nextStatus as (typeof PURCHASE_ORDER_STATUS_FLOW)[number],
  );

  if (nextStatus === "cancelled") {
    if (currentStatus === "completed" || currentStatus === "cancelled") {
      throw new Error("Completed or cancelled orders can no longer be changed.");
    }
  } else if (currentIndex !== -1 && nextIndex !== currentIndex + 1) {
    throw new Error("Purchase order statuses must move forward one step at a time.");
  }

  if (nextStatus === "completed") {
    const receiptPath =
      typeof order.receipt_file_url === "string" && order.receipt_file_url.trim().length > 0
        ? order.receipt_file_url
        : null;

    if (!receiptPath) {
      throw new Error("The buyer must upload a receipt before the order can be completed.");
    }
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("supplier_id", supplierId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update purchase order status.");
  }

  revalidatePurchaseOrderPaths(poId);

  if (order.quote_id) {
    const rfqId = await getOrderRfqId(supabase, order.quote_id);

    if (rfqId) {
      revalidatePath(`/buyer/rfqs/${rfqId}`);
      revalidatePath(`/buyer/sourcing-board/${rfqId}`);
    }
  }

  if (redirectTo === "/supplier/purchase-orders") {
    redirect(redirectTo);
  }

  redirect(`/supplier/purchase-orders/${poId}`);
}

export async function updatePurchaseOrderDeliveryFee(formData: FormData) {
  const { supabase, supplierId } = await getCurrentSupplierId();

  const poId = Number(formData.get("po_id"));
  const deliveryFee = Number(formData.get("delivery_fee"));

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new Error("Delivery fee must be a valid non-negative number.");
  }

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("po_id, quote_id, quantity, status")
    .eq("po_id", poId)
    .eq("supplier_id", supplierId)
    .single();

  if (orderError || !order) {
    throw new Error("Purchase order not found.");
  }

  if (order.status === "completed" || order.status === "cancelled") {
    throw new Error("Delivery fee can no longer be changed for this order.");
  }

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("price_per_unit")
    .eq("quote_id", order.quote_id)
    .single();

  if (quotationError || !quotation) {
    throw new Error(quotationError?.message || "Failed to load quotation price.");
  }

  const totalAmount = Number(order.quantity) * Number(quotation.price_per_unit) + deliveryFee;

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("supplier_id", supplierId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update delivery fee.");
  }

  revalidatePurchaseOrderPaths(poId);
  redirect(`/supplier/purchase-orders/${poId}`);
}

export async function reviewPurchaseOrderReceipt(formData: FormData) {
  const { supabase, supplierId } = await getCurrentSupplierId();

  const poId = Number(formData.get("po_id"));
  const decision = String(formData.get("decision") || "").trim().toLowerCase();
  const reviewNotes = String(formData.get("review_notes") || "").trim();

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid receipt review action.");
  }

  if (decision === "rejected" && !reviewNotes) {
    throw new Error("Please add a short reason before rejecting the receipt.");
  }

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("po_id, status, receipt_file_url")
    .eq("po_id", poId)
    .eq("supplier_id", supplierId)
    .single();

  if (orderError || !order) {
    throw new Error("Purchase order not found.");
  }

  if (!order.receipt_file_url) {
    throw new Error("There is no buyer receipt to review yet.");
  }

  if (order.status === "completed" || order.status === "cancelled") {
    throw new Error("Receipt review is no longer available for this order.");
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      receipt_status: decision,
      receipt_review_notes: decision === "rejected" ? reviewNotes || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("supplier_id", supplierId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to review buyer receipt.");
  }

  revalidatePurchaseOrderPaths(poId);
  redirect(`/supplier/purchase-orders/${poId}`);
}
