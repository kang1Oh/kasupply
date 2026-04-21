import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  city: string | null;
  province: string | null;
  user_id: string;
};

type UserRow = {
  user_id: string;
  name: string | null;
};

type RfqRow = {
  rfq_id: number;
  buyer_id: number;
  category_id: number | null;
  product_id: number | null;
  product_name: string | null;
  product_moq?: number | null;
  product_lead_time?: string | null;
  requested_product_name: string | null;
  quantity: number;
  unit: string | null;
  target_price_per_unit: number | null;
  specifications: string | null;
  preferred_delivery_date: string | null;
  delivery_location: string | null;
  deadline: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
  products?: { product_id: number; product_name: string | null } | { product_id: number; product_name: string | null }[] | null;
};

type EngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  viewed_at: string | null;
  initiated_at: string | null;
  final_quote_id: number | null;
  created_at: string | null;
  rfqs: RfqRow | RfqRow[] | null;
};

type RequestMatchRow = {
  match_id: number;
  rfq_id: number;
  supplier_id: number;
  match_score: number | null;
  match_reason: string | null;
  is_visible: boolean | null;
  notified_at: string | null;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  supplier_id: number;
  price_per_unit: number;
  quantity: number;
  moq: number;
  lead_time: string | null;
  notes: string | null;
  status: string | null;
  valid_until: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PurchaseOrderRow = {
  po_id: number;
  quote_id: number;
  status: string | null;
  created_at: string | null;
};

type ProductCatalogRow = {
  product_id: number;
  supplier_id: number;
  category_id: number | null;
  product_name: string | null;
  moq: number | null;
  lead_time: string | null;
  is_published: boolean;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function scoreProductMatch(params: {
  requestedName: string;
  productName: string;
  rfqCategoryId: number | null;
  productCategoryId: number | null;
}) {
  const requested = normalizeText(params.requestedName);
  const product = normalizeText(params.productName);

  if (!requested || !product) {
    return 0;
  }

  let score = 0;

  if (params.rfqCategoryId != null && params.rfqCategoryId === params.productCategoryId) {
    score += 40;
  }

  if (requested === product) {
    score += 100;
  } else if (product.includes(requested) || requested.includes(product)) {
    score += 75;
  }

  const requestedTokens = new Set(requested.split(" ").filter(Boolean));
  const productTokens = new Set(product.split(" ").filter(Boolean));
  const overlappingTokens = [...requestedTokens].filter((token) => productTokens.has(token));

  score += overlappingTokens.length * 12;

  return score;
}

function getSingleRfq(rfqs: EngagementRow["rfqs"]): RfqRow | null {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

function getRfqProductName(rfq: RfqRow | null) {
  if (!rfq) {
    return null;
  }

  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return (
    product?.product_name ||
    rfq.requested_product_name?.trim() ||
    rfq.product_name?.trim() ||
    null
  );
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
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

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
    appUserId: String(appUser.user_id),
    supplierProfile,
  };
}

async function getBuyerDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerId: number,
) {
  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .eq("buyer_id", buyerId)
    .maybeSingle<BuyerProfileRow>();

  if (!buyerProfile?.profile_id) {
    return {
      businessName: `Buyer #${buyerId}`,
      contactName: null,
      businessType: null,
      businessLocation: null,
      city: null,
      province: null,
    };
  }

  const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select(
      "profile_id, business_name, business_type, business_location, city, province, user_id",
    )
    .eq("profile_id", buyerProfile.profile_id)
    .maybeSingle<BusinessProfileRow>();

  if (!businessProfile) {
    return {
      businessName: `Buyer #${buyerId}`,
      contactName: null,
      businessType: null,
      businessLocation: null,
      city: null,
      province: null,
    };
  }

  const { data: buyerUser } = await supabase
    .from("users")
    .select("user_id, name")
    .eq("user_id", businessProfile.user_id)
    .maybeSingle<UserRow>();

  return {
    businessName: businessProfile.business_name ?? `Buyer #${buyerId}`,
    contactName: buyerUser?.name ?? null,
    businessType: businessProfile.business_type ?? null,
    businessLocation: businessProfile.business_location ?? null,
    city: businessProfile.city ?? null,
    province: businessProfile.province ?? null,
  };
}

export async function getSupplierRfqEngagementDetail(engagementId: number) {
  const { supabase, supplierProfile, appUserId } =
    await getCurrentSupplierContext();

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select(`
      engagement_id,
      rfq_id,
      supplier_id,
      status,
      viewed_at,
      initiated_at,
      final_quote_id,
      created_at,
      rfqs (
        rfq_id,
        buyer_id,
        category_id,
        product_id,
        requested_product_name,
        quantity,
        unit,
        target_price_per_unit,
        specifications,
        preferred_delivery_date,
        delivery_location,
        deadline,
        status,
        visibility,
        created_at,
        updated_at,
        products!rfqs_product_id_fkey (
          product_id,
          product_name
        )
      )
    `)
    .eq("engagement_id", engagementId)
    .eq("supplier_id", supplierProfile.supplier_id)
    .maybeSingle<EngagementRow>();

  if (engagementError) {
    throw new Error(engagementError.message || "Failed to load RFQ engagement.");
  }

  if (!engagement) {
    return null;
  }

  const rawRfq = getSingleRfq(engagement.rfqs);
  let productName: string | null = null;
  let productMoq: number | null = null;
  let productLeadTime: string | null = null;

  if (rawRfq?.product_id != null) {
    const { data: productRow, error: productRowError } = await supabase
      .from("products")
      .select("product_id, product_name, moq, lead_time")
      .eq("product_id", rawRfq.product_id)
      .maybeSingle();

    if (productRowError) {
      throw new Error(productRowError.message || "Failed to load RFQ product.");
    }

    productName = productRow?.product_name ?? null;
    productMoq =
      typeof productRow?.moq === "number" && Number.isFinite(productRow.moq)
        ? productRow.moq
        : null;
    productLeadTime = productRow?.lead_time?.trim() || null;
  }

  if (rawRfq && (!productName || !productLeadTime || productMoq == null)) {
    const requestedProductName =
      rawRfq.requested_product_name?.trim() ||
      rawRfq.product_name?.trim() ||
      getRfqProductName(rawRfq) ||
      "";

    if (requestedProductName) {
      const { data: supplierProducts, error: supplierProductsError } = await supabase
        .from("products")
        .select("product_id, supplier_id, category_id, product_name, moq, lead_time, is_published")
        .eq("supplier_id", supplierProfile.supplier_id)
        .eq("is_published", true);

      if (supplierProductsError) {
        throw new Error(supplierProductsError.message || "Failed to load supplier catalog.");
      }

      const bestMatchingProduct = ((supplierProducts ?? []) as ProductCatalogRow[])
        .map((product) => ({
          product,
          score: scoreProductMatch({
            requestedName: requestedProductName,
            productName: product.product_name ?? "",
            rfqCategoryId: rawRfq.category_id,
            productCategoryId: product.category_id,
          }),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.product;

      if (bestMatchingProduct) {
        productName = productName ?? bestMatchingProduct.product_name ?? null;
        productMoq =
          productMoq ??
          (typeof bestMatchingProduct.moq === "number" && Number.isFinite(bestMatchingProduct.moq)
            ? bestMatchingProduct.moq
            : null);
        productLeadTime = productLeadTime ?? bestMatchingProduct.lead_time?.trim() ?? null;
      }
    }
  }

  const rfq = rawRfq
      ? {
          ...rawRfq,
          product_name: productName ?? `RFQ #${rawRfq.rfq_id}`,
          product_moq: productMoq,
          product_lead_time: productLeadTime,
        }
      : null;

  const { data: match } = await supabase
    .from("request_matches")
    .select(`
      match_id,
      rfq_id,
      supplier_id,
      match_score,
      match_reason,
      is_visible,
      notified_at
    `)
    .eq("rfq_id", engagement.rfq_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .maybeSingle<RequestMatchRow>();

  const { data: offers, error: offersError } = await supabase
    .from("negotiation_offers")
    .select(`
      offer_id,
      engagement_id,
      offered_by,
      offer_round,
      price_per_unit,
      quantity,
      lead_time,
      moq,
      notes,
      status,
      created_at
    `)
    .eq("engagement_id", engagementId)
    .order("offer_round", { ascending: false });

  if (offersError) {
    throw new Error(offersError.message || "Failed to load negotiation history.");
  }

  let latestQuotation: QuotationRow | null = null;

  if (engagement.final_quote_id) {
    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .select("*")
      .eq("quote_id", engagement.final_quote_id)
      .eq("supplier_id", supplierProfile.supplier_id)
      .maybeSingle<QuotationRow>();

    if (quotationError) {
      throw new Error(quotationError.message || "Failed to load quotation.");
    }

    latestQuotation = quotation ?? null;
  } else {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("*")
      .eq("engagement_id", engagementId)
      .eq("supplier_id", supplierProfile.supplier_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<QuotationRow>();

    latestQuotation = quotation ?? null;
  }

  let purchaseOrder: PurchaseOrderRow | null = null;

  if (latestQuotation?.quote_id != null) {
    const { data: purchaseOrderRow, error: purchaseOrderError } = await supabase
      .from("purchase_orders")
      .select("po_id, quote_id, status, created_at")
      .eq("quote_id", latestQuotation.quote_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PurchaseOrderRow>();

    if (purchaseOrderError) {
      throw new Error(purchaseOrderError.message || "Failed to load purchase order.");
    }

    purchaseOrder = purchaseOrderRow ?? null;
  }

  if (!purchaseOrder) {
    const { data: engagementQuotations, error: engagementQuotationsError } = await supabase
      .from("quotations")
      .select("quote_id")
      .eq("engagement_id", engagementId)
      .eq("supplier_id", supplierProfile.supplier_id);

    if (engagementQuotationsError) {
      throw new Error(
        engagementQuotationsError.message || "Failed to load engagement quotations.",
      );
    }

    const engagementQuoteIds = (engagementQuotations ?? [])
      .map((quotation) => quotation.quote_id)
      .filter((quoteId): quoteId is number => Number.isFinite(Number(quoteId)));

    if (engagementQuoteIds.length > 0) {
      const { data: purchaseOrderFallback, error: purchaseOrderFallbackError } = await supabase
        .from("purchase_orders")
        .select("po_id, quote_id, status, created_at")
        .in("quote_id", engagementQuoteIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<PurchaseOrderRow>();

      if (purchaseOrderFallbackError) {
        throw new Error(
          purchaseOrderFallbackError.message || "Failed to load purchase order fallback.",
        );
      }

      purchaseOrder = purchaseOrderFallback ?? null;
    }
  }

  const buyer =
    rfq?.buyer_id != null
      ? await getBuyerDetails(supabase, rfq.buyer_id)
      : {
          businessName: "Unknown buyer",
          contactName: null,
        };

  return {
    currentAppUserId: appUserId,
    engagement,
    rfq:
      rfq == null
        ? null
        : {
            ...rfq,
            product_name: getRfqProductName(rfq),
          },
    match: match ?? null,
    buyer,
    offers: offers ?? [],
    latestQuotation,
    purchaseOrder,
  };
}
