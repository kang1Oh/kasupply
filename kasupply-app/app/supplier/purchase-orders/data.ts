import { createClient } from "@/lib/supabase/server";

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
  quote_id?: number;
  engagement_id?: number | null;
  price_per_unit?: number | null;
  quantity?: number | null;
};

type SupplierProfileRow = {
  supplier_id?: number;
  profile_id?: number;
};

type EngagementRow = {
  engagement_id?: number;
  rfq_id?: number | null;
};

type RfqRow = {
  rfq_id?: number;
};

type ConversationRow = {
  conversation_id?: number;
  supplier_id?: number;
  buyer_id?: number | null;
  engagement_id?: number | null;
};

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") === true ||
    error.message?.toLowerCase().includes("relation") === true
  );
}

async function runFirstAvailable<T>(
  tables: string[],
  runner: (table: string) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
) {
  let lastError: { code?: string; message?: string } | null = null;

  for (const table of tables) {
    const result = await runner(table);

    if (!result.error) {
      return result.data;
    }

    if (isMissingRelationError(result.error)) {
      lastError = result.error;
      continue;
    }

    throw new Error(result.error.message || `Failed to query ${table}.`);
  }

  throw new Error(lastError?.message || "Required table was not found.");
}

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
  product: string;
  quantity: string;
  quantityValue: number | null;
  unit: string | null;
  pricePerUnit: number | null;
  totalAmount: number | null;
  status: string;
  paymentProof: string | null;
  paymentReference: string | null;
  paymentDate: string | null;
  orderDate: string | null;
  invoiceNumber: string | null;
  invoiceIssueDate: string | null;
  invoiceStatus: string | null;
  invoiceFile: string | null;
  invoiceAmount: number | null;
  quoteId: number | null;
  engagementId: number | null;
  rfqId: number | null;
  conversationId: number | null;
  buyerInfo: PartyInfo | null;
  supplierInfo: PartyInfo | null;
  notes: string | null;
  raw: RawRecord;
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
    if (value) return value;
  }
  return null;
}

