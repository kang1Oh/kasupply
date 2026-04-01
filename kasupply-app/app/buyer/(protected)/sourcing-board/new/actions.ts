"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const [categories, buyerContext] = await Promise.all([
    getProductCategories(),
    getCurrentBuyerContext(),
  ]);

  return {
    categories,
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
  const deadline = formData.get("deadline")?.toString().trim() ?? "";
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

  if (!deadline) {
    throw new Error("Request deadline is required.");
  }

  if (deadline > needBy) {
    throw new Error("Request deadline must be on or before the need-by date.");
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
    deadline,
    targetPricePerUnit,
    preferredDeliveryDate: needBy,
    deliveryLocation,
  });

  revalidatePath("/buyer/sourcing-board");
  revalidatePath("/buyer/rfqs");
  redirect(`/buyer/sourcing-board/${result.rfqId}`);
}
