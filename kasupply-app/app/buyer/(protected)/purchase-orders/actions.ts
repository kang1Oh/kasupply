"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";
import {
  PURCHASE_ORDER_RECEIPTS_BUCKET,
  buildPurchaseOrderReceiptPath,
  isPurchaseOrderPaymentMethod,
  normalizePurchaseOrderPaymentMethod,
} from "@/lib/purchase-orders/constants";
import {
  getCurrentBuyerReceiptUploadInfo,
  getBuyerPurchaseOrderDetail,
  getPurchaseOrderCreationDraft,
} from "./data";

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function uploadReceiptWithUserSession(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  adminSupabase: ReturnType<typeof createAdminClient>;
  path: string;
  file: File;
}) {
  const { supabase, adminSupabase, path, file } = params;

  if (adminSupabase) {
    return adminSupabase.storage.from(PURCHASE_ORDER_RECEIPTS_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!supabaseUrl || !anonKey || !session?.access_token) {
    return supabase.storage.from(PURCHASE_ORDER_RECEIPTS_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
  }

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/${PURCHASE_ORDER_RECEIPTS_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        "x-upsert": "false",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    },
  );

  if (uploadResponse.ok) {
    return { error: null };
  }

  let errorMessage = "Failed to upload receipt.";

  try {
    const errorPayload = (await uploadResponse.json()) as {
      message?: string;
      error?: string;
    };
    errorMessage =
      errorPayload.message || errorPayload.error || errorMessage;
  } catch {
    // Ignore JSON parsing failures and keep the generic message.
  }

  return {
    error: {
      message: errorMessage,
    },
  };
}

function buildBuyerPurchaseOrderHref(
  poId: number,
  params: Record<string, string | null | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/buyer/purchase-orders/${poId}?${query}` : `/buyer/purchase-orders/${poId}`;
}

function buildBuyerPurchaseOrderReviewHref(
  poId: number,
  params: Record<string, string | null | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query
    ? `/buyer/purchase-orders/${poId}/review?${query}`
    : `/buyer/purchase-orders/${poId}/review`;
}

function redirectReceiptError(
  poId: number,
  message: string,
  step?: string | null,
): never {
  redirect(buildBuyerPurchaseOrderHref(poId, { receiptError: message, step }));
}

function revalidatePurchaseOrderPaths(params: {
  poId: number;
  rfqId: number | null;
}) {
  revalidatePath("/buyer/purchase-orders");
  revalidatePath(`/buyer/purchase-orders/${params.poId}`);
  revalidatePath("/supplier/purchase-orders");
  revalidatePath(`/supplier/purchase-orders/${params.poId}`);

  if (params.rfqId) {
    revalidatePath(`/buyer/rfqs/${params.rfqId}`);
    revalidatePath(`/buyer/sourcing-board/${params.rfqId}`);
  }
}

function isMissingSupplierReviewsTableError(message: string | null | undefined) {
  const normalizedMessage = String(message ?? "").toLowerCase();

  if (!normalizedMessage.includes("supplier_reviews")) {
    return false;
  }

  return (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("could not find the table")
  );
}

async function getPurchaseOrderRfqId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: number,
) {
  const { data: quotation } = await supabase
    .from("quotations")
    .select("engagement_id")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (!quotation?.engagement_id) {
    return null;
  }

  const { data: engagement } = await supabase
    .from("rfq_engagements")
    .select("rfq_id")
    .eq("engagement_id", quotation.engagement_id)
    .maybeSingle();

  return engagement?.rfq_id ?? null;
}

export async function createPurchaseOrder(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const rfqId = Number(formData.get("rfqId")?.toString() ?? "");
  const quoteId = Number(formData.get("quoteId")?.toString() ?? "");
  const paymentMethod = String(formData.get("paymentMethod") || "").trim();
  const normalizedPaymentMethod = normalizePurchaseOrderPaymentMethod(paymentMethod);
  const termsAndConditions = String(formData.get("termsAndConditions") || "").trim();
  const additionalNotes = String(formData.get("additionalNotes") || "").trim();

  if (!rfqId || Number.isNaN(rfqId) || !quoteId || Number.isNaN(quoteId)) {
    throw new Error("Missing RFQ or quotation reference.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }

  if (!normalizedPaymentMethod || !isPurchaseOrderPaymentMethod(normalizedPaymentMethod)) {
    throw new Error("Select a valid payment method.");
  }

  const draft = await getPurchaseOrderCreationDraft(rfqId, quoteId);

  if (!draft) {
    throw new Error("Accepted quotation not found for this RFQ.");
  }

  if (draft.existingPurchaseOrderId) {
    redirect(`/buyer/purchase-orders/${draft.existingPurchaseOrderId}`);
  }

  const { data: insertedOrder, error: insertError } = await databaseClient
    .from("purchase_orders")
    .insert({
      quote_id: quoteId,
      buyer_id: buyerContext.buyerId,
      supplier_id: draft.supplierId,
      product_id: draft.productId,
      quantity: draft.quantity,
      total_amount: draft.totalAmount,
      status: "confirmed",
      payment_method: normalizedPaymentMethod,
      terms_and_conditions: termsAndConditions || null,
      additional_notes: additionalNotes || null,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("po_id")
    .single();

  if (insertError || !insertedOrder) {
    if (
      !adminSupabase &&
      /row-level security policy/i.test(insertError?.message ?? "")
    ) {
      throw new Error(
        "Purchase order creation is blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or run sql/purchase_order_policies.sql in your Supabase SQL editor.",
      );
    }

    throw new Error(insertError?.message || "Failed to create purchase order.");
  }

  const { error: closeRfqError } = await supabase
    .from("rfqs")
    .update({ status: "closed" })
    .eq("rfq_id", rfqId)
    .eq("buyer_id", buyerContext.buyerId);

  if (closeRfqError) {
    throw new Error(closeRfqError.message || "Failed to close RFQ after purchase order.");
  }

  revalidatePurchaseOrderPaths({
    poId: insertedOrder.po_id,
    rfqId,
  });

  redirect(`/buyer/purchase-orders/${insertedOrder.po_id}`);
}

export async function uploadPurchaseOrderReceipt(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  const poId = Number(formData.get("poId")?.toString() ?? "");
  const receiptFile = formData.get("receiptFile") as File | null;
  const redirectStep = String(formData.get("redirectStep") || "").trim() || null;

  if (!poId || Number.isNaN(poId)) {
    redirect("/buyer/purchase-orders");
  }

  if (!receiptFile || receiptFile.size === 0) {
    redirectReceiptError(poId, "Receipt file is required.", redirectStep);
  }

  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);

  if (!allowedTypes.has(receiptFile.type)) {
    redirectReceiptError(
      poId,
      "Please upload a PDF, JPG, JPEG, PNG, or WEBP receipt file.",
      redirectStep,
    );
  }

  if (receiptFile.size > 10 * 1024 * 1024) {
    redirectReceiptError(poId, "The receipt file must be 10MB or smaller.", redirectStep);
  }

  const uploadInfo = await getCurrentBuyerReceiptUploadInfo(poId);

  if (!uploadInfo) {
    redirectReceiptError(poId, "Purchase order not found.", redirectStep);
  }

  if (uploadInfo.status === "completed" || uploadInfo.status === "cancelled") {
    redirectReceiptError(
      poId,
      "This purchase order can no longer accept a receipt upload.",
      redirectStep,
    );
  }

  if (uploadInfo.status !== "shipped") {
    redirectReceiptError(
      poId,
      "Receipt upload becomes available after the supplier marks the order as shipped.",
      redirectStep,
    );
  }

  if (
    uploadInfo.existingReceiptFilePath &&
    !["rejected", "not_uploaded"].includes(uploadInfo.receiptStatus)
  ) {
    redirectReceiptError(
      poId,
      "This receipt is already waiting for supplier review.",
      redirectStep,
    );
  }

  const nextReceiptPath = buildPurchaseOrderReceiptPath(
    poId,
    receiptFile.name,
    authUser.id,
  );

  const { error: uploadError } = await uploadReceiptWithUserSession({
    supabase,
    adminSupabase,
    path: nextReceiptPath,
    file: receiptFile,
  });

  if (uploadError) {
    if (/row-level security policy/i.test(uploadError.message || "")) {
      redirectReceiptError(
        poId,
        "Receipt file upload is blocked by the purchase-order-receipts storage policy. Run purchase-order-receipts-storage-policy.sql in Supabase SQL editor or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        redirectStep,
      );
    }

    redirectReceiptError(
      poId,
      uploadError.message ||
        "Failed to upload receipt. Configure a service-role key or update the bucket RLS policy for buyer uploads.",
      redirectStep,
    );
  }

  const { data: updatedOrder, error: updateError } = await databaseClient
    .from("purchase_orders")
    .update({
      status: "completed",
      receipt_file_url: nextReceiptPath,
      receipt_status: "pending_review",
      receipt_review_notes: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("buyer_id", uploadInfo.buyerId)
    .select("po_id, quote_id")
    .single();

  if (updateError || !updatedOrder) {
    await (adminSupabase ?? supabase).storage
      .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
      .remove([nextReceiptPath]);
    if (
      !adminSupabase &&
      /row-level security policy/i.test(updateError?.message ?? "")
    ) {
      redirectReceiptError(
        poId,
        "Buyer receipt upload is blocked by the purchase_orders UPDATE policy. Update the Supabase RLS policy for buyer receipt uploads or add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        redirectStep,
      );
    }

    redirectReceiptError(
      poId,
      updateError?.message || "Failed to attach receipt to this order.",
      redirectStep,
    );
  }

  if (
    uploadInfo.existingReceiptFilePath &&
    uploadInfo.existingReceiptFilePath !== nextReceiptPath
  ) {
    await (adminSupabase ?? supabase).storage
      .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
      .remove([uploadInfo.existingReceiptFilePath]);
  }

  const rfqId = updatedOrder.quote_id
    ? await getPurchaseOrderRfqId(supabase, updatedOrder.quote_id)
    : null;

  revalidatePurchaseOrderPaths({
    poId,
    rfqId,
  });

  redirect(buildBuyerPurchaseOrderHref(poId, { step: redirectStep }));
}

export async function cancelPurchaseOrder(formData: FormData) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const poId = Number(formData.get("poId")?.toString() ?? "");

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("po_id, quote_id, status")
    .eq("po_id", poId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Purchase order not found.");
  }

  const currentStatus = String(order.status || "").trim().toLowerCase();

  if (!["confirmed", "processing"].includes(currentStatus)) {
    throw new Error("Only confirmed or processing purchase orders can be cancelled.");
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("po_id", poId)
    .eq("buyer_id", buyerContext.buyerId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to cancel purchase order.");
  }

  const rfqId = order.quote_id
    ? await getPurchaseOrderRfqId(supabase, order.quote_id)
    : null;

  revalidatePurchaseOrderPaths({
    poId,
    rfqId,
  });

  redirect(`/buyer/purchase-orders/${poId}`);
}

export async function submitPurchaseOrderReview(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const databaseClient = adminSupabase ?? supabase;
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const poId = Number(formData.get("poId")?.toString() ?? "");

  if (!poId || Number.isNaN(poId)) {
    throw new Error("Invalid purchase order.");
  }

  const overallRating = Number(formData.get("overallRating")?.toString() ?? "");
  const productQualityRating = Number(formData.get("productQualityRating")?.toString() ?? "");
  const deliveryRating = Number(formData.get("deliveryRating")?.toString() ?? "");
  const communicationRating = Number(formData.get("communicationRating")?.toString() ?? "");
  const valueForMoneyRating = Number(formData.get("valueForMoneyRating")?.toString() ?? "");
  const reviewText = String(formData.get("reviewText") || "").trim();

  if (!Number.isInteger(overallRating) || overallRating < 1 || overallRating > 5) {
    throw new Error("Overall rating is required.");
  }

  const normalizeOptionalRating = (value: number) =>
    Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;

  const order = await getBuyerPurchaseOrderDetail(poId);

  if (!order || order.supplierId == null) {
    throw new Error("Purchase order not found.");
  }

  if (order.status !== "completed") {
    throw new Error("Only completed orders can be reviewed.");
  }

  if (!order.receiptFilePath) {
    throw new Error("You can only review orders with a completed receipt upload.");
  }

  const timestamp = new Date().toISOString();

  const { error: upsertError } = await databaseClient
    .from("supplier_reviews")
    .upsert(
      {
        purchase_order_id: poId,
        supplier_id: order.supplierId,
        buyer_id: buyerContext.buyerId,
        overall_rating: overallRating,
        product_quality_rating: normalizeOptionalRating(productQualityRating),
        delivery_rating: normalizeOptionalRating(deliveryRating),
        communication_rating: normalizeOptionalRating(communicationRating),
        value_for_money_rating: normalizeOptionalRating(valueForMoneyRating),
        review_text: reviewText || null,
        updated_at: timestamp,
      },
      {
        onConflict: "purchase_order_id,buyer_id",
      },
    );

  if (upsertError) {
    if (isMissingSupplierReviewsTableError(upsertError.message)) {
      redirect(
        buildBuyerPurchaseOrderReviewHref(poId, {
          error:
            "Supplier reviews are not available yet because Supabase has not refreshed the supplier_reviews table. Refresh your local Supabase instance or rerun sql/supplier_reviews_schema.sql, then try again.",
        }),
      );
    }

    if (!adminSupabase && /row-level security policy/i.test(upsertError.message ?? "")) {
      redirect(
        buildBuyerPurchaseOrderReviewHref(poId, {
          error:
            "Review submission is blocked by Supabase RLS. Run sql/supplier_reviews_schema.sql or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        }),
      );
    }

    redirect(
      buildBuyerPurchaseOrderReviewHref(poId, {
        error: upsertError.message || "Failed to submit review.",
      }),
    );
  }

  revalidatePath(`/buyer/purchase-orders/${poId}`);
  revalidatePath(`/buyer/purchase-orders/${poId}/review`);
  revalidatePath("/buyer/purchase-orders");
  revalidatePath(`/buyer/search/${order.supplierId}`);
  revalidatePath(`/buyer/suppliers/${order.supplierId}`);

  redirect(`/buyer/purchase-orders/${poId}/review?submitted=1`);
}
