import { createClient } from "@/lib/supabase/server";
import {
  PURCHASE_ORDER_RECEIPTS_BUCKET,
  formatPurchaseOrderNumber,
  getPurchaseOrderPaymentMethodLabel,
  normalizePurchaseOrderReceiptStatus,
  normalizePurchaseOrderStatus,
} from "@/lib/purchase-orders/constants";

type RawRecord = Record<string, unknown>;

type BuyerProfileRow = {
  buyer_id?: number;
  profile_id?: number | null;
};

type BusinessProfileRow = {
  profile_id?: number;
  user_id?: string | null;
  business_name?: string | null;
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

type SupplierProfileRow = {
  supplier_id?: number;
  profile_id?: number;
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
  contactName: string | null;
  phone: string | null;
  email: string | null;
  location: string;
};

export type PurchaseOrderView = {
  poId: number;
  poNumber: string;
  buyer: string;
  productName: string;
  quantityLabel: string;
  quantityValue: number | null;
  unit: string | null;
  pricePerUnit: number | null;
  subtotal: number | null;
  deliveryFee: number | null;
  totalAmount: number | null;
  status: string;
  receiptFilePath: string | null;
  receiptFileUrl: string | null;
  receiptStatus: string;
  receiptReviewNotes: string | null;
  orderDate: string | null;
  completedAt: string | null;
  quoteId: number | null;
  engagementId: number | null;
  rfqId: number | null;
  leadTime: string | null;
  quotationNotes: string | null;
  paymentMethod: string | null;
  termsAndConditions: string | null;
  additionalNotes: string | null;
  specifications: string | null;
  deliveryLocation: string | null;
  preferredDeliveryDate: string | null;
  deadline: string | null;
  conversationId: number | null;
  buyerInfo: PartyInfo | null;
  supplierInfo: PartyInfo | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
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

function buildPartyInfo(
  businessProfile: BusinessProfileRow | null,
  user: UserRow | null,
  fallbackBusinessName: string,
): PartyInfo {
  return {
    businessName: businessProfile?.business_name ?? fallbackBusinessName,
    contactName: user?.name ?? null,
    phone: businessProfile?.contact_number ?? null,
    email: user?.email ?? null,
    location: formatLocation(businessProfile),
  };
}

function getRfqProductName(rfq: RfqRow | null) {
  if (!rfq) {
    return null;
  }

  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name ?? null;
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

async function getCurrentSupplierContext() {
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
    .select("user_id, name, email")
    .eq("auth_user_id", authUser.id)
    .single<UserRow>();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(
      "profile_id, user_id, business_name, business_location, city, province, region, contact_number",
    )
    .eq("user_id", appUser.user_id)
    .single<BusinessProfileRow>();

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

  return {
    supabase,
    appUser,
    businessProfile,
    supplierProfile,
  };
}

async function buildSupportingMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: number,
  rows: RawRecord[],
  supplierPartyInfo: PartyInfo,
) {
  const buyerIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["buyer_id"]))
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

  const quoteIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["quote_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const quotationMap = new Map<number, QuotationRow>();
  const engagementMap = new Map<number, EngagementRow>();
  const rfqMap = new Map<number, RfqRow>();
  const productNameMap = new Map<number, string>();
  const buyerInfoMap = new Map<number, PartyInfo>();
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

    const safeRfqs =
      (rfqs as Omit<RfqRow, "product_name">[] | null) ?? [];
    const rfqProductIds = Array.from(
      new Set(
        safeRfqs
          .map((rfq) => rfq.product_id)
          .filter((value): value is number => typeof value === "number"),
      ),
    );

    if (rfqProductIds.length > 0) {
      const { data: rfqProducts, error: rfqProductsError } = await supabase
        .from("products")
        .select("product_id, product_name")
        .in("product_id", rfqProductIds);

      if (rfqProductsError) {
        throw new Error(rfqProductsError.message || "Failed to load RFQ products.");
      }

      for (const product of (rfqProducts as ProductRow[] | null) ?? []) {
        if (product.product_id != null && product.product_name) {
          productNameMap.set(product.product_id, product.product_name);
        }
      }
    }

    for (const rfq of safeRfqs) {
      rfqMap.set(rfq.rfq_id, {
        ...rfq,
        product_name:
          (rfq.product_id != null ? productNameMap.get(rfq.product_id) : null) ??
          `RFQ #${rfq.rfq_id}`,
      });
    }
  }

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("product_id, product_name")
      .in("product_id", productIds);

    if (productsError) {
      throw new Error(productsError.message || "Failed to load products.");
    }

    for (const product of (products as ProductRow[] | null) ?? []) {
      if (product.product_id != null && product.product_name) {
        productNameMap.set(product.product_id, product.product_name);
      }
    }
  }

  if (buyerIds.length > 0) {
    const { data: buyerProfiles, error: buyerProfilesError } = await supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id")
      .in("buyer_id", buyerIds);

    if (buyerProfilesError) {
      throw new Error(buyerProfilesError.message || "Failed to load buyer profiles.");
    }

    const safeBuyerProfiles = (buyerProfiles as BuyerProfileRow[] | null) ?? [];
    const profileIds = Array.from(
      new Set(
        safeBuyerProfiles
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
          businessProfilesError.message || "Failed to load buyer business profiles.",
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
          throw new Error(usersError.message || "Failed to load buyer contacts.");
        }

        for (const user of (users as UserRow[] | null) ?? []) {
          if (user.user_id) {
            userMap.set(user.user_id, user);
          }
        }
      }
    }

    for (const buyerProfile of safeBuyerProfiles) {
      if (buyerProfile.buyer_id == null) continue;

      const businessProfile =
        buyerProfile.profile_id != null
          ? businessProfileMap.get(buyerProfile.profile_id) ?? null
          : null;
      const user =
        businessProfile?.user_id != null
          ? userMap.get(businessProfile.user_id) ?? null
          : null;

      buyerInfoMap.set(
        buyerProfile.buyer_id,
        buildPartyInfo(
          businessProfile,
          user,
          `Buyer #${buyerProfile.buyer_id}`,
        ),
      );
    }
  }

  if (buyerIds.length > 0) {
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("conversation_id, supplier_id, buyer_id, engagement_id")
      .eq("supplier_id", supplierId)
      .in("buyer_id", buyerIds);

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

  return {
    quotationMap,
    engagementMap,
    rfqMap,
    productNameMap,
    buyerInfoMap,
    supplierPartyInfo,
    conversationMap,
  };
}

