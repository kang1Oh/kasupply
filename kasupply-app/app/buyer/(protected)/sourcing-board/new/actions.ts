"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createPublicSourcingRequest,
  getCurrentBuyerContext,
  getProductCategories,
} from "@/lib/buyer/rfq-workflows";

function getBusinessLocationLabel(
  profile:
    | {
        business_location?: string | null;
        city?: string | null;
        province?: string | null;
        region?: string | null;
      }
    | null
) {
  if (!profile) {
    return "";
  }

  return (
    profile.business_location?.trim() ||
    [profile.city, profile.province, profile.region]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(", ")
  );
}

export async function getSourcingRequestFormData() {
  const supabase = await createClient();
  const [categories, buyerContext, productUnitsResult] = await Promise.all([
    getProductCategories(),
    getCurrentBuyerContext(),
    supabase
      .from("products")
      .select("unit")
      .not("unit", "is", null),
  ]);

  if (productUnitsResult.error) {
    throw new Error(productUnitsResult.error.message || "Failed to load unit options.");
  }

  const units = Array.from(
    new Set(
      (productUnitsResult.data ?? [])
        .map((row) => String(row.unit ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    categories,
    units:
      units.length > 0
        ? units
        : ["bag", "bottle", "box", "g", "kg", "liter", "pack", "pcs"],
    defaultDeliveryLocation: getBusinessLocationLabel(buyerContext?.businessProfile ?? null),
  };
}

export async function createSourcingRequest(formData: FormData) {
  const requestedProductName =
    formData.get("requestedProductName")?.toString().trim() ?? "";
  const categoryId = Number(formData.get("categoryId")?.toString() ?? "");
  const quantity = Number(formData.get("quantity")?.toString() ?? "");
  const unit = formData.get("unit")?.toString().trim() ?? "";
  const specifications =
    formData.get("specifications")?.toString().trim() ?? "";
  const needBy = formData.get("needBy")?.toString().trim() ?? "";
  const targetPriceRaw = formData.get("targetPricePerUnit")?.toString().trim() ?? "";
  const deliveryLocation =
    formData.get("deliveryLocation")?.toString().trim() ?? "";

  if (!requestedProductName) {
    throw new Error("Request title is required.");
  }

  if (!categoryId) {
    throw new Error("Category is required.");
  }

  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  if (!unit) {
    throw new Error("Unit is required.");
  }

  if (!needBy) {
    throw new Error("Need-by date is required.");
  }

  const targetPricePerUnit =
    targetPriceRaw === "" ? null : Number(targetPriceRaw);

  if (targetPricePerUnit === null || !Number.isFinite(targetPricePerUnit) || targetPricePerUnit <= 0) {
    throw new Error("Target price must be a valid positive number.");
  }

  if (!deliveryLocation) {
    throw new Error("Delivery location is required.");
  }

  const result = await createPublicSourcingRequest({
    categoryId,
    requestedProductName,
    quantity,
    unit,
    specifications: specifications || null,
    deadline: needBy,
    targetPricePerUnit,
    preferredDeliveryDate: needBy,
    deliveryLocation,
  });

  revalidatePath("/buyer/sourcing-board");
  revalidatePath("/buyer/rfqs");
  redirect(`/buyer/sourcing-board/${result.rfqId}`);
}
