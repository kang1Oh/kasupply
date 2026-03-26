"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export type RFQFormPrefillData = {
  entryMode: "reuse-rfq" | "product-request";
  supplier: {
    supplierId: number;
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
    moq: number;
    description: string | null;
  } | null;
  reusedRfq: {
    rfqId: number;
    categoryId: number;
    productName: string;
    quantity: number;
    unit: string;
    specifications: string | null;
    targetPricePerUnit: string;
    preferredDeliveryDate: string;
    deliveryLocation: string;
    deadline: string;
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

export async function getNewRFQPrefillData(params: {
  supplierId?: string;
  rfqId?: string;
  productId?: string;
}): Promise<RFQFormPrefillData> {
  const supabase = await createClient();

  const supplierId = Number(params.supplierId || "");
  const rfqId = Number(params.rfqId || "");
  const productId = Number(params.productId || "");

  const isReuseRequest = supplierId > 0 && rfqId > 0 && !productId;
  const isProductRequest = supplierId > 0 && productId > 0 && !rfqId;

  if (!isReuseRequest && !isProductRequest) {
    redirect("/buyer/rfqs");
  }

  const entryMode: RFQFormPrefillData["entryMode"] = isReuseRequest
    ? "reuse-rfq"
    : "product-request";

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
  let reusedRfq: RFQFormPrefillData["reusedRfq"] = null;

  if (supplierId) {
    const { data: supplierRow, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select(
        `
        supplier_id,
        business_profiles (
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

      supplier = {
        supplierId: supplierRow.supplier_id,
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
        moq: productRow.moq,
        description: productRow.description,
      };
    }
  }

  if (entryMode === "reuse-rfq" && rfqId) {
    const buyerId = await getCurrentBuyerId();

    if (!buyerId) {
      throw new Error("Buyer profile not found.");
    }

    const { data: rfqRow, error: rfqError } = await supabase
      .from("rfqs")
      .select(
        `
        rfq_id,
        buyer_id,
        category_id,
        product_name,
        quantity,
        unit,
        specifications,
        target_price_per_unit,
        preferred_delivery_date,
        delivery_location,
        deadline
      `
      )
      .eq("rfq_id", rfqId)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (rfqError) {
      console.error("Error fetching reusable RFQ:", rfqError);
      throw new Error("Failed to fetch RFQ.");
    }

    if (rfqRow) {
      reusedRfq = {
        rfqId: rfqRow.rfq_id,
        categoryId: rfqRow.category_id,
        productName: rfqRow.product_name,
        quantity: rfqRow.quantity,
        unit: rfqRow.unit,
        specifications: rfqRow.specifications,
        targetPricePerUnit:
          rfqRow.target_price_per_unit != null
            ? String(rfqRow.target_price_per_unit)
            : "",
        preferredDeliveryDate: rfqRow.preferred_delivery_date ?? "",
        deliveryLocation: rfqRow.delivery_location ?? "",
        deadline: rfqRow.deadline,
      };
    }
  }

  if (!supplier) {
    redirect("/buyer/rfqs");
  }

  let initialValues: RFQFormPrefillData["initialValues"];

  if (entryMode === "product-request") {
    if (!product) {
      redirect("/buyer/rfqs");
    }

    initialValues = {
      supplierId: String(supplier.supplierId),
      categoryId: String(product.categoryId),
      productId: String(product.productId),
      productName: product.productName,
      quantity: String(product.moq),
      unit: product.unit,
      targetPricePerUnit: "",
      preferredDeliveryDate: "",
      deliveryLocation: "",
      notes: product.description ?? "",
      deadline: "",
    };
  } else {
    if (!reusedRfq) {
      redirect("/buyer/rfqs");
    }

    initialValues = {
      supplierId: String(supplier.supplierId),
      categoryId: String(reusedRfq.categoryId),
      productId: "",
      productName: reusedRfq.productName,
      quantity: String(reusedRfq.quantity),
      unit: reusedRfq.unit,
      targetPricePerUnit: reusedRfq.targetPricePerUnit,
      preferredDeliveryDate: reusedRfq.preferredDeliveryDate,
      deliveryLocation: reusedRfq.deliveryLocation,
      notes: reusedRfq.specifications ?? "",
      deadline: reusedRfq.deadline,
    };
  }

  return {
    entryMode,
    supplier,
    product,
    reusedRfq,
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
  const categoryId = Number(formData.get("categoryId")?.toString() ?? "");
  const productId = Number(formData.get("productId")?.toString() ?? "");
  const productName = formData.get("productName")?.toString().trim() ?? "";
  const quantity = Number(formData.get("quantity")?.toString() ?? "");
  const unit = formData.get("unit")?.toString().trim() ?? "";
  const targetPricePerUnit = formData.get("targetPricePerUnit")?.toString().trim() ?? "";
  const preferredDeliveryDate = formData.get("preferredDeliveryDate")?.toString() ?? "";
  const deliveryLocation = formData.get("deliveryLocation")?.toString().trim() ?? "";
  const specifications = formData.get("notes")?.toString().trim() ?? "";
  const deadline = formData.get("deadline")?.toString() ?? "";

  if (!supplierId) {
    throw new Error("Supplier is required.");
  }

  if (!productId && !formData.get("reuseRfqId")) {
    redirect("/buyer/rfqs");
  }

  if (!categoryId) {
    throw new Error("Category is required.");
  }

  if (!productName) {
    throw new Error("Product name is required.");
  }

  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  if (!unit) {
    throw new Error("Unit is required.");
  }

  if (!targetPricePerUnit || Number(targetPricePerUnit) <= 0) {
    throw new Error("Target price per unit is required.");
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

  const { data: insertedRfq, error: rfqError } = await supabase
    .from("rfqs")
    .insert({
      buyer_id: buyerId,
      category_id: categoryId,
      product_name: productName,
      quantity,
      unit,
      specifications: specifications || null,
      target_price_per_unit: Number(targetPricePerUnit),
      preferred_delivery_date: preferredDeliveryDate,
      delivery_location: deliveryLocation,
      deadline,
      status: "open",
      visibility: "restricted",
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
