import { createClient } from "@/lib/supabase/server";
import { getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";
import {
  PURCHASE_ORDER_RECEIPTS_BUCKET,
  formatPurchaseOrderNumber,
  getPurchaseOrderPaymentMethodLabel,
  normalizePurchaseOrderReceiptStatus,
  normalizePurchaseOrderStatus,
} from "@/lib/purchase-orders/constants";

type RawRecord = Record<string, unknown>;

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number | null;
  verified_badge?: boolean | null;
};

type BusinessProfileRow = {
  profile_id?: number;
  user_id?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  business_location?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  contact_number?: string | null;
};

type UserRow = {
  user_id?: string;
  name?: string | null;
  email?: string | null;
};

type ProductRow = {
  product_id?: number;
  product_name?: string | null;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  supplier_id: number;
  price_per_unit: number | null;
  quantity: number | null;
  lead_time: string | null;
  notes: string | null;
};

type EngagementRow = {
  engagement_id: number;
  rfq_id: number | null;
  supplier_id: number;
};

type RfqRow = {
  rfq_id: number;
  product_id: number | null;
  unit: string | null;
  specifications: string | null;
  preferred_delivery_date: string | null;
  delivery_location: string | null;
  deadline: string | null;
  products?: ProductRow | ProductRow[] | null;
};

type ConversationRow = {
  conversation_id: number;
  supplier_id: number;
  buyer_id: number | null;
  engagement_id: number | null;
};

type PartyInfo = {
  businessName: string;
  businessType: string | null;
  verifiedBadge: boolean;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  location: string;
};

export type BuyerPurchaseOrderView = {
  poId: number;
  poNumber: string;
  supplierId: number | null;
  productName: string;
  quantityLabel: string;
  quantityValue: number | null;
  unit: string | null;
  pricePerUnit: number | null;
  subtotal: number | null;
  deliveryFee: number | null;
  totalAmount: number | null;
  status: string;
  paymentMethod: string | null;
  termsAndConditions: string | null;
  additionalNotes: string | null;
  receiptFilePath: string | null;
  receiptFileUrl: string | null;
  receiptStatus: string;
  receiptReviewNotes: string | null;
  createdAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  quoteId: number | null;
  engagementId: number | null;
  rfqId: number | null;
  leadTime: string | null;
  quotationNotes: string | null;
  specifications: string | null;
  deliveryLocation: string | null;
  preferredDeliveryDate: string | null;
  deadline: string | null;
  supplierInfo: PartyInfo | null;
  conversationId: number | null;
};

export type PurchaseOrderCreationDraft = {
  rfqId: number;
  quoteId: number;
  supplierId: number;
  productId: number;
  supplierName: string;
  productName: string;
  specifications: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  leadTime: string | null;
  quotationNotes: string | null;
  deliveryLocation: string | null;
  preferredDeliveryDate: string | null;
  existingPurchaseOrderId: number | null;
};

export type BuyerPurchaseOrderReview = {
  reviewId: number;
  overallRating: number;
  productQualityRating: number | null;
  deliveryRating: number | null;
  communicationRating: number | null;
  valueForMoneyRating: number | null;
  reviewText: string | null;
  createdAt: string | null;
};

