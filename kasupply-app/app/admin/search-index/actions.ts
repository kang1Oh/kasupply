"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  backfillSupplierSearchIndexBatch,
  syncSupplierSearchIndexForSupplier,
} from "@/lib/search";

function toPositiveInteger(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function buildRedirectHref(message: string, tone: "success" | "warning" | "error") {
  const query = new URLSearchParams({
    message,
    tone,
  });

  return `/admin/search-index?${query.toString()}`;
}

export async function runSupplierSearchBackfill(formData: FormData) {
  await requireAdminUser();

  const limit = toPositiveInteger(formData.get("limit"), 5);
  const includeIndexed = String(formData.get("includeIndexed") ?? "") === "true";

  try {
    const result = await backfillSupplierSearchIndexBatch({
      limit,
      includeIndexed,
    });

    revalidatePath("/admin/search-index");
    revalidatePath("/buyer/search");

    const message =
      result.attemptedSuppliers === 0
        ? "No suppliers are waiting for indexing."
        : `Indexed ${result.indexedSuppliers} supplier${
            result.indexedSuppliers === 1 ? "" : "s"
          }. ${result.failedSuppliers} failed.`;

    redirect(
      buildRedirectHref(
        message,
        result.failedSuppliers > 0 ? "warning" : "success"
      )
    );
  } catch (error) {
    redirect(
      buildRedirectHref(
        error instanceof Error ? error.message : "Failed to run search index backfill.",
        "error"
      )
    );
  }
}

export async function reindexSingleSupplierSearchProfile(formData: FormData) {
  await requireAdminUser();

  const supplierId = toPositiveInteger(formData.get("supplierId"), 0);

  if (!supplierId) {
    redirect(buildRedirectHref("A valid supplier ID is required.", "error"));
  }

  try {
    const result = await syncSupplierSearchIndexForSupplier(supplierId);

    revalidatePath("/admin/search-index");
    revalidatePath("/buyer/search");

    redirect(
      buildRedirectHref(
        `Supplier #${supplierId} reindexed successfully with ${result.documentsIndexed} documents.`,
        "success"
      )
    );
  } catch (error) {
    redirect(
      buildRedirectHref(
        error instanceof Error ? error.message : `Failed to reindex supplier #${supplierId}.`,
        "error"
      )
    );
  }
}
