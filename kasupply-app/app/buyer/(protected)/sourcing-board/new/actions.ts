"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPublicSourcingRequest,
  getProductCategories,
} from "@/lib/buyer/rfq-workflows";

export async function getSourcingRequestFormData() {
  const categories = await getProductCategories();

  return {
    categories,
  };
}

export async function createSourcingRequest(formData: FormData) {
  const categoryId = Number(formData.get("categoryId")?.toString() ?? "");
  const productName = formData.get("productName")?.toString().trim() ?? "";
  const quantity = Number(formData.get("quantity")?.toString() ?? "");
  const unit = formData.get("unit")?.toString().trim() ?? "";
  const specifications =
    formData.get("specifications")?.toString().trim() ?? "";
  const deadline = formData.get("deadline")?.toString().trim() ?? "";
  const targetPriceRaw = formData.get("targetPricePerUnit")?.toString().trim() ?? "";
  const preferredDeliveryDate =
    formData.get("preferredDeliveryDate")?.toString().trim() ?? "";
  const deliveryLocation =
    formData.get("deliveryLocation")?.toString().trim() ?? "";

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

  if (!deadline) {
    throw new Error("Deadline is required.");
  }

  const targetPricePerUnit =
    targetPriceRaw === "" ? null : Number(targetPriceRaw);

  if (
    targetPricePerUnit !== null &&
    (!Number.isFinite(targetPricePerUnit) || targetPricePerUnit < 0)
  ) {
    throw new Error("Target price must be a valid positive number.");
  }

  const result = await createPublicSourcingRequest({
    categoryId,
    productName,
    quantity,
    unit,
    specifications: specifications || null,
    deadline,
    targetPricePerUnit,
    preferredDeliveryDate: preferredDeliveryDate || null,
    deliveryLocation: deliveryLocation || null,
  });

  revalidatePath("/buyer/sourcing-board");
  revalidatePath("/buyer/rfqs");
  redirect(`/buyer/sourcing-board/${result.rfqId}`);
}