async function buildPurchaseOrderView(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: RawRecord,
  maps: Awaited<ReturnType<typeof buildSupportingMaps>>,
): Promise<PurchaseOrderView> {
  const poId = readFirstNumber(row, ["po_id"]) ?? 0;
  const buyerId = readFirstNumber(row, ["buyer_id"]);
  const productId = readFirstNumber(row, ["product_id"]);
  const quoteId = readFirstNumber(row, ["quote_id"]);
  const quotation = quoteId !== null ? maps.quotationMap.get(quoteId) ?? null : null;
  const engagement =
    quotation?.engagement_id != null
      ? maps.engagementMap.get(quotation.engagement_id) ?? null
      : null;
  const rfq = engagement?.rfq_id != null ? maps.rfqMap.get(engagement.rfq_id) ?? null : null;
  const quantityValue = readFirstNumber(row, ["quantity"]) ?? quotation?.quantity ?? null;
  const unit = rfq?.unit ?? null;
  const pricePerUnit =
    quotation?.price_per_unit == null ? null : Number(quotation.price_per_unit);
  const subtotal =
    quantityValue !== null && pricePerUnit !== null ? quantityValue * pricePerUnit : null;
  const deliveryFee = readFirstNumber(row, ["delivery_fee"]);
  const receiptFilePath = readFirstString(row, [
    "receipt_file_url",
    "proof_of_payment_url",
    "payment_proof_url",
  ]);
  const receiptFileUrl = await resolveReceiptUrl(supabase, receiptFilePath);
  const receiptStatus = normalizePurchaseOrderReceiptStatus(
    readFirstString(row, ["receipt_status"]),
    Boolean(receiptFilePath),
  );
  const buyerInfo = buyerId !== null ? maps.buyerInfoMap.get(buyerId) ?? null : null;
  const conversationId =
    buyerId !== null
      ? maps.conversationMap.get([
          readFirstNumber(row, ["supplier_id"]) ?? quotation?.supplier_id ?? 0,
          buyerId,
          quotation?.engagement_id ?? 0,
        ].join(":")) ?? null
      : null;

  return {
    poId,
    poNumber: formatPurchaseOrderNumber(poId),
    buyer: buyerInfo?.businessName ?? "Unknown buyer",
    productName:
      getRfqProductName(rfq) ??
      (productId !== null ? maps.productNameMap.get(productId) ?? `Product #${productId}` : "Unknown product"),
    quantityLabel: formatQuantityValue(quantityValue, unit),
    quantityValue,
    unit,
    pricePerUnit,
    subtotal,
    deliveryFee,
    totalAmount: readFirstNumber(row, ["total_amount"]),
    status: normalizePurchaseOrderStatus(readFirstString(row, ["status"])),
    receiptFilePath,
    receiptFileUrl,
    receiptStatus,
    receiptReviewNotes: readFirstString(row, ["receipt_review_notes"]),
    orderDate: readFirstString(row, ["confirmed_at", "created_at"]),
    completedAt: readFirstString(row, ["completed_at"]),
    quoteId,
    engagementId: quotation?.engagement_id ?? null,
    rfqId: engagement?.rfq_id ?? null,
    leadTime: quotation?.lead_time ?? null,
    quotationNotes: quotation?.notes ?? null,
    paymentMethod: getPurchaseOrderPaymentMethodLabel(
      readFirstString(row, ["payment_method"]),
    ),
    termsAndConditions: readFirstString(row, ["terms_and_conditions"]),
    additionalNotes: readFirstString(row, ["additional_notes"]),
    specifications: rfq?.specifications ?? null,
    deliveryLocation: rfq?.delivery_location ?? null,
    preferredDeliveryDate: rfq?.preferred_delivery_date ?? null,
    deadline: rfq?.deadline ?? null,
    conversationId,
    buyerInfo,
    supplierInfo: maps.supplierPartyInfo,
  };
}