export type BuyerPurchaseOrderReviewDraft = {
  order: BuyerPurchaseOrderView;
  existingReview: BuyerPurchaseOrderReview | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFirstString(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function readFirstNumber(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
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

function formatQuantityValue(quantity: number | null, unit: string | null) {
  if (quantity === null && !unit) return "Not specified";
  if (quantity !== null && unit) return `${quantity} ${unit}`;
  if (quantity !== null) return String(quantity);
  return unit ?? "Not specified";
}

function formatLocation(profile: BusinessProfileRow | null) {
  if (!profile) return "Location not available";

  const parts = [
    profile.business_location,
    profile.city,
    profile.province,
    profile.region,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return parts.length > 0 ? parts.join(", ") : "Location not available";
}

function getRfqProductName(rfq: RfqRow | null) {
  if (!rfq) {
    return null;
  }

  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name ?? null;
}

function buildPartyInfo(
  supplierProfile: SupplierProfileRow | null,
  businessProfile: BusinessProfileRow | null,
  user: UserRow | null,
  fallbackBusinessName: string,
): PartyInfo {
  return {
    businessName: businessProfile?.business_name ?? fallbackBusinessName,
    businessType: businessProfile?.business_type ?? null,
    verifiedBadge: Boolean(supplierProfile?.verified_badge),
    contactName: user?.name ?? null,
    phone: businessProfile?.contact_number ?? null,
    email: user?.email ?? null,
    location: formatLocation(businessProfile),
  };
}

async function resolveReceiptUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  receiptFilePath: string | null,
) {
  if (!receiptFilePath) {
    return null;
  }

  if (/^https?:\/\//i.test(receiptFilePath)) {
    return receiptFilePath;
  }

  const { data, error } = await supabase.storage
    .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
    .createSignedUrl(receiptFilePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return receiptFilePath;
  }

  return data.signedUrl;
}

async function getSupplierInfoMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierIds: number[],
) {
  const supplierInfoMap = new Map<number, PartyInfo>();

  if (supplierIds.length === 0) {
    return supplierInfoMap;
  }

  const { data: supplierProfiles, error: supplierProfilesError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id, verified_badge")
    .in("supplier_id", supplierIds);

  if (supplierProfilesError) {
    throw new Error(supplierProfilesError.message || "Failed to load supplier profiles.");
  }

  const safeSupplierProfiles = (supplierProfiles as SupplierProfileRow[] | null) ?? [];
  const profileIds = Array.from(
    new Set(
      safeSupplierProfiles
        .map((row) => row.profile_id)
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  const businessProfileMap = new Map<number, BusinessProfileRow>();
  const userMap = new Map<string, UserRow>();

  if (profileIds.length > 0) {
    const { data: businessProfiles, error: businessProfilesError } = await supabase
      .from("business_profiles")
      .select(
        "profile_id, user_id, business_name, business_location, city, province, region, contact_number",
      )
      .in("profile_id", profileIds);

    if (businessProfilesError) {
      throw new Error(
        businessProfilesError.message || "Failed to load supplier business profiles.",
      );
    }

    for (const profile of (businessProfiles as BusinessProfileRow[] | null) ?? []) {
      if (profile.profile_id != null) {
        businessProfileMap.set(profile.profile_id, profile);
      }
    }

    const userIds = Array.from(
      new Set(
        ((businessProfiles as BusinessProfileRow[] | null) ?? [])
          .map((row) => row.user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (usersError) {
        throw new Error(usersError.message || "Failed to load supplier contacts.");
      }

      for (const user of (users as UserRow[] | null) ?? []) {
        if (user.user_id) {
          userMap.set(user.user_id, user);
        }
      }
    }
  }

  for (const supplierProfile of safeSupplierProfiles) {
    const businessProfile =
      supplierProfile.profile_id != null
        ? businessProfileMap.get(supplierProfile.profile_id) ?? null
        : null;
    const user =
      businessProfile?.user_id != null
        ? userMap.get(businessProfile.user_id) ?? null
        : null;

    supplierInfoMap.set(
      supplierProfile.supplier_id,
      buildPartyInfo(
        supplierProfile,
        businessProfile,
        user,
        `Supplier #${supplierProfile.supplier_id}`,
      ),
    );
  }

  return supplierInfoMap;
}

async function buildBuyerPurchaseOrderViews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerId: number,
  rows: RawRecord[],
) {
  const quoteIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["quote_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const productIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["product_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const quotationMap = new Map<number, QuotationRow>();
  const engagementMap = new Map<number, EngagementRow>();
  const rfqMap = new Map<number, RfqRow>();
  const productNameMap = new Map<number, string>();
  const conversationMap = new Map<string, number>();

  if (quoteIds.length > 0) {
    const { data: quotations, error: quotationsError } = await supabase
      .from("quotations")
      .select("quote_id, engagement_id, supplier_id, price_per_unit, quantity, lead_time, notes")
      .in("quote_id", quoteIds);

    if (quotationsError) {
      throw new Error(quotationsError.message || "Failed to load quotations.");
    }

    for (const quotation of (quotations as QuotationRow[] | null) ?? []) {
      quotationMap.set(quotation.quote_id, quotation);
    }
  }

  const engagementIds = Array.from(
    new Set(
      Array.from(quotationMap.values())
        .map((quotation) => quotation.engagement_id)
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  if (engagementIds.length > 0) {
    const { data: engagements, error: engagementsError } = await supabase
      .from("rfq_engagements")
      .select("engagement_id, rfq_id, supplier_id")
      .in("engagement_id", engagementIds);

    if (engagementsError) {
      throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
    }

    for (const engagement of (engagements as EngagementRow[] | null) ?? []) {
      engagementMap.set(engagement.engagement_id, engagement);
    }
  }

  const rfqIds = Array.from(
    new Set(
      Array.from(engagementMap.values())
        .map((engagement) => engagement.rfq_id)
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  if (rfqIds.length > 0) {
    const { data: rfqs, error: rfqsError } = await supabase
      .from("rfqs")
      .select(
        `
        rfq_id,
        product_id,
        unit,
        specifications,
        preferred_delivery_date,
        delivery_location,
        deadline,
        products!rfqs_product_id_fkey (
          product_id,
          product_name
        )
        `,
      )
      .in("rfq_id", rfqIds);

    if (rfqsError) {
      throw new Error(rfqsError.message || "Failed to load RFQ details.");
    }

    for (const rfq of (rfqs as RfqRow[] | null) ?? []) {
      rfqMap.set(rfq.rfq_id, rfq);
    }
  }

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("product_id, product_name")
      .in("product_id", productIds);

    if (productsError) {
      throw new Error(productsError.message || "Failed to load linked products.");
    }

    for (const product of (products as ProductRow[] | null) ?? []) {
      if (product.product_id != null && product.product_name) {
        productNameMap.set(product.product_id, product.product_name);
      }
    }
  }

  const supplierIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["supplier_id"]))
        .concat(
          Array.from(quotationMap.values())
            .map((quotation) => quotation.supplier_id)
            .filter((value): value is number => typeof value === "number"),
        )
        .filter((value): value is number => value !== null),
    ),
  );

  const supplierInfoMap = await getSupplierInfoMap(supabase, supplierIds);

  if (supplierIds.length > 0) {
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("conversation_id, supplier_id, buyer_id, engagement_id")
      .eq("buyer_id", buyerId)
      .in("supplier_id", supplierIds);

    if (conversationsError) {
      throw new Error(conversationsError.message || "Failed to load conversations.");
    }

    for (const conversation of (conversations as ConversationRow[] | null) ?? []) {
      const key = [
        conversation.supplier_id,
        conversation.buyer_id ?? 0,
        conversation.engagement_id ?? 0,
      ].join(":");

      conversationMap.set(key, conversation.conversation_id);
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const poId = readFirstNumber(row, ["po_id"]) ?? 0;
      const quoteId = readFirstNumber(row, ["quote_id"]);
      const productId = readFirstNumber(row, ["product_id"]);
      const supplierId =
        readFirstNumber(row, ["supplier_id"]) ??
        (quoteId !== null ? quotationMap.get(quoteId)?.supplier_id ?? null : null);
      const quotation = quoteId !== null ? quotationMap.get(quoteId) ?? null : null;
      const engagement =
        quotation?.engagement_id != null
          ? engagementMap.get(quotation.engagement_id) ?? null
          : null;
      const rfq =
        engagement?.rfq_id != null ? rfqMap.get(engagement.rfq_id) ?? null : null;

      const quantityValue =
        readFirstNumber(row, ["quantity"]) ?? quotation?.quantity ?? null;
      const unit = rfq?.unit ?? null;
      const pricePerUnit =
        quotation?.price_per_unit == null ? null : Number(quotation.price_per_unit);
      const subtotal =
        quantityValue !== null && pricePerUnit !== null
          ? quantityValue * pricePerUnit
          : null;
      const receiptFilePath = readFirstString(row, [
        "receipt_file_url",
        "proof_of_payment_url",
        "payment_proof_url",
      ]);
      const receiptFileUrl = await resolveReceiptUrl(supabase, receiptFilePath);
      const deliveryFee = readFirstNumber(row, ["delivery_fee"]);
      const receiptStatus = normalizePurchaseOrderReceiptStatus(
        readFirstString(row, ["receipt_status"]),
        Boolean(receiptFilePath),
      );

      return {
        poId,
        poNumber: formatPurchaseOrderNumber(poId),
        supplierId,
        productName:
          getRfqProductName(rfq) ??
          (productId !== null ? productNameMap.get(productId) ?? `Product #${productId}` : "Unknown product"),
        quantityLabel: formatQuantityValue(quantityValue, unit),
        quantityValue,
        unit,
        pricePerUnit,
        subtotal,
        deliveryFee,
        totalAmount: readFirstNumber(row, ["total_amount"]),
        status: normalizePurchaseOrderStatus(readFirstString(row, ["status"])),
        paymentMethod: getPurchaseOrderPaymentMethodLabel(
          readFirstString(row, ["payment_method"]),
        ),
        termsAndConditions: readFirstString(row, ["terms_and_conditions"]),
        additionalNotes: readFirstString(row, ["additional_notes"]),
        receiptFilePath,
        receiptFileUrl,
        receiptStatus,
        receiptReviewNotes: readFirstString(row, ["receipt_review_notes"]),
        createdAt: readFirstString(row, ["created_at"]),
        confirmedAt: readFirstString(row, ["confirmed_at"]),
        completedAt: readFirstString(row, ["completed_at"]),
        updatedAt: readFirstString(row, ["updated_at"]),
        quoteId,
        engagementId: quotation?.engagement_id ?? null,
        rfqId: engagement?.rfq_id ?? null,
        leadTime: quotation?.lead_time ?? null,
        quotationNotes: quotation?.notes ?? null,
        specifications: rfq?.specifications ?? null,
        deliveryLocation: rfq?.delivery_location ?? null,
        preferredDeliveryDate: rfq?.preferred_delivery_date ?? null,
        deadline: rfq?.deadline ?? null,
        supplierInfo: supplierId !== null ? supplierInfoMap.get(supplierId) ?? null : null,
        conversationId:
          supplierId !== null
            ? conversationMap.get([supplierId, buyerId, quotation?.engagement_id ?? 0].join(":")) ??
              null
            : null,
      } satisfies BuyerPurchaseOrderView;
    }),
  );
}

export async function getBuyerPurchaseOrders() {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return [] as BuyerPurchaseOrderView[];
  }

  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("buyer_id", buyerContext.buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load purchase orders.");
  }

  const rows = (orders as RawRecord[] | null) ?? [];

  return buildBuyerPurchaseOrderViews(supabase, buyerContext.buyerId, rows);
}

export async function getBuyerPurchaseOrderDetail(poId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null;
  }

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("po_id", poId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load purchase order.");
  }

  if (!order) {
    return null;
  }

  const views = await buildBuyerPurchaseOrderViews(
    supabase,
    buyerContext.buyerId,
    [order as RawRecord],
  );

  return views[0] ?? null;
}

export async function getBuyerPurchaseOrderReviewDraft(poId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null as BuyerPurchaseOrderReviewDraft | null;
  }

  const order = await getBuyerPurchaseOrderDetail(poId);

  if (!order) {
    return null as BuyerPurchaseOrderReviewDraft | null;
  }

  const { data: review, error } = await supabase
    .from("supplier_reviews")
    .select(
      "review_id, overall_rating, product_quality_rating, delivery_rating, communication_rating, value_for_money_rating, review_text, created_at",
    )
    .eq("purchase_order_id", poId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (error && !isMissingSupplierReviewsTableError(error.message)) {
    throw new Error(error.message || "Failed to load supplier review.");
  }

  return {
    order,
    existingReview: review
      ? {
          reviewId: review.review_id,
          overallRating: Number(review.overall_rating),
          productQualityRating: asNumber(review.product_quality_rating),
          deliveryRating: asNumber(review.delivery_rating),
          communicationRating: asNumber(review.communication_rating),
          valueForMoneyRating: asNumber(review.value_for_money_rating),
          reviewText: asString(review.review_text),
          createdAt: asString(review.created_at),
        }
      : null,
  } satisfies BuyerPurchaseOrderReviewDraft;
}

export async function getPurchaseOrderCreationDraft(rfqId: number, quoteId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null as PurchaseOrderCreationDraft | null;
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select(
      `
      rfq_id,
      buyer_id,
      product_id,
      unit,
      specifications,
      preferred_delivery_date,
      delivery_location,
      deadline,
      products!rfqs_product_id_fkey (
        product_id,
        product_name
      )
      `,
    )
    .eq("rfq_id", rfqId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (rfqError) {
    throw new Error(rfqError.message || "Failed to load RFQ details.");
  }

  if (!rfq) {
    return null as PurchaseOrderCreationDraft | null;
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotations")
    .select("quote_id, engagement_id, supplier_id, price_per_unit, quantity, lead_time, notes, status")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (quoteError) {
    throw new Error(quoteError.message || "Failed to load quotation.");
  }

  if (!quote) {
    return null as PurchaseOrderCreationDraft | null;
  }

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, rfq_id, supplier_id, status, final_quote_id")
    .eq("engagement_id", quote.engagement_id)
    .maybeSingle();

  if (engagementError) {
    throw new Error(engagementError.message || "Failed to load RFQ engagement.");
  }

  if (
    !engagement ||
    engagement.rfq_id !== rfqId ||
    engagement.status !== "accepted" ||
    engagement.final_quote_id !== quoteId ||
    quote.status !== "accepted"
  ) {
    return null as PurchaseOrderCreationDraft | null;
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("purchase_orders")
    .select("po_id")
    .eq("buyer_id", buyerContext.buyerId)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(existingOrderError.message || "Failed to check existing purchase orders.");
  }

  const supplierInfoMap = await getSupplierInfoMap(supabase, [quote.supplier_id]);
  const supplierInfo = supplierInfoMap.get(quote.supplier_id);
  const quantity = Number(quote.quantity);
  const pricePerUnit = Number(quote.price_per_unit);

  return {
    rfqId,
    quoteId,
    supplierId: quote.supplier_id,
    productId: rfq.product_id,
    supplierName: supplierInfo?.businessName ?? `Supplier #${quote.supplier_id}`,
    productName: getRfqProductName(rfq) ?? `Product #${rfq.product_id}`,
    specifications: rfq.specifications,
    quantity,
    unit: rfq.unit,
    pricePerUnit,
    totalAmount: quantity * pricePerUnit,
    leadTime: quote.lead_time,
    quotationNotes: quote.notes,
    deliveryLocation: rfq.delivery_location,
    preferredDeliveryDate: rfq.preferred_delivery_date,
    existingPurchaseOrderId: existingOrder?.po_id ?? null,
  } satisfies PurchaseOrderCreationDraft;
}

export async function getCurrentBuyerReceiptUploadInfo(poId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null;
  }

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("po_id, buyer_id, status, receipt_file_url, receipt_status, receipt_review_notes")
    .eq("po_id", poId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load receipt upload info.");
  }

  return order
    ? {
        poId: order.po_id,
        buyerId: buyerContext.buyerId,
        status: normalizePurchaseOrderStatus(order.status),
        existingReceiptFilePath: order.receipt_file_url,
        receiptStatus: normalizePurchaseOrderReceiptStatus(
          order.receipt_status,
          Boolean(order.receipt_file_url),
        ),
        receiptReviewNotes: order.receipt_review_notes,
      }
    : null;
}
