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

type ExistingProductImageRow = {
  image_id: number;
  product_id: number;
  storage_path: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

function buildProductImagePath(supplierId: number, fileName: string, index: number) {
  const fileExt = fileName.split(".").pop() || "jpg";
  const safeExt = fileExt.toLowerCase();
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeBaseName = baseName || "product-image";
  const uniqueSuffix = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return `${supplierId}/${safeBaseName}-${uniqueSuffix}.${safeExt}`;
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

function getImageFiles(formData: FormData) {
  return formData
    .getAll("image_file")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadProductImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: number,
  imageFiles: File[],
) {
  const uploadedPaths: string[] = [];

  for (const [index, imageFile] of imageFiles.entries()) {
    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Product image must be a valid image file.");
    }

    const imagePath = buildProductImagePath(supplierId, imageFile.name, index);
    const { error: imageUploadError } = await supabase.storage
      .from("product-images")
      .upload(imagePath, imageFile, {
        upsert: true,
        contentType: imageFile.type,
      });

    if (imageUploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("product-images").remove(uploadedPaths);
      }
      throw new Error(imageUploadError.message || "Failed to upload product image.");
    }

    uploadedPaths.push(imagePath);
  }

  return uploadedPaths;
}

function dedupeOrderedPaths(paths: string[]) {
  const seen = new Set<string>();
  const uniquePaths: string[] = [];

  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    uniquePaths.push(path);
  }

  return uniquePaths;
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
  const visibility = String(formData.get("visibility") || "").trim().toLowerCase();
  const is_published = visibility === "visible";
  const imageFiles = getImageFiles(formData);

  if (!product_name) throw new Error("Product name is required.");
  if (!category_id || Number.isNaN(category_id)) throw new Error("Category is required.");
  if (!unit) throw new Error("Unit is required.");
  if (Number.isNaN(price_per_unit) || price_per_unit < 0) throw new Error("Price per unit must be a valid number.");
  if (Number.isNaN(moq) || moq < 0) throw new Error("MOQ must be a valid number.");
  if (Number.isNaN(max_capacity) || max_capacity < 0) throw new Error("Max capacity must be a valid number.");
  if (!lead_time) throw new Error("Lead time is required.");
  if (Number.isNaN(stock_available) || stock_available < 0) throw new Error("Stock available must be a valid number.");

  const uploadedPaths = imageFiles.length > 0
    ? await uploadProductImages(supabase, supplier_id, imageFiles)
    : [];
  const uniqueUploadedPaths = dedupeOrderedPaths(uploadedPaths);
  const image_url = uniqueUploadedPaths[0] ?? null;

  const { data: createdProduct, error: insertError } = await supabase.from("products").insert({
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
  }).select("product_id").single();

  if (insertError) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("product-images").remove(uploadedPaths);
    }
    throw new Error(insertError.message || "Failed to create product.");
  }

  if (uniqueUploadedPaths.length > 0) {
    const { error: productImagesInsertError } = await supabase.from("product_images").insert(
      uniqueUploadedPaths.map((path, index) => ({
        product_id: createdProduct.product_id,
        storage_path: path,
        sort_order: index,
        is_cover: index === 0,
      })),
    );

      if (productImagesInsertError) {
        await supabase.from("products").delete().eq("product_id", createdProduct.product_id);
        await supabase.storage.from("product-images").remove(uniqueUploadedPaths);
        throw new Error(productImagesInsertError.message || "Failed to save product images.");
      }
    }

  revalidatePath("/supplier/inventory");
  redirect(`/supplier/inventory?modal=added&added=${createdProduct.product_id}`);
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
  const visibility = String(formData.get("visibility") || "").trim().toLowerCase();
  const is_published = visibility === "visible";
  const imageFiles = getImageFiles(formData);
  const existingImageIds = formData
    .getAll("existing_image_ids")
    .map((value) => String(value))
    .filter(Boolean);

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

  const { data: existingProductImages, error: existingProductImagesError } = await supabase
    .from("product_images")
    .select("image_id, product_id, storage_path, sort_order, is_cover")
    .eq("product_id", product_id)
    .order("sort_order", { ascending: true });

  if (existingProductImagesError) {
    throw new Error(existingProductImagesError.message || "Failed to load current product images.");
  }

  const safeExistingProductImages = (existingProductImages as ExistingProductImageRow[] | null) ?? [];
  const existingImageMap = new Map(
    safeExistingProductImages.map((image) => [String(image.image_id), image]),
  );
  const keptExistingImages = existingImageIds
    .map((imageId) => existingImageMap.get(imageId))
    .filter((image): image is ExistingProductImageRow => Boolean(image));
  const removedExistingImages = safeExistingProductImages.filter(
    (image) => !existingImageIds.includes(String(image.image_id)),
  );
  const uploadedPaths = imageFiles.length > 0
    ? await uploadProductImages(supabase, supplier_id, imageFiles)
    : [];
  const orderedImageUrls = dedupeOrderedPaths([
    ...keptExistingImages.map((image) => image.storage_path),
    ...uploadedPaths,
  ]);
  const nextImageUrl = orderedImageUrls[0] ?? null;

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
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("product-images").remove(uploadedPaths);
    }
    throw new Error(updateError.message || "Failed to update product.");
  }

  const { error: deleteExistingRowsError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", product_id);

  if (deleteExistingRowsError) {
    throw new Error(deleteExistingRowsError.message || "Failed to refresh product images.");
  }

  if (orderedImageUrls.length > 0) {
    const { error: insertReplacementRowsError } = await supabase.from("product_images").insert(
      orderedImageUrls.map((path, index) => ({
        product_id,
        storage_path: path,
        sort_order: index,
        is_cover: index === 0,
      })),
    );

    if (insertReplacementRowsError) {
      throw new Error(insertReplacementRowsError.message || "Failed to save product image order.");
    }
  }

  if (removedExistingImages.length > 0) {
    await supabase.storage
      .from("product-images")
      .remove(removedExistingImages.map((image) => image.storage_path));
  }

  revalidatePath("/supplier/inventory");
  redirect("/supplier/inventory?modal=saved");
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

  const { data: existingProductImages } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", product_id);

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("product_id", product_id)
    .eq("supplier_id", supplier_id);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete product.");
  }

  const imagePaths = new Set<string>();
  if (existingProduct.image_url) {
    imagePaths.add(existingProduct.image_url);
  }
  for (const image of existingProductImages ?? []) {
    if (image.storage_path) imagePaths.add(image.storage_path);
  }

  if (imagePaths.size > 0) {
    await supabase.storage
      .from("product-images")
      .remove(Array.from(imagePaths));
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
