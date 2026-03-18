"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
};

const ALLOWED_STATUS_FLOW = ["pending", "in_transit", "delivered", "paid", "completed"];

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

export async function updatePurchaseOrderStatus(formData: FormData) {
  const { supabase, supplierId } = await getCurrentSupplierId();

  const poId = Number(formData.get("po_id"));
  const nextStatus = String(formData.get("next_status") || "").trim().toLowerCase();

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  if (!ALLOWED_STATUS_FLOW.includes(nextStatus)) {
    throw new Error("Invalid status transition.");
  }

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("po_id, status")
    .eq("po_id", poId)
    .eq("supplier_id", supplierId)
    .single();

  if (orderError || !order) {
    throw new Error("Purchase order not found.");
  }

  const currentIndex = ALLOWED_STATUS_FLOW.indexOf(String(order.status || "").toLowerCase());
  const nextIndex = ALLOWED_STATUS_FLOW.indexOf(nextStatus);

  if (currentIndex !== -1 && nextIndex > currentIndex + 1) {
    throw new Error("Purchase order statuses must move forward one step at a time.");
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      status: nextStatus,
    })
    .eq("po_id", poId)
    .eq("supplier_id", supplierId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update purchase order status.");
  }

  revalidatePath("/supplier/purchase-orders");
  revalidatePath(`/supplier/purchase-orders/${poId}`);
  redirect(`/supplier/purchase-orders/${poId}`);
}