export async function getSupplierPurchaseOrders(statusFilter?: string) {
  const { supabase, appUser, businessProfile, supplierProfile } =
    await getCurrentSupplierContext();

  const { data: purchaseOrders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load purchase orders.");
  }

  const supplierPartyInfo = buildPartyInfo(
    businessProfile,
    appUser,
    businessProfile.business_name ?? "Your business",
  );
  const rows = (purchaseOrders as RawRecord[] | null) ?? [];
  const maps = await buildSupportingMaps(
    supabase,
    supplierProfile.supplier_id ?? 0,
    rows,
    supplierPartyInfo,
  );
  const normalized = await Promise.all(
    rows.map((row) => buildPurchaseOrderView(supabase, row, maps)),
  );

  const filtered = statusFilter
    ? normalized.filter((order) => order.status === normalizePurchaseOrderStatus(statusFilter))
    : normalized;

  return {
    orders: filtered,
    allOrders: normalized,
  };
}

export async function getSupplierPurchaseOrderDetail(poId: number) {
  const { supabase, appUser, businessProfile, supplierProfile } =
    await getCurrentSupplierContext();

  const { data: purchaseOrder, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("supplier_id", supplierProfile.supplier_id)
    .eq("po_id", poId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load purchase order.");
  }

  if (!purchaseOrder) {
    return null;
  }

  const supplierPartyInfo = buildPartyInfo(
    businessProfile,
    appUser,
    businessProfile.business_name ?? "Your business",
  );
  const row = purchaseOrder as RawRecord;
  const maps = await buildSupportingMaps(
    supabase,
    supplierProfile.supplier_id ?? 0,
    [row],
    supplierPartyInfo,
  );

  return buildPurchaseOrderView(supabase, row, maps);
}