function readFirstNumber(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeStatus(value: string | null) {
  return value ? value.toLowerCase().replace(/\s+/g, "_") : "pending";
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

async function buildSupportingMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
        .map((row) => readFirstNumber(row, ["quote_id", "quotation_id", "final_quote_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const engagementIds = Array.from(
    new Set(
      rows
        .map((row) => readFirstNumber(row, ["engagement_id", "rfq_engagement_id"]))
        .filter((value): value is number => value !== null),
    ),
  );

  const buyerInfoMap = new Map<number, PartyInfo>();
  const productNameMap = new Map<number, string>();
  const quotationMap = new Map<number, QuotationRow>();
  const engagementMap = new Map<number, EngagementRow>();
  const rfqMap = new Map<number, RfqRow>();
  const conversationMap = new Map<string, number>();

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("product_id, product_name")
      .in("product_id", productIds);

    for (const product of (products as ProductRow[] | null) ?? []) {
      if (product.product_id != null && product.product_name) {
        productNameMap.set(product.product_id, product.product_name);
      }
    }
  }

  if (quoteIds.length > 0) {
    const { data: quotations } = await supabase
      .from("quotations")
      .select("quote_id, engagement_id, price_per_unit, quantity")
      .in("quote_id", quoteIds);

    for (const quotation of (quotations as QuotationRow[] | null) ?? []) {
      if (quotation.quote_id != null) {
        quotationMap.set(quotation.quote_id, quotation);
      }
    }
  }

  if (engagementIds.length > 0) {
    const engagements = await runFirstAvailable<EngagementRow[]>(
      ["rfq_engagements", "rfq_engagement"],
      async (table) => {
        const result = await supabase
          .from(table)
          .select("engagement_id, rfq_id")
          .in("engagement_id", engagementIds);

        return {
          data: (result.data as EngagementRow[] | null) ?? null,
          error: result.error,
        };
      },
    );

    for (const engagement of engagements ?? []) {
      if (engagement.engagement_id != null) {
        engagementMap.set(engagement.engagement_id, engagement);
      }
    }
  }

  const rfqIds = Array.from(
    new Set(
      [
        ...rows
          .map((row) => readFirstNumber(row, ["rfq_id"]))
          .filter((value): value is number => value !== null),
        ...Array.from(engagementMap.values())
          .map((engagement) => engagement.rfq_id)
          .filter((value): value is number => typeof value === "number"),
      ],
    ),
  );

  if (rfqIds.length > 0) {
    const rfqs = await runFirstAvailable<RfqRow[]>(
      ["rfqs", "rfq"],
      async (table) => {
        const result = await supabase
          .from(table)
          .select("rfq_id")
          .in("rfq_id", rfqIds);

        return {
          data: (result.data as RfqRow[] | null) ?? null,
          error: result.error,
        };
      },
    );

    for (const rfq of rfqs ?? []) {
      if (rfq.rfq_id != null) {
        rfqMap.set(rfq.rfq_id, rfq);
      }
    }
  }

  if (buyerIds.length > 0) {
    const { data: buyerProfiles } = await supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id")
      .in("buyer_id", buyerIds);

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
      const { data: businessProfiles } = await supabase
        .from("business_profiles")
        .select(
          "profile_id, user_id, business_name, business_location, city, province, region, contact_number",
        )
        .in("profile_id", profileIds);

      for (const businessProfile of (businessProfiles as BusinessProfileRow[] | null) ?? []) {
        if (businessProfile.profile_id != null) {
          businessProfileMap.set(businessProfile.profile_id, businessProfile);
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
        const { data: users } = await supabase
          .from("users")
          .select("user_id, name, email")
          .in("user_id", userIds);

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
    const conversations = await runFirstAvailable<ConversationRow[]>(
      ["conversation", "conversations"],
      async (table) => {
        const result = await supabase
          .from(table)
          .select("conversation_id, supplier_id, buyer_id, engagement_id")
          .in("buyer_id", buyerIds);

        return {
          data: (result.data as ConversationRow[] | null) ?? null,
          error: result.error,
        };
      },
    );

    for (const conversation of conversations ?? []) {
      if (conversation.supplier_id == null || conversation.buyer_id == null) continue;

      const key = [
        conversation.supplier_id,
        conversation.buyer_id,
        conversation.engagement_id ?? 0,
      ].join(":");

      const conversationId = conversation.conversation_id ?? null;
      if (conversationId != null) {
        conversationMap.set(key, conversationId);
      }
    }
  }

  return {
    buyerInfoMap,
    supplierPartyInfo,
    productNameMap,
    quotationMap,
    engagementMap,
    rfqMap,
    conversationMap,
  };
}

function buildPurchaseOrderView(
  row: RawRecord,
  maps: Awaited<ReturnType<typeof buildSupportingMaps>>,
): PurchaseOrderView {
  const poId = readFirstNumber(row, ["po_id", "purchase_order_id", "id"]) ?? 0;
  const buyerId = readFirstNumber(row, ["buyer_id"]);
  const productId = readFirstNumber(row, ["product_id"]);
  const quoteId = readFirstNumber(row, ["quote_id", "quotation_id", "final_quote_id"]);
  const engagementId = readFirstNumber(row, ["engagement_id", "rfq_engagement_id"]);
  const engagement =
    engagementId !== null ? maps.engagementMap.get(engagementId) ?? null : null;
  const rfqId =
    readFirstNumber(row, ["rfq_id"]) ??
    (engagement?.rfq_id ?? null);
  const quote = quoteId !== null ? maps.quotationMap.get(quoteId) ?? null : null;
  const buyerInfo =
    buyerId !== null ? maps.buyerInfoMap.get(buyerId) ?? null : null;

  const poNumber =
    readFirstString(row, ["po_number", "purchase_order_number", "order_number"]) ??
    `PO-${poId}`;

  const quantityValue =
    readFirstNumber(row, ["quantity", "order_quantity"]) ??
    (quote?.quantity ?? null);
  const unit = readFirstString(row, ["unit", "quantity_unit"]) ?? null;
  const pricePerUnit =
    readFirstNumber(row, ["price_per_unit", "agreed_price_per_unit", "unit_price"]) ??
    (quote?.price_per_unit ?? null);
  const totalAmount =
    readFirstNumber(row, ["total_amount", "total_price", "amount"]) ??
    (() => {
      return pricePerUnit !== null && quantityValue !== null
        ? pricePerUnit * quantityValue
        : null;
    })();

  const conversationKey = [
    readFirstNumber(row, ["supplier_id"]) ?? 0,
    buyerId ?? 0,
    engagementId ?? 0,
  ].join(":");

  return {
    poId,
    poNumber,
    buyer: buyerInfo?.businessName ?? "Unknown buyer",
    product:
      readFirstString(row, ["product_name", "item_name"]) ??
      (productId !== null
        ? maps.productNameMap.get(productId) ?? `Product #${productId}`
        : "Unknown product"),
    quantity: formatQuantityValue(quantityValue, unit),
    quantityValue,
    unit,
    pricePerUnit,
    totalAmount,
    status: normalizeStatus(readFirstString(row, ["status", "order_status"])),
    paymentProof: readFirstString(row, [
      "proof_of_payment_url",
      "payment_proof_url",
      "proof_of_payment",
      "payment_proof",
    ]),
    paymentReference: readFirstString(row, [
      "payment_reference_no",
      "payment_reference",
      "reference_number",
      "receipt_reference_number",
      "receipt_number",
    ]),
    paymentDate: readFirstString(row, ["payment_date", "paid_at"]),
    orderDate: readFirstString(row, ["ordered_at", "order_date", "created_at", "confirmed_at"]),
    invoiceNumber: readFirstString(row, ["invoice_number"]),
    invoiceIssueDate: readFirstString(row, ["invoice_issued_at", "invoice_issue_date", "issued_at"]),
    invoiceStatus: readFirstString(row, ["invoice_status"]),
    invoiceFile: readFirstString(row, ["invoice_file_url", "invoice_url", "invoice_file"]),
    invoiceAmount:
      readFirstNumber(row, ["invoice_amount"]) ??
      totalAmount,
    quoteId,
    engagementId,
    rfqId,
    conversationId: maps.conversationMap.get(conversationKey) ?? null,
    buyerInfo,
    supplierInfo: maps.supplierPartyInfo,
    notes: readFirstString(row, ["notes", "remarks", "supplier_notes"]),
    raw: row,
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
  const maps = await buildSupportingMaps(supabase, rows, supplierPartyInfo);
  const normalized = rows.map((row) => buildPurchaseOrderView(row, maps));

  const filtered = statusFilter
    ? normalized.filter((order) => order.status === normalizeStatus(statusFilter))
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
  const maps = await buildSupportingMaps(supabase, [row], supplierPartyInfo);

  return buildPurchaseOrderView(row, maps);
}
