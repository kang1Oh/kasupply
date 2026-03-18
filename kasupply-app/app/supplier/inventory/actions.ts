"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type ExistingProductRow = {
  product_id: number;
  supplier_id: number;
  image_url: string | null;
};

function buildProductImagePath(supplierId: number, fileName: string) {
  const fileExt = fileName.split(".").pop() || "jpg";
  const safeExt = fileExt.toLowerCase();
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeBaseName = baseName || "product-image";
  return `${supplierId}/${safeBaseName}-${Date.now()}.${safeExt}`;
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
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return supplierProfile.supplier_id;
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const supplier_id = await getCurrentSupplierId();

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
  const image_file = formData.get("image_file") as File | null;

  if (!product_name) throw new Error("Product name is required.");
  if (!category_id || Number.isNaN(category_id)) throw new Error("Category is required.");
  if (!unit) throw new Error("Unit is required.");
  if (Number.isNaN(price_per_unit) || price_per_unit < 0) throw new Error("Price per unit must be a valid number.");
  if (Number.isNaN(moq) || moq < 0) throw new Error("MOQ must be a valid number.");
  if (Number.isNaN(max_capacity) || max_capacity < 0) throw new Error("Max capacity must be a valid number.");
  if (!lead_time) throw new Error("Lead time is required.");
  if (Number.isNaN(stock_available) || stock_available < 0) throw new Error("Stock available must be a valid number.");

  let image_url: string | null = null;

  if (image_file && image_file.size > 0) {
    if (!image_file.type.startsWith("image/")) {
      throw new Error("Product image must be a valid image file.");
    }

    image_url = buildProductImagePath(supplier_id, image_file.name);

    const { error: imageUploadError } = await supabase.storage
      .from("product-images")
      .upload(image_url, image_file, {
        upsert: true,
        contentType: image_file.type,
      });

    if (imageUploadError) {
      throw new Error(imageUploadError.message || "Failed to upload product image.");
    }
  }

  const { error: insertError } = await supabase.from("products").insert({
    supplier_id,
    category_id,
    product_name,
    description: description || null,
    image_url,
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
    if (image_url) {
      await supabase.storage.from("product-images").remove([image_url]);
    }
    throw new Error(insertError.message || "Failed to create product.");
  }

  revalidatePath("/supplier/inventory");
  redirect("/supplier/inventory");
}

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const supplier_id = await getCurrentSupplierId();

  const product_id = Number(formData.get("product_id"));
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
  const image_file = formData.get("image_file") as File | null;

  if (!product_id || Number.isNaN(product_id)) throw new Error("Invalid product.");
  if (!product_name) throw new Error("Product name is required.");
  if (!category_id || Number.isNaN(category_id)) throw new Error("Category is required.");
  if (!unit) throw new Error("Unit is required.");
  if (Number.isNaN(price_per_unit) || price_per_unit < 0) throw new Error("Price per unit must be a valid number.");
  if (Number.isNaN(moq) || moq < 0) throw new Error("MOQ must be a valid number.");
  if (Number.isNaN(max_capacity) || max_capacity < 0) throw new Error("Max capacity must be a valid number.");
  if (!lead_time) throw new Error("Lead time is required.");
  if (Number.isNaN(stock_available) || stock_available < 0) throw new Error("Stock available must be a valid number.");

  const { data: existingProduct, error: existingProductError } = await supabase
    .from("products")
    .select("product_id, supplier_id, image_url")
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id)
    .single<ExistingProductRow>();

  if (existingProductError || !existingProduct) {
    throw new Error("Product not found.");
  }

  let nextImageUrl = existingProduct.image_url;
  let uploadedReplacementPath: string | null = null;

  if (image_file && image_file.size > 0) {
    if (!image_file.type.startsWith("image/")) {
      throw new Error("Product image must be a valid image file.");
    }

    uploadedReplacementPath = buildProductImagePath(supplier_id, image_file.name);

    const { error: imageUploadError } = await supabase.storage
      .from("product-images")
      .upload(uploadedReplacementPath, image_file, {
        upsert: true,
        contentType: image_file.type,
      });

    if (imageUploadError) {
      throw new Error(imageUploadError.message || "Failed to upload product image.");
    }

    nextImageUrl = uploadedReplacementPath;
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      category_id,
      product_name,
      description: description || null,
      image_url: nextImageUrl,
      unit,
      price_per_unit,
      moq,
      max_capacity,
      lead_time,
      stock_available,
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id);

  if (updateError) {
    if (uploadedReplacementPath) {
      await supabase.storage.from("product-images").remove([uploadedReplacementPath]);
    }
    throw new Error(updateError.message || "Failed to update product.");
  }

  if (
    uploadedReplacementPath &&
    existingProduct.image_url &&
    existingProduct.image_url !== uploadedReplacementPath
  ) {
    await supabase.storage
      .from("product-images")
      .remove([existingProduct.image_url]);
  }

  revalidatePath("/supplier/inventory");
  redirect("/supplier/inventory");
}

export async function deleteInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const supplier_id = await getCurrentSupplierId();

  const product_id = Number(formData.get("product_id"));

  if (!product_id || Number.isNaN(product_id)) {
    throw new Error("Invalid product.");
  }

  const { data: existingProduct, error: existingProductError } = await supabase
    .from("products")
    .select("product_id, supplier_id, image_url")
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id)
    .single<ExistingProductRow>();

  if (existingProductError || !existingProduct) {
    throw new Error("Product not found.");
  }

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete product.");
  }

  if (existingProduct.image_url) {
    await supabase.storage
      .from("product-images")
      .remove([existingProduct.image_url]);
  }

  revalidatePath("/supplier/inventory");
  redirect("/supplier/inventory");
}

export async function togglePublishStatus(formData: FormData) {
  const supabase = await createClient();
  const supplier_id = await getCurrentSupplierId();

  const product_id = Number(formData.get("product_id"));
  const current_value = String(formData.get("current_value")) === "true";

  if (!product_id || Number.isNaN(product_id)) {
    throw new Error("Invalid product.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_published: !current_value,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to update publish status.");
  }

  revalidatePath("/supplier/inventory");
}

export async function quickUpdateStock(formData: FormData) {
  const supabase = await createClient();
  const supplier_id = await getCurrentSupplierId();

  const product_id = Number(formData.get("product_id"));
  const stock_available = Number(formData.get("stock_available"));

  if (!product_id || Number.isNaN(product_id)) {
    throw new Error("Invalid product.");
  }

  if (Number.isNaN(stock_available) || stock_available < 0) {
    throw new Error("Stock must be a valid number.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      stock_available,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id);

  if (error) {
    throw new Error(error.message || "Failed to update stock.");
  }

  revalidatePath("/supplier/inventory");
}
