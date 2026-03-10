"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const product_name = String(formData.get("product_name") || "").trim();
  const category_id = Number(formData.get("category_id"));
  const description = String(formData.get("description") || "").trim();
  const unit = String(formData.get("unit") || "").trim();
  const price_per_unit = Number(formData.get("price_per_unit"));
  const moq = Number(formData.get("moq"));
  const max_capacity = Number(formData.get("max_capacity"));
  const lead_time = String(formData.get("lead_time") || "").trim();
  const stock_available = Number(formData.get("stock_available"));
  const is_published = formData.get("is_published") === "on";

  if (!product_name) {
    throw new Error("Product name is required.");
  }

  if (!category_id || Number.isNaN(category_id)) {
    throw new Error("Category is required.");
  }

  if (!unit) {
    throw new Error("Unit is required.");
  }

  if (Number.isNaN(price_per_unit) || price_per_unit < 0) {
    throw new Error("Price per unit must be a valid number.");
  }

  if (Number.isNaN(moq) || moq < 0) {
    throw new Error("MOQ must be a valid number.");
  }

  if (Number.isNaN(max_capacity) || max_capacity < 0) {
    throw new Error("Max capacity must be a valid number.");
  }

  if (!lead_time) {
    throw new Error("Lead time is required.");
  }

  if (Number.isNaN(stock_available) || stock_available < 0) {
    throw new Error("Stock available must be a valid number.");
  }

  // 1. Get app user
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  // 2. Get business profile
  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  // 3. Get supplier profile
  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  // 4. Insert product
  const { error: insertError } = await supabase.from("products").insert({
    supplier_id: supplierProfile.supplier_id,
    category_id,
    product_name,
    description: description || null,
    unit,
    price_per_unit,
    moq,
    max_capacity,
    lead_time,
    stock_available,
    is_published,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(insertError.message || "Failed to create product.");
  }

  revalidatePath("/dashboard/supplier/inventory");
}