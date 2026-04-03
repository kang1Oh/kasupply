"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export type RFQFormPrefillData = {
  entryMode: "product-request";
  supplier: {
    supplierId: number;
    avatarUrl: string | null;
    businessName: string;
    businessType: string;
    locationLabel: string;
    profileHref: string;
  } | null;
  product: {
    productId: number;
    productName: string;
    categoryId: number;
    categoryName: string;
    unit: string;
    pricePerUnit: number | null;
    moq: number;
    description: string | null;
  } | null;
  categories: {
    categoryId: number;
    categoryName: string;
  }[];
  initialValues: {
    supplierId: string;
    categoryId: string;
    productId: string;
    productName: string;
    quantity: string;
    unit: string;
    targetPricePerUnit: string;
    preferredDeliveryDate: string;
    deliveryLocation: string;
    notes: string;
    deadline: string;
  };
};

async function getCurrentBuyerId() {
  const supabase = await createClient();
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    return null;
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError || !businessProfile) {
    return null;
  }

  const { data: buyerProfile, error: buyerProfileError } = await supabase
    .from("buyer_profiles")
    .select("buyer_id")
    .eq("profile_id", businessProfile.profile_id)
    .maybeSingle();

  if (buyerProfileError || !buyerProfile) {
    return null;
  }

  return buyerProfile.buyer_id as number;
}

async function getCurrentBuyerLocationLabel() {
  const supabase = await createClient();
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    return "";
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("business_location, city, province, region")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError || !businessProfile) {
    return "";
  }

  return (
    businessProfile.business_location?.trim() ||
    [businessProfile.city, businessProfile.province, businessProfile.region]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(", ")
  );
}

function getTodayDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export async function getNewRFQPrefillData(params: {
  supplierId?: string;
  productId?: string;
}): Promise<RFQFormPrefillData> {
  const supabase = await createClient();

  const supplierId = Number(params.supplierId || "");
  const productId = Number(params.productId || "");

  const isProductRequest = supplierId > 0 && productId > 0;

  if (!isProductRequest) {
    redirect("/buyer/rfqs");
  }

  const entryMode: RFQFormPrefillData["entryMode"] = "product-request";
  const buyerLocationLabel = await getCurrentBuyerLocationLabel();

  const { data: categoryRows, error: categoryError } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true });

  if (categoryError) {
    console.error("Error fetching categories:", categoryError);
    throw new Error("Failed to fetch categories.");
  }

  let supplier: RFQFormPrefillData["supplier"] = null;
  let product: RFQFormPrefillData["product"] = null;

  if (supplierId) {
    const { data: supplierRow, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select(
        `
        supplier_id,
        business_profiles (
          user_id,
          business_name,
          business_type,
          city,
          province
        )
      `
      )
      .eq("supplier_id", supplierId)
      .maybeSingle();

    if (supplierError) {
      console.error("Error fetching supplier for RFQ form:", supplierError);
      throw new Error("Failed to fetch supplier.");
    }

    if (supplierRow) {
      const profile = Array.isArray(supplierRow.business_profiles)
        ? supplierRow.business_profiles[0]
        : supplierRow.business_profiles;

      let avatarUrl: string | null = null;

      if (profile?.user_id) {
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("avatar_url")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (userError) {
          console.error("Error fetching supplier avatar for RFQ form:", userError);
          throw new Error("Failed to fetch supplier avatar.");
        }

        avatarUrl = userRow?.avatar_url ?? null;
      }

      supplier = {
        supplierId: supplierRow.supplier_id,
        avatarUrl,
        businessName: profile?.business_name ?? "Unknown Supplier",
        businessType: profile?.business_type ?? "Supplier",
        locationLabel: [profile?.city, profile?.province].filter(Boolean).join(", "),
        profileHref: `/buyer/search/${supplierRow.supplier_id}`,
      };
    }
  }

  if (entryMode === "product-request" && productId) {
    const { data: productRow, error: productError } = await supabase
      .from("products")
      .select(
        `
        product_id,
        supplier_id,
        category_id,
        product_name,
        description,
        unit,
        price_per_unit,
        moq,
        product_categories (
          category_name
        )
      `
      )
      .eq("product_id", productId)
      .eq("supplier_id", supplierId)
      .eq("is_published", true)
      .maybeSingle();

    if (productError) {
      console.error("Error fetching product for RFQ form:", productError);
      throw new Error("Failed to fetch product.");
    }

    if (productRow) {
      const category = Array.isArray(productRow.product_categories)
        ? productRow.product_categories[0]
        : productRow.product_categories;

      product = {
        productId: productRow.product_id,
        productName: productRow.product_name,
        categoryId: productRow.category_id,
        categoryName: category?.category_name ?? "Uncategorized",
        unit: productRow.unit,
        pricePerUnit:
          productRow.price_per_unit == null ? null : Number(productRow.price_per_unit),
        moq: productRow.moq,
        description: productRow.description,
      };
    }
  }

  if (!supplier) {
    redirect("/buyer/rfqs");
  }

  if (!product) {
    redirect("/buyer/rfqs");
  }

  const initialValues: RFQFormPrefillData["initialValues"] = {
    supplierId: String(supplier.supplierId),
    categoryId: String(product.categoryId),
    productId: String(product.productId),
    productName: product.productName,
    quantity: String(product.moq),
    unit: product.unit,
    targetPricePerUnit:
      product.pricePerUnit == null ? "" : String(product.pricePerUnit),
    preferredDeliveryDate: "",
    deliveryLocation: buyerLocationLabel,
    notes: product.description ?? "",
    deadline: "",
  };

  return {
    entryMode,
    supplier,
    product,
    categories: (categoryRows ?? []).map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
    })),
    initialValues,
  };
}

export async function createRFQ(formData: FormData) {
  const supabase = await createClient();
  const buyerId = await getCurrentBuyerId();

  if (!buyerId) {
    throw new Error("Buyer profile not found.");
  }

  const supplierId = Number(formData.get("supplierId")?.toString() ?? "");
  const productId = Number(formData.get("productId")?.toString() ?? "");
  const quantity = Number(formData.get("quantity")?.toString() ?? "");
  const targetPricePerUnit = formData.get("targetPricePerUnit")?.toString().trim() ?? "";
  const preferredDeliveryDate = formData.get("preferredDeliveryDate")?.toString() ?? "";
  const deliveryLocation = formData.get("deliveryLocation")?.toString().trim() ?? "";
  const specifications = formData.get("notes")?.toString().trim() ?? "";
  const deadline = formData.get("deadline")?.toString() ?? "";

  if (!supplierId) {
    throw new Error("Supplier is required.");
  }

  if (!productId) {
    redirect("/buyer/rfqs");
  }

  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  if (!targetPricePerUnit || Number(targetPricePerUnit) <= 0) {
    throw new Error("Target price per unit is required.");
  }

  const parsedTargetPricePerUnit = Number(targetPricePerUnit);

  if (!Number.isFinite(parsedTargetPricePerUnit) || parsedTargetPricePerUnit <= 0) {
    throw new Error("Target price per unit must be a valid number.");
  }

  if (!preferredDeliveryDate) {
    throw new Error("Preferred delivery date is required.");
  }

  if (!deliveryLocation) {
    throw new Error("Delivery location is required.");
  }

  if (!deadline) {
    throw new Error("Deadline is required.");
  }

  const todayDateString = getTodayDateString();

  if (preferredDeliveryDate < todayDateString) {
    throw new Error("Preferred delivery date cannot be in the past.");
  }

  if (deadline < todayDateString) {
    throw new Error("RFQ deadline cannot be in the past.");
  }

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("product_id, supplier_id, category_id, product_name, unit, is_published")
    .eq("product_id", productId)
    .eq("supplier_id", supplierId)
    .eq("is_published", true)
    .maybeSingle();

  if (productError || !productRow) {
    throw new Error(productError?.message || "Selected product was not found.");
  }

  const { data: insertedRfq, error: rfqError } = await supabase
    .from("rfqs")
    .insert({
      buyer_id: buyerId,
      category_id: productRow.category_id,
      quantity,
      unit: productRow.unit,
      specifications: specifications || null,
      target_price_per_unit: parsedTargetPricePerUnit,
      preferred_delivery_date: preferredDeliveryDate,
      delivery_location: deliveryLocation,
      deadline,
      status: "open",
      visibility: "restricted",
      product_id: productRow.product_id,
      rfq_type: "direct",
      requested_product_name: productRow.product_name,
    })
    .select("rfq_id")
    .single();

  if (rfqError || !insertedRfq) {
    console.error("Error creating RFQ:", rfqError);
    throw new Error("Failed to create RFQ.");
  }

  const { error: engagementError } = await supabase
    .from("rfq_engagements")
    .insert({
      rfq_id: insertedRfq.rfq_id,
      supplier_id: supplierId,
      status: "viewing",
    });

  if (engagementError) {
    console.error("Error creating RFQ engagement:", engagementError);
    throw new Error("Failed to create RFQ engagement.");
  }

  redirect("/buyer/rfqs");
}
