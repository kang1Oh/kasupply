import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { findSupplierSearchDocuments } from "@/lib/search";

type BusinessProfileLocation = {
  city: string | null;
  province: string | null;
  region: string | null;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  about: string | null;
};

type RfqMatchIntent = {
  intentTokens: string[];
  intentQuery: string;
  hasSpecificIntent: boolean;
  softLocationPhrase: string | null;
  locationTokens: string[];
};

type SupplierMatchCandidate = {
  supplierId: number;
  profileId: number;
  verifiedBadge: boolean;
  businessName: string;
  businessType: string | null;
  about: string | null;
  businessLocation: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  categoryIds: number[];
  products: Array<{
    productId: number;
    categoryId: number | null;
    productName: string;
    description: string | null;
    moq: number | null;
    maxCapacity: number | null;
    unit: string | null;
  }>;
};

type SupplierInfo = {
  supplierName: string;
  verifiedBadge: boolean;
  avatarUrl: string | null;
  businessType: string | null;
  locationLabel: string | null;
};

export type ProductCategoryOption = {
  categoryId: number;
  categoryName: string;
};

export type BuyerRfqListItem = {
  rfqId: number;
  rfqType: string | null;
  productId: number | null;
  requestedProductName: string | null;
  productName: string;
  quantity: number;
  unit: string;
  specifications: string | null;
  deadline: string;
  status: string;
  visibility: string;
  createdAt: string;
  targetPricePerUnit: number | null;
  preferredDeliveryDate: string | null;
  deliveryLocation: string | null;
  category: {
    categoryId: number;
    categoryName: string;
  } | null;
  supplierPreview: {
    supplierId: number;
    supplierName: string;
    verifiedBadge: boolean;
    avatarUrl: string | null;
  } | null;
  hasPurchaseOrder: boolean;
  quotationCount: number;
  requestMatchesCount: number;
  visibleMatchesCount: number;
  topMatchScore: number | null;
  engagements: {
    engagementId: number;
    supplierId: number;
    supplierName: string;
    status: string;
    verifiedBadge: boolean;
    avatarUrl: string | null;
    finalQuoteId: number | null;
  }[];
};

export type BuyerRfqDetailsData = {
  currentAuthUserId: string;
  rfq: {
    rfqId: number;
    rfqType: string | null;
    productId: number | null;
    requestedProductName: string | null;
    productName: string;
    quantity: number;
    unit: string;
    specifications: string | null;
    deadline: string;
    status: string;
    visibility: string;
    createdAt: string;
    targetPricePerUnit: number | null;
    preferredDeliveryDate: string | null;
    deliveryLocation: string | null;
    isClosed: boolean;
    category: {
      categoryId: number;
      categoryName: string;
    } | null;
  };
  requestMatches: {
    totalCount: number;
    visibleCount: number;
    topScore: number | null;
    suppliers: {
      matchId: number;
      supplierId: number;
      supplierName: string;
      verifiedBadge: boolean;
      avatarUrl: string | null;
      matchScore: number | null;
      matchReason: string | null;
      isVisible: boolean;
      notifiedAt: string | null;
    }[];
  };
  engagements: {
    engagementId: number;
    supplierId: number;
    supplierName: string;
    avatarUrl: string | null;
    businessType: string | null;
    locationLabel: string | null;
    verifiedBadge: boolean;
    status: string;
    finalQuoteId: number | null;
    latestSupplierOffer: {
      offerId: number;
      offeredBy: string;
      offerRound: number;
      pricePerUnit: number | null;
      quantity: number | null;
      moq: number | null;
      leadTime: string | null;
      notes: string | null;
      status: string;
      createdAt: string;
    } | null;
    offers: {
      offerId: number;
      offeredBy: string;
      offerRound: number;
      pricePerUnit: number | null;
      quantity: number | null;
      moq: number | null;
      leadTime: string | null;
      notes: string | null;
      status: string;
      createdAt: string;
    }[];
    quotations: {
      quoteId: number;
      pricePerUnit: number;
      quantity: number;
      moq: number;
      leadTime: string | null;
      notes: string | null;
      status: string;
      validUntil: string;
      createdAt: string;
    }[];
    acceptedOffer: {
      offerId: number;
      offeredBy: string;
      offerRound: number;
      pricePerUnit: number | null;
      quantity: number | null;
      moq: number | null;
      leadTime: string | null;
      notes: string | null;
      status: string;
      createdAt: string;
    } | null;
    acceptedQuotation: {
      quoteId: number;
      pricePerUnit: number;
      quantity: number;
      moq: number;
      leadTime: string | null;
      notes: string | null;
      status: string;
      validUntil: string;
      createdAt: string;
    } | null;
    conversationId: number | null;
  }[];
  purchaseOrder: {
    poId: number;
    quoteId: number;
    status: string;
    confirmedAt: string | null;
    createdAt: string;
  } | null;
};

const GENERIC_RFQ_TOKENS = new Set([
  "a",
  "an",
  "and",
  "area",
  "around",
  "at",
  "buy",
  "buyer",
  "for",
  "from",
  "in",
  "location",
  "near",
  "need",
  "needed",
  "of",
  "our",
  "please",
  "quotation",
  "quote",
  "request",
  "rfq",
  "supplier",
  "suppliers",
  "supply",
  "the",
  "to",
  "we",
  "with",
  "within",
]);

type BuyerQuotationRow = {
  quote_id: number;
  engagement_id: number;
  supplier_id: number;
  price_per_unit: number;
  quantity: number;
  moq: number;
  lead_time: string | null;
  notes: string | null;
  status: string;
  valid_until: string;
  created_at: string;
};

type BuyerOfferRow = {
  offer_id: number;
  engagement_id: number;
  offered_by: string;
  offer_round: number;
  price_per_unit: number | null;
  quantity: number | null;
  moq: number | null;
  lead_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export async function getCurrentBuyerContext() {
  const supabase = await createClient();
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    return null;
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(
      "profile_id, business_name, business_type, business_location, about, city, province, region"
    )
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

  return {
    appUserId: user.user_id as string,
    buyerId: buyerProfile.buyer_id as number,
    profileId: businessProfile.profile_id as number,
    businessProfile: businessProfile as BusinessProfileLocation & {
      profile_id: number;
    },
  };
}

export async function getProductCategories(): Promise<ProductCategoryOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load product categories.");
  }

  return (data ?? []).map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
  }));
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getRfqDisplayName(params: {
  requestedProductName?: string | null;
  productId?: number | null;
  products?:
    | {
        product_id: number;
        product_name: string | null;
      }
    | {
        product_id: number;
        product_name: string | null;
      }[]
    | null;
}) {
  const product = Array.isArray(params.products)
    ? params.products[0]
    : params.products;
  const requestedProductName = params.requestedProductName?.trim();

  return (
    product?.product_name ||
    requestedProductName ||
    (params.productId != null ? `Product #${params.productId}` : "Untitled request")
  );
}

function tokenize(value: string | null | undefined) {
  return Array.from(
    new Set(
      normalizeText(value)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3)
    )
  );
}

function getOverlapRatio(source: string[], target: string[]) {
  if (source.length === 0 || target.length === 0) {
    return 0;
  }

  const targetSet = new Set(target);
  const overlap = source.filter((token) => targetSet.has(token)).length;
  return overlap / source.length;
}

function normalizeSoftLocationPhrase(value: string | null | undefined) {
  const normalized = normalizeText(value)
    .replace(/\b(area|location|place)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length >= 3 ? normalized : null;
}

function buildRfqMatchIntent(params: {
  productName: string;
  categoryName: string | null;
  specifications: string | null;
  deliveryLocation: string | null;
}) {
  const softLocationPhrase = normalizeSoftLocationPhrase(params.deliveryLocation);
  const locationTokens = tokenize(softLocationPhrase);
  const rawIntentText = [
    params.productName,
    params.categoryName ?? "",
    params.specifications ?? "",
  ].join(" ");
  const intentTokens = tokenize(rawIntentText).filter(
    (token) => !GENERIC_RFQ_TOKENS.has(token) && !locationTokens.includes(token)
  );

  return {
    intentTokens,
    intentQuery: intentTokens.join(" "),
    hasSpecificIntent: intentTokens.length > 0,
    softLocationPhrase,
    locationTokens,
  } satisfies RfqMatchIntent;
}

function getStructuredLocationScore(params: {
  buyerLocation: Pick<BusinessProfileLocation, "city" | "province" | "region">;
  deliveryLocation: string | null;
  supplier: Pick<
    SupplierMatchCandidate,
    "city" | "province" | "region"
  >;
}) {
  const normalizedDeliveryLocation = normalizeText(params.deliveryLocation);
  const normalizedSupplierCity = normalizeText(params.supplier.city);
  const normalizedSupplierProvince = normalizeText(params.supplier.province);
  const normalizedSupplierRegion = normalizeText(params.supplier.region);

  if (
    normalizedDeliveryLocation &&
    normalizedSupplierCity &&
    normalizedDeliveryLocation.includes(normalizedSupplierCity)
  ) {
    return 8;
  }

  if (
    normalizedDeliveryLocation &&
    normalizedSupplierProvince &&
    normalizedDeliveryLocation.includes(normalizedSupplierProvince)
  ) {
    return 5;
  }

  if (
    normalizedDeliveryLocation &&
    normalizedSupplierRegion &&
    normalizedDeliveryLocation.includes(normalizedSupplierRegion)
  ) {
    return 3;
  }

  if (
    normalizeText(params.buyerLocation.city) &&
    normalizeText(params.buyerLocation.city) === normalizedSupplierCity
  ) {
    return 8;
  }

  if (
    normalizeText(params.buyerLocation.province) &&
    normalizeText(params.buyerLocation.province) === normalizedSupplierProvince
  ) {
    return 5;
  }

  if (
    normalizeText(params.buyerLocation.region) &&
    normalizeText(params.buyerLocation.region) === normalizedSupplierRegion
  ) {
    return 3;
  }

  return 0;
}

function getLocationScore(params: {
  buyerLocation: Pick<BusinessProfileLocation, "city" | "province" | "region">;
  deliveryLocation: string | null;
  softLocationPhrase: string | null;
  supplier: Pick<
    SupplierMatchCandidate,
    "city" | "province" | "region" | "businessLocation" | "about"
  >;
}) {
  const structuredScore = getStructuredLocationScore({
    buyerLocation: params.buyerLocation,
    deliveryLocation: params.deliveryLocation,
    supplier: params.supplier,
  });

  let softBoost = 0;

  if (params.softLocationPhrase) {
    const normalizedSoftLocation = normalizeText(params.softLocationPhrase);
    const searchableLocationText = normalizeText(
      `${params.supplier.businessLocation ?? ""} ${params.supplier.about ?? ""} ${params.supplier.city ?? ""} ${params.supplier.province ?? ""} ${params.supplier.region ?? ""}`
    );

    if (searchableLocationText.includes(normalizedSoftLocation)) {
      softBoost = 7;
    } else {
      const softLocationTokens = tokenize(normalizedSoftLocation);
      const searchableLocationTokens = tokenize(searchableLocationText);
      const overlapRatio = getOverlapRatio(softLocationTokens, searchableLocationTokens);

      if (overlapRatio >= 0.7) {
        softBoost = 5;
      } else if (overlapRatio >= 0.45) {
        softBoost = 3;
      }
    }
  }

  return clampMatchScore(structuredScore + softBoost, 15);
}

function clampMatchScore(value: number, maximum = 100) {
  return Math.max(0, Math.min(maximum, Number(value.toFixed(2))));
}

function getSemanticSimilarityScore(similarity: number | null, maxScore: number) {
  if (similarity == null || !Number.isFinite(similarity)) {
    return 0;
  }

  const normalized = Math.max(0, Math.min(1, (similarity - 0.5) / 0.35));
  return clampMatchScore(normalized * maxScore, maxScore);
}

function isUnitCompatible(requestUnit: string | null | undefined, productUnit: string | null | undefined) {
  if (!requestUnit || !productUnit) {
    return true;
  }

  return normalizeText(requestUnit) === normalizeText(productUnit);
}

function getRelevantSupplierProducts(params: {
  categoryId: number;
  intentTokens: string[];
  supplier: SupplierMatchCandidate;
}) {
  const requestTokens = params.intentTokens;

  const relevantProducts = params.supplier.products.filter((product) => {
    const productTokens = tokenize(
      `${product.productName} ${product.description ?? ""}`
    );

    return (
      product.categoryId === params.categoryId ||
      getOverlapRatio(requestTokens, productTokens) > 0
    );
  });

  return relevantProducts.length > 0 ? relevantProducts : params.supplier.products;
}

function getProductRelevanceScore(params: {
  categoryId: number;
  supplier: SupplierMatchCandidate;
  productSimilarity: number | null;
  exactProductPhrase: boolean;
  productOverlap: number;
}) {
  const categoryBoost = params.supplier.categoryIds.includes(params.categoryId) ? 8 : 0;
  const semanticBoost = getSemanticSimilarityScore(params.productSimilarity, 22);
  const keywordBoost = clampMatchScore(
    (params.exactProductPhrase ? 5 : 0) + params.productOverlap * 7,
    10
  );

  return clampMatchScore(categoryBoost + semanticBoost + keywordBoost, 40);
}

function getMoqCapacityScore(params: {
  quantity: number;
  requestedUnit: string;
  relevantProducts: SupplierMatchCandidate["products"];
}) {
  if (params.relevantProducts.length === 0) {
    return 0;
  }

  let bestScore = 0;

  for (const product of params.relevantProducts) {
    const unitMultiplier = isUnitCompatible(params.requestedUnit, product.unit) ? 1 : 0.55;

    let moqScore = 0;
    if (product.moq == null) {
      moqScore = 6;
    } else if (params.quantity >= product.moq) {
      moqScore = 12;
    } else {
      const moqRatio = Math.max(0, Math.min(1, params.quantity / product.moq));
      moqScore = Math.max(2, moqRatio * 10);
    }

    let capacityScore = 0;
    if (product.maxCapacity == null) {
      capacityScore = 6;
    } else if (params.quantity <= product.maxCapacity) {
      capacityScore = 13;
    } else {
      const capacityRatio = Math.max(0, Math.min(1, product.maxCapacity / params.quantity));
      capacityScore = capacityRatio * 9;
    }

    const total = clampMatchScore((moqScore + capacityScore) * unitMultiplier, 25);

    if (total > bestScore) {
      bestScore = total;
    }
  }

  return bestScore;
}

function buildMatchReason(params: {
  productRelevanceScore: number;
  moqCapacityScore: number;
  businessDescriptionScore: number;
  locationScore: number;
  supplier: SupplierMatchCandidate;
}) {
  const reasons = [
    `product ${Math.round(params.productRelevanceScore)}/40`,
    `MOQ/capacity ${Math.round(params.moqCapacityScore)}/25`,
    `niche ${Math.round(params.businessDescriptionScore)}/20`,
    `location ${Math.round(params.locationScore)}/15`,
  ];

  if (params.supplier.verifiedBadge) {
    reasons.push("verified supplier");
  }

  return reasons.join(", ");
}

function getIntentMatchEvidence(params: {
  intentTokens: string[];
  supplier: SupplierMatchCandidate;
}) {
  if (params.intentTokens.length === 0) {
    return {
      productOverlap: 0,
      profileOverlap: 0,
      exactProductPhrase: false,
      exactProfilePhrase: false,
    };
  }

  const intentPhrase = params.intentTokens.join(" ");
  const productText = params.supplier.products
    .map((product) =>
      [product.productName, product.description ?? "", product.unit ?? ""].join(" ")
    )
    .join(" ");
  const profileText = [
    params.supplier.businessName,
    params.supplier.businessType ?? "",
    params.supplier.about ?? "",
  ].join(" ");

  return {
    productOverlap: getOverlapRatio(params.intentTokens, tokenize(productText)),
    profileOverlap: getOverlapRatio(params.intentTokens, tokenize(profileText)),
    exactProductPhrase: normalizeText(productText).includes(intentPhrase),
    exactProfilePhrase: normalizeText(profileText).includes(intentPhrase),
  };
}

function getBusinessDescriptionScore(params: {
  profileSimilarity: number | null;
  exactProfilePhrase: boolean;
  profileOverlap: number;
}) {
  const semanticBoost = getSemanticSimilarityScore(params.profileSimilarity, 15);
  const keywordBoost = clampMatchScore(
    (params.exactProfilePhrase ? 2 : 0) + params.profileOverlap * 5,
    5
  );

  return clampMatchScore(semanticBoost + keywordBoost, 20);
}

function passesRfqIntentRelevanceGate(params: {
  intent: RfqMatchIntent;
  supplier: SupplierMatchCandidate;
  categoryId: number;
  productSemanticScore: number;
  profileSemanticScore: number;
  evidence: ReturnType<typeof getIntentMatchEvidence>;
}) {
  const categoryMatched = params.supplier.categoryIds.includes(params.categoryId);

  if (!params.intent.hasSpecificIntent) {
    return (
      params.productSemanticScore >= 28 ||
      (categoryMatched && params.productSemanticScore >= 22) ||
      params.evidence.productOverlap >= 0.28
    );
  }

  if (params.evidence.exactProductPhrase) {
    return true;
  }

  if (params.evidence.productOverlap >= 0.34) {
    return true;
  }

  if (params.productSemanticScore >= 56) {
    return true;
  }

  if (categoryMatched && params.productSemanticScore >= 44) {
    return true;
  }

  if (params.profileSemanticScore >= 68 && params.evidence.profileOverlap >= 0.34) {
    return true;
  }

  return false;
}

function getTemporarySupplierMatchScore(params: {
  categoryId: number;
  intent: RfqMatchIntent;
  quantity: number;
  requestedUnit: string;
  buyerLocation: Pick<BusinessProfileLocation, "city" | "province" | "region">;
  deliveryLocation: string | null;
  supplier: SupplierMatchCandidate;
}) {
  const evidence = getIntentMatchEvidence({
    intentTokens: params.intent.intentTokens,
    supplier: params.supplier,
  });
  const productRelevanceScore = getProductRelevanceScore({
    categoryId: params.categoryId,
    supplier: params.supplier,
    productSimilarity: null,
    exactProductPhrase: evidence.exactProductPhrase,
    productOverlap: evidence.productOverlap,
  });
  const relevantProducts = getRelevantSupplierProducts({
    categoryId: params.categoryId,
    intentTokens: params.intent.intentTokens,
    supplier: params.supplier,
  });
  const moqCapacityScore = getMoqCapacityScore({
    quantity: params.quantity,
    requestedUnit: params.requestedUnit,
    relevantProducts,
  });
  const profileFitScore = getBusinessDescriptionScore({
    profileSimilarity: null,
    exactProfilePhrase: evidence.exactProfilePhrase,
    profileOverlap: evidence.profileOverlap,
  });
  const locationScore = getLocationScore({
    buyerLocation: params.buyerLocation,
    deliveryLocation: params.deliveryLocation,
    softLocationPhrase: params.intent.softLocationPhrase,
    supplier: params.supplier,
  });

  return {
    score: clampMatchScore(
      productRelevanceScore + moqCapacityScore + profileFitScore + locationScore
    ),
    reason: buildMatchReason({
      productRelevanceScore,
      moqCapacityScore,
      businessDescriptionScore: profileFitScore,
      locationScore,
      supplier: params.supplier,
    }),
  };
}

async function getSemanticSupplierSignals(params: {
  categoryId: number;
  query: string;
}) {
  const searchQuery = params.query.trim();

  if (!searchQuery) {
    return new Map<
      number,
      {
        productSimilarity: number | null;
        profileSimilarity: number | null;
      }
    >();
  }

  const [productMatches, profileMatches] = await Promise.all([
    findSupplierSearchDocuments({
      query: searchQuery,
      matchCount: 120,
      categoryId: params.categoryId,
      sourceTypes: ["product"],
    }),
    findSupplierSearchDocuments({
      query: searchQuery,
      matchCount: 80,
      sourceTypes: ["profile"],
    }),
  ]);

  const signals = new Map<
    number,
    {
      productSimilarity: number | null;
      profileSimilarity: number | null;
    }
  >();

  for (const match of productMatches) {
    const current = signals.get(match.supplier_id) ?? {
      productSimilarity: null,
      profileSimilarity: null,
    };

    if (current.productSimilarity == null || match.similarity > current.productSimilarity) {
      current.productSimilarity = match.similarity;
    }

    signals.set(match.supplier_id, current);
  }

  for (const match of profileMatches) {
    const current = signals.get(match.supplier_id) ?? {
      productSimilarity: null,
      profileSimilarity: null,
    };

    if (current.profileSimilarity == null || match.similarity > current.profileSimilarity) {
      current.profileSimilarity = match.similarity;
    }

    signals.set(match.supplier_id, current);
  }

  return signals;
}

function rankSupplierMatches(
  rows: Array<{
    supplierId: number;
    matchScore: number;
    matchReason: string;
    verifiedBadge: boolean;
  }>
) {
  return [...rows].sort((left, right) => {
    if (right.matchScore !== left.matchScore) {
      return right.matchScore - left.matchScore;
    }

    if (left.verifiedBadge !== right.verifiedBadge) {
      return Number(right.verifiedBadge) - Number(left.verifiedBadge);
    }

    return left.supplierId - right.supplierId;
  });
}

function selectEligibleSupplierMatches(
  rows: Array<{
    supplierId: number;
    matchScore: number;
    matchReason: string;
    verifiedBadge: boolean;
  }>
) {
  const rankedRows = rankSupplierMatches(rows);
  const thresholds = [70, 65, 60, 55, 50];

  for (const threshold of thresholds) {
    const eligible = rankedRows.filter((row) => row.matchScore >= threshold);

    if (eligible.length >= 10 || threshold === 50) {
      return eligible.slice(0, 10);
    }
  }

  return [] as typeof rows;
}

async function getSupplierMatchCandidates() {
  const supabase = await createClient();

  const { data: supplierProfiles, error: supplierProfilesError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id, verified_badge");

  if (supplierProfilesError) {
    throw new Error(supplierProfilesError.message || "Failed to load suppliers.");
  }

  const safeSupplierProfiles = supplierProfiles ?? [];
  const profileIds = safeSupplierProfiles.map((row) => row.profile_id);
  const supplierIds = safeSupplierProfiles.map((row) => row.supplier_id);

  const [businessProfilesResult, categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("business_profiles")
      .select(
        "profile_id, business_name, business_type, business_location, about, city, province, region"
      )
      .in("profile_id", profileIds),
    supabase
      .from("business_profile_categories")
      .select("profile_id, category_id")
      .in("profile_id", profileIds),
    supabase
      .from("products")
      .select(
        "product_id, supplier_id, category_id, product_name, description, moq, max_capacity, unit, is_published"
      )
      .in("supplier_id", supplierIds)
      .eq("is_published", true),
  ]);

  if (businessProfilesResult.error) {
    throw new Error(
      businessProfilesResult.error.message || "Failed to load supplier business profiles."
    );
  }

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message || "Failed to load supplier categories.");
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Failed to load supplier products.");
  }

  const businessProfileById = new Map<number, BusinessProfileLocation>();
  for (const row of businessProfilesResult.data ?? []) {
    businessProfileById.set(row.profile_id, row as BusinessProfileLocation);
  }

  const categoryIdsByProfileId = new Map<number, number[]>();
  for (const row of categoriesResult.data ?? []) {
    if (!categoryIdsByProfileId.has(row.profile_id)) {
      categoryIdsByProfileId.set(row.profile_id, []);
    }

    categoryIdsByProfileId.get(row.profile_id)!.push(row.category_id);
  }

  const productsBySupplierId = new Map<number, SupplierMatchCandidate["products"]>();
  for (const row of productsResult.data ?? []) {
    if (!productsBySupplierId.has(row.supplier_id)) {
      productsBySupplierId.set(row.supplier_id, []);
    }

    productsBySupplierId.get(row.supplier_id)!.push({
      productId: row.product_id,
      categoryId: row.category_id,
      productName: row.product_name,
      description: row.description,
      moq: row.moq,
      maxCapacity: row.max_capacity,
      unit: row.unit,
    });
  }

  return safeSupplierProfiles
    .map((supplierProfile) => {
      const profile = businessProfileById.get(supplierProfile.profile_id);

      if (!profile) {
        return null;
      }

      return {
        supplierId: supplierProfile.supplier_id,
        profileId: supplierProfile.profile_id,
        verifiedBadge: supplierProfile.verified_badge,
        businessName: profile.business_name ?? "Unknown Supplier",
        businessType: profile.business_type,
        about: profile.about,
        businessLocation: profile.business_location,
        city: profile.city,
        province: profile.province,
        region: profile.region,
        categoryIds: categoryIdsByProfileId.get(supplierProfile.profile_id) ?? [],
        products: productsBySupplierId.get(supplierProfile.supplier_id) ?? [],
      } satisfies SupplierMatchCandidate;
    })
    .filter((row): row is SupplierMatchCandidate => row !== null);
}

export async function getTopSupplierMatchesForRfq(params: {
  categoryId: number;
  categoryName: string | null;
  productName: string;
  specifications: string | null;
  quantity: number;
  requestedUnit: string;
  deliveryLocation: string | null;
  buyerLocation: Pick<BusinessProfileLocation, "city" | "province" | "region">;
}) {
  const supplierCandidates = await getSupplierMatchCandidates();
  const intent = buildRfqMatchIntent({
    productName: params.productName,
    categoryName: params.categoryName,
    specifications: params.specifications,
    deliveryLocation: params.deliveryLocation,
  });
  const semanticQuery = [
    intent.intentQuery,
    params.categoryName?.trim() || "",
    params.productName.trim(),
  ]
    .filter((value) => value.length > 0)
    .join(" ")
    .trim();
  let semanticSignals = new Map<
    number,
    {
      productSimilarity: number | null;
      profileSimilarity: number | null;
    }
  >();

  try {
    semanticSignals = await getSemanticSupplierSignals({
      categoryId: params.categoryId,
      query: semanticQuery,
    });
  } catch (error) {
    console.error("Semantic RFQ supplier matching failed. Falling back to keyword scoring.", error);
  }

  const useSemanticSignals = semanticSignals.size > 0;

  const scoredMatches = supplierCandidates
    .map((supplier) => {
      if (!useSemanticSignals) {
        const fallbackMatch = getTemporarySupplierMatchScore({
          categoryId: params.categoryId,
          intent,
          quantity: params.quantity,
          requestedUnit: params.requestedUnit,
          buyerLocation: params.buyerLocation,
          deliveryLocation: params.deliveryLocation,
          supplier,
        });

        return {
          supplierId: supplier.supplierId,
          matchScore: fallbackMatch.score,
          matchReason: fallbackMatch.reason,
          verifiedBadge: supplier.verifiedBadge,
        };
      }

      const evidence = getIntentMatchEvidence({
        intentTokens: intent.intentTokens,
        supplier,
      });
      const semanticSignal = semanticSignals.get(supplier.supplierId) ?? {
        productSimilarity: null,
        profileSimilarity: null,
      };
      const productSemanticScore = getSemanticSimilarityScore(
        semanticSignal.productSimilarity,
        100
      );
      const profileSemanticScore = getSemanticSimilarityScore(
        semanticSignal.profileSimilarity,
        100
      );
      const relevantProducts = getRelevantSupplierProducts({
        categoryId: params.categoryId,
        intentTokens: intent.intentTokens,
        supplier,
      });
      const productRelevanceScore = getProductRelevanceScore({
        categoryId: params.categoryId,
        supplier,
        productSimilarity: semanticSignal.productSimilarity,
        exactProductPhrase: evidence.exactProductPhrase,
        productOverlap: evidence.productOverlap,
      });
      const moqCapacityScore = getMoqCapacityScore({
        quantity: params.quantity,
        requestedUnit: params.requestedUnit,
        relevantProducts,
      });
      const businessDescriptionScore = getBusinessDescriptionScore({
        profileSimilarity: semanticSignal.profileSimilarity,
        exactProfilePhrase: evidence.exactProfilePhrase,
        profileOverlap: evidence.profileOverlap,
      });
      const locationScore = getLocationScore({
        buyerLocation: params.buyerLocation,
        deliveryLocation: params.deliveryLocation,
        softLocationPhrase: intent.softLocationPhrase,
        supplier,
      });
      const totalScore = clampMatchScore(
        productRelevanceScore +
          moqCapacityScore +
          businessDescriptionScore +
          locationScore
      );

      const passesIntentGate = passesRfqIntentRelevanceGate({
        intent,
        supplier,
        categoryId: params.categoryId,
        productSemanticScore,
        profileSemanticScore,
        evidence,
      });

      return {
        supplierId: supplier.supplierId,
        matchScore: passesIntentGate ? totalScore : 0,
        matchReason: buildMatchReason({
          productRelevanceScore,
          moqCapacityScore,
          businessDescriptionScore,
          locationScore,
          supplier,
        }),
        verifiedBadge: supplier.verifiedBadge,
      };
    })
    .filter((row) => row.matchScore > 0);

  return selectEligibleSupplierMatches(scoredMatches)
    .map(({ supplierId, matchScore, matchReason }) => ({
      supplierId,
      matchScore,
      matchReason,
    }));
}

export async function createPublicSourcingRequest(input: {
  categoryId: number;
  requestedProductName: string;
  quantity: number;
  unit: string;
  specifications: string | null;
  deadline: string;
  targetPricePerUnit: number | null;
  preferredDeliveryDate: string | null;
  deliveryLocation: string | null;
}) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from("product_categories")
    .select("category_name")
    .eq("category_id", input.categoryId)
    .maybeSingle();

  if (categoryError) {
    throw new Error(categoryError.message || "Failed to load sourcing request category.");
  }

  const { data: insertedRfq, error: rfqError } = await supabase
    .from("rfqs")
    .insert({
      buyer_id: buyerContext.buyerId,
      category_id: input.categoryId,
      quantity: input.quantity,
      unit: input.unit,
      specifications: input.specifications,
      deadline: input.deadline,
      status: "open",
      visibility: "public",
      target_price_per_unit: input.targetPricePerUnit,
      preferred_delivery_date: input.preferredDeliveryDate,
      delivery_location: input.deliveryLocation,
      product_id: null,
      rfq_type: "sourcing_board",
      requested_product_name: input.requestedProductName,
    })
    .select("rfq_id")
    .single();

  if (rfqError || !insertedRfq) {
    throw new Error(rfqError?.message || "Failed to create sourcing request.");
  }

  const matches = await getTopSupplierMatchesForRfq({
    categoryId: input.categoryId,
    categoryName: categoryRow?.category_name ?? null,
    productName: input.requestedProductName,
    specifications: input.specifications,
    quantity: input.quantity,
    requestedUnit: input.unit,
    deliveryLocation: input.deliveryLocation,
    buyerLocation: {
      city: buyerContext.businessProfile.city,
      province: buyerContext.businessProfile.province,
      region: buyerContext.businessProfile.region,
    },
  });

  if (matches.length > 0) {
    const { error: requestMatchesError } = await supabase
      .from("request_matches")
      .insert(
        matches.map((match) => ({
          rfq_id: insertedRfq.rfq_id,
          supplier_id: match.supplierId,
          match_score: match.matchScore,
          match_reason: match.matchReason,
          is_visible: true,
          notified_at: new Date().toISOString(),
        }))
      );

    if (requestMatchesError) {
      throw new Error(requestMatchesError.message || "Failed to save supplier matches.");
    }
  }

  return {
    rfqId: insertedRfq.rfq_id as number,
    matchesCount: matches.length,
  };
}

function isDatePast(dateString: string | null) {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() < Date.now();
}

function formatSupplierLocationLabel(params: {
  city?: string | null;
  province?: string | null;
}) {
  const parts = [params.city, params.province].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  return parts.length > 0 ? parts.join(", ") : null;
}

async function getSupplierInfoMap(supplierIds: number[]) {
  if (supplierIds.length === 0) {
    return new Map<number, SupplierInfo>();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      supplier_id,
      verified_badge,
      business_profiles (
        business_name,
        business_type,
        city,
        province,
        user_id
      )
    `
    )
    .in("supplier_id", supplierIds);

  if (error) {
    throw new Error(error.message || "Failed to load supplier details.");
  }

  const userIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => {
          const profile = Array.isArray(row.business_profiles)
            ? row.business_profiles[0]
            : row.business_profiles;

          return profile?.user_id ?? null;
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const avatarByUserId = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("user_id, avatar_url")
      .in("user_id", userIds);

    if (usersError) {
      throw new Error(usersError.message || "Failed to load supplier avatars.");
    }

    for (const row of userRows ?? []) {
      avatarByUserId.set(row.user_id, row.avatar_url);
    }
  }

  const result = new Map<number, SupplierInfo>();

  for (const row of data ?? []) {
    const profile = Array.isArray(row.business_profiles)
      ? row.business_profiles[0]
      : row.business_profiles;

    result.set(row.supplier_id, {
      supplierName: profile?.business_name ?? "Unknown Supplier",
      verifiedBadge: row.verified_badge,
      avatarUrl: profile?.user_id ? avatarByUserId.get(profile.user_id) ?? null : null,
      businessType: profile?.business_type ?? null,
      locationLabel: formatSupplierLocationLabel({
        city: profile?.city,
        province: profile?.province,
      }),
    });
  }

  return result;
}

export async function getBuyerRfqListItems(filter?: {
  visibility?: "public" | "restricted";
  rfqType?: "direct" | "sourcing_board";
}) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return [] as BuyerRfqListItem[];
  }

  let query = supabase
    .from("rfqs")
    .select(
      `
      rfq_id,
      category_id,
      product_id,
      rfq_type,
      requested_product_name,
      quantity,
      unit,
      specifications,
      deadline,
      status,
      visibility,
      created_at,
      target_price_per_unit,
      preferred_delivery_date,
      delivery_location,
      product_categories (
        category_id,
        category_name
      ),
      products:products!rfqs_product_id_fkey (
        product_id,
        product_name
      )
    `
    )
    .eq("buyer_id", buyerContext.buyerId)
    .order("created_at", { ascending: false });

  if (filter?.visibility) {
    query = query.eq("visibility", filter.visibility);
  }

  if (filter?.rfqType) {
    query = query.eq("rfq_type", filter.rfqType);
  }

  const { data: rfqRows, error: rfqError } = await query;

  if (rfqError) {
    throw new Error(rfqError.message || "Failed to load buyer RFQs.");
  }

  if (!rfqRows || rfqRows.length === 0) {
    return [] as BuyerRfqListItem[];
  }

  const rfqIds = rfqRows.map((row) => row.rfq_id);

  const [engagementResult, requestMatchesResult] = await Promise.all([
    supabase
      .from("rfq_engagements")
      .select("engagement_id, rfq_id, supplier_id, status, final_quote_id, created_at")
      .in("rfq_id", rfqIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("request_matches")
      .select("match_id, rfq_id, supplier_id, match_score, is_visible")
      .in("rfq_id", rfqIds)
      .order("match_score", { ascending: false }),
  ]);

  if (engagementResult.error) {
    throw new Error(engagementResult.error.message || "Failed to load RFQ engagements.");
  }

  if (requestMatchesResult.error) {
    throw new Error(requestMatchesResult.error.message || "Failed to load RFQ matches.");
  }

  const engagementRows = engagementResult.data ?? [];
  const requestMatchesRows = requestMatchesResult.data ?? [];
  const supplierIds = Array.from(
    new Set(
      engagementRows
        .map((row) => row.supplier_id)
        .concat(requestMatchesRows.map((row) => row.supplier_id))
    )
  );
  const supplierMap = await getSupplierInfoMap(supplierIds);
  const engagementIds = engagementRows.map((row) => row.engagement_id);
  const rfqIdByEngagementId = new Map(
    engagementRows.map((row) => [row.engagement_id, row.rfq_id] as const)
  );

  const quotationsByRfqId = new Map<number, number>();

  if (engagementIds.length > 0) {
    const { data: quotationRows, error: quotationsError } = await supabase
      .from("quotations")
      .select("quote_id, engagement_id")
      .in("engagement_id", engagementIds);

    if (quotationsError) {
      throw new Error(quotationsError.message || "Failed to load RFQ quotations.");
    }

    for (const row of quotationRows ?? []) {
      const mappedRfqId = rfqIdByEngagementId.get(row.engagement_id);

      if (!mappedRfqId) {
        continue;
      }

      quotationsByRfqId.set(
        mappedRfqId,
        (quotationsByRfqId.get(mappedRfqId) ?? 0) + 1
      );
    }
  }

  const quoteIds = engagementRows
    .map((row) => row.final_quote_id)
    .filter((quoteId): quoteId is number => quoteId != null);
  const purchaseOrderQuoteIds = new Set<number>();

  if (quoteIds.length > 0) {
    const { data: purchaseOrderRows, error: purchaseOrdersError } = await supabase
      .from("purchase_orders")
      .select("quote_id")
      .eq("buyer_id", buyerContext.buyerId)
      .in("quote_id", quoteIds);

    if (purchaseOrdersError) {
      throw new Error(
        purchaseOrdersError.message || "Failed to load RFQ purchase orders."
      );
    }

    for (const row of purchaseOrderRows ?? []) {
      if (row.quote_id != null) {
        purchaseOrderQuoteIds.add(row.quote_id);
      }
    }
  }

  const engagementsByRfqId = new Map<number, BuyerRfqListItem["engagements"]>();
  for (const row of engagementRows) {
    if (!engagementsByRfqId.has(row.rfq_id)) {
      engagementsByRfqId.set(row.rfq_id, []);
    }

    const supplier = supplierMap.get(row.supplier_id);

    engagementsByRfqId.get(row.rfq_id)!.push({
      engagementId: row.engagement_id,
      supplierId: row.supplier_id,
      supplierName: supplier?.supplierName ?? "Unknown Supplier",
      status: row.status,
      verifiedBadge: supplier?.verifiedBadge ?? false,
      avatarUrl: supplier?.avatarUrl ?? null,
      finalQuoteId: row.final_quote_id,
    });
  }

  const supplierPreviewByRfqId = new Map<
    number,
    BuyerRfqListItem["supplierPreview"]
  >();

  for (const row of engagementRows) {
    if (supplierPreviewByRfqId.has(row.rfq_id)) {
      continue;
    }

    const supplier = supplierMap.get(row.supplier_id);
    supplierPreviewByRfqId.set(row.rfq_id, {
      supplierId: row.supplier_id,
      supplierName: supplier?.supplierName ?? "Unknown Supplier",
      verifiedBadge: supplier?.verifiedBadge ?? false,
      avatarUrl: supplier?.avatarUrl ?? null,
    });
  }

  const requestMatchStatsByRfqId = new Map<
    number,
    { total: number; visible: number; topScore: number | null }
  >();

  for (const row of requestMatchesRows) {
    const existing = requestMatchStatsByRfqId.get(row.rfq_id) ?? {
      total: 0,
      visible: 0,
      topScore: null,
    };

    existing.total += 1;
    if (row.is_visible) {
      existing.visible += 1;
    }

    if (row.match_score != null) {
      existing.topScore =
        existing.topScore == null
          ? Number(row.match_score)
          : Math.max(existing.topScore, Number(row.match_score));
    }

    requestMatchStatsByRfqId.set(row.rfq_id, existing);

    if (supplierPreviewByRfqId.has(row.rfq_id)) {
      continue;
    }

    const supplier = supplierMap.get(row.supplier_id);
    supplierPreviewByRfqId.set(row.rfq_id, {
      supplierId: row.supplier_id,
      supplierName: supplier?.supplierName ?? "Unknown Supplier",
      verifiedBadge: supplier?.verifiedBadge ?? false,
      avatarUrl: supplier?.avatarUrl ?? null,
    });
  }

  return rfqRows.map((row) => {
    const category = Array.isArray(row.product_categories)
      ? row.product_categories[0]
      : row.product_categories;
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const matchStats = requestMatchStatsByRfqId.get(row.rfq_id);

    return {
      rfqId: row.rfq_id,
      rfqType: row.rfq_type,
      productId: row.product_id,
      requestedProductName: row.requested_product_name,
      productName: getRfqDisplayName({
        requestedProductName: row.requested_product_name,
        productId: row.product_id,
        products: product,
      }),
      quantity: row.quantity,
      unit: row.unit,
      specifications: row.specifications,
      deadline: row.deadline,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.created_at,
      targetPricePerUnit:
        row.target_price_per_unit == null ? null : Number(row.target_price_per_unit),
      preferredDeliveryDate: row.preferred_delivery_date,
      deliveryLocation: row.delivery_location,
      category: category
        ? {
            categoryId: category.category_id,
            categoryName: category.category_name,
          }
        : null,
      supplierPreview: supplierPreviewByRfqId.get(row.rfq_id) ?? null,
      hasPurchaseOrder: (engagementsByRfqId.get(row.rfq_id) ?? []).some(
        (engagement) =>
          engagement.finalQuoteId != null &&
          purchaseOrderQuoteIds.has(engagement.finalQuoteId),
      ),
      quotationCount: quotationsByRfqId.get(row.rfq_id) ?? 0,
      requestMatchesCount: matchStats?.total ?? 0,
      visibleMatchesCount: matchStats?.visible ?? 0,
      topMatchScore: matchStats?.topScore ?? null,
      engagements: engagementsByRfqId.get(row.rfq_id) ?? [],
    } satisfies BuyerRfqListItem;
  });
}

export async function getBuyerRfqDetails(rfqId: number) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    return null as BuyerRfqDetailsData | null;
  }

  const { data: rfqRow, error: rfqError } = await supabase
    .from("rfqs")
    .select(
      `
      rfq_id,
      buyer_id,
      category_id,
      product_id,
      rfq_type,
      requested_product_name,
      quantity,
      unit,
      specifications,
      deadline,
      status,
      visibility,
      created_at,
      target_price_per_unit,
      preferred_delivery_date,
      delivery_location,
      product_categories (
        category_id,
        category_name
      ),
      products:products!rfqs_product_id_fkey (
        product_id,
        product_name
      )
    `
    )
    .eq("rfq_id", rfqId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (rfqError || !rfqRow) {
    return null as BuyerRfqDetailsData | null;
  }

  const [engagementResult, requestMatchesResult] = await Promise.all([
    supabase
      .from("rfq_engagements")
      .select("engagement_id, supplier_id, status, final_quote_id, created_at")
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: false }),
    supabase
      .from("request_matches")
      .select("match_id, supplier_id, match_score, match_reason, is_visible, notified_at")
      .eq("rfq_id", rfqId)
      .order("match_score", { ascending: false }),
  ]);

  if (engagementResult.error) {
    throw new Error(engagementResult.error.message || "Failed to load RFQ engagements.");
  }

  if (requestMatchesResult.error) {
    throw new Error(requestMatchesResult.error.message || "Failed to load RFQ matches.");
  }

  const engagementRows = engagementResult.data ?? [];
  const requestMatchesRows = requestMatchesResult.data ?? [];
  const supplierIds = Array.from(
    new Set(
      engagementRows
        .map((row) => row.supplier_id)
        .concat(requestMatchesRows.map((row) => row.supplier_id))
    )
  );
  const supplierMap = await getSupplierInfoMap(supplierIds);
  const engagementIds = engagementRows.map((row) => row.engagement_id);

  let quotationRows: BuyerQuotationRow[] = [];
  let offerRows: BuyerOfferRow[] = [];
  let conversationRows: Array<{ conversation_id: number; engagement_id: number }> = [];

  if (engagementIds.length > 0) {
    const [quotationsResult, offersResult, conversationsResult] = await Promise.all([
      supabase
        .from("quotations")
        .select(
          "quote_id, engagement_id, supplier_id, price_per_unit, quantity, moq, lead_time, notes, status, valid_until, created_at"
        )
        .in("engagement_id", engagementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("negotiation_offers")
        .select(
          "offer_id, engagement_id, offered_by, offer_round, price_per_unit, quantity, moq, lead_time, notes, status, created_at"
        )
        .in("engagement_id", engagementIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("conversation_id, engagement_id")
        .in("engagement_id", engagementIds),
    ]);

    if (quotationsResult.error) {
      throw new Error(quotationsResult.error.message || "Failed to load quotations.");
    }

    if (offersResult.error) {
      throw new Error(offersResult.error.message || "Failed to load negotiation offers.");
    }

    if (conversationsResult.error) {
      throw new Error(conversationsResult.error.message || "Failed to load conversations.");
    }

    quotationRows = quotationsResult.data ?? [];
    offerRows = offersResult.data ?? [];
    conversationRows = conversationsResult.data ?? [];
  }

  const quoteIds = quotationRows.map((quotation) => quotation.quote_id);
  let purchaseOrderRows: Array<{
    po_id: number;
    quote_id: number;
    status: string;
    confirmed_at: string | null;
    created_at: string;
  }> = [];

  if (quoteIds.length > 0) {
    const { data: purchaseOrders, error: purchaseOrdersError } = await supabase
      .from("purchase_orders")
      .select("po_id, quote_id, status, confirmed_at, created_at")
      .eq("buyer_id", buyerContext.buyerId)
      .in("quote_id", quoteIds)
      .order("created_at", { ascending: false });

    if (purchaseOrdersError) {
      throw new Error(
        purchaseOrdersError.message || "Failed to load RFQ purchase orders."
      );
    }

    purchaseOrderRows = purchaseOrders ?? [];
  }

  const quotationsByEngagement = new Map<number, BuyerQuotationRow[]>();
  for (const quotation of quotationRows) {
    if (!quotationsByEngagement.has(quotation.engagement_id)) {
      quotationsByEngagement.set(quotation.engagement_id, []);
    }

    quotationsByEngagement.get(quotation.engagement_id)!.push(quotation);
  }

  const offersByEngagement = new Map<number, BuyerOfferRow[]>();
  for (const offer of offerRows) {
    if (!offersByEngagement.has(offer.engagement_id)) {
      offersByEngagement.set(offer.engagement_id, []);
    }

    offersByEngagement.get(offer.engagement_id)!.push(offer);
  }

  const conversationByEngagement = new Map<number, number>();
  for (const conversation of conversationRows) {
    conversationByEngagement.set(conversation.engagement_id, conversation.conversation_id);
  }

  const category = Array.isArray(rfqRow.product_categories)
    ? rfqRow.product_categories[0]
    : rfqRow.product_categories;
  const product = Array.isArray(rfqRow.products) ? rfqRow.products[0] : rfqRow.products;

  return {
    currentAuthUserId: buyerContext.appUserId,
    rfq: {
      rfqId: rfqRow.rfq_id,
      rfqType: rfqRow.rfq_type,
      productId: rfqRow.product_id,
      requestedProductName: rfqRow.requested_product_name,
      productName: getRfqDisplayName({
        requestedProductName: rfqRow.requested_product_name,
        productId: rfqRow.product_id,
        products: product,
      }),
      quantity: rfqRow.quantity,
      unit: rfqRow.unit,
      specifications: rfqRow.specifications,
      deadline: rfqRow.deadline,
      status: rfqRow.status,
      visibility: rfqRow.visibility,
      createdAt: rfqRow.created_at,
      targetPricePerUnit:
        rfqRow.target_price_per_unit == null
          ? null
          : Number(rfqRow.target_price_per_unit),
      preferredDeliveryDate: rfqRow.preferred_delivery_date,
      deliveryLocation: rfqRow.delivery_location,
      isClosed:
        new Set(["closed", "fulfilled", "cancelled"]).has(rfqRow.status) ||
        isDatePast(rfqRow.deadline),
      category: category
        ? {
            categoryId: category.category_id,
            categoryName: category.category_name,
          }
        : null,
    },
    requestMatches: {
      totalCount: requestMatchesRows.length,
      visibleCount: requestMatchesRows.filter((row) => row.is_visible).length,
      topScore:
        requestMatchesRows.length > 0 && requestMatchesRows[0].match_score != null
          ? Number(requestMatchesRows[0].match_score)
          : null,
      suppliers: requestMatchesRows.map((row) => {
        const supplier = supplierMap.get(row.supplier_id);

        return {
          matchId: row.match_id,
          supplierId: row.supplier_id,
          supplierName: supplier?.supplierName ?? "Unknown Supplier",
          verifiedBadge: supplier?.verifiedBadge ?? false,
          avatarUrl: supplier?.avatarUrl ?? null,
          matchScore: row.match_score == null ? null : Number(row.match_score),
          matchReason: row.match_reason,
          isVisible: row.is_visible,
          notifiedAt: row.notified_at,
        };
      }),
    },
    engagements: engagementRows.map((engagement) => {
      const supplier = supplierMap.get(engagement.supplier_id);
      const offers = (offersByEngagement.get(engagement.engagement_id) ?? []).map((offer) => ({
        offerId: offer.offer_id,
        offeredBy: offer.offered_by,
        offerRound: offer.offer_round,
        pricePerUnit: offer.price_per_unit == null ? null : Number(offer.price_per_unit),
        quantity: offer.quantity,
        moq: offer.moq,
        leadTime: offer.lead_time,
        notes: offer.notes,
        status: offer.status,
        createdAt: offer.created_at,
      }));
      const quotations = (quotationsByEngagement.get(engagement.engagement_id) ?? []).map(
        (quotation) => ({
          quoteId: quotation.quote_id,
          pricePerUnit: Number(quotation.price_per_unit),
          quantity: quotation.quantity,
          moq: quotation.moq,
          leadTime: quotation.lead_time,
          notes: quotation.notes,
          status: quotation.status,
          validUntil: quotation.valid_until,
          createdAt: quotation.created_at,
        })
      );

      return {
        engagementId: engagement.engagement_id,
        supplierId: engagement.supplier_id,
        supplierName: supplier?.supplierName ?? "Unknown Supplier",
        avatarUrl: supplier?.avatarUrl ?? null,
        businessType: supplier?.businessType ?? null,
        locationLabel: supplier?.locationLabel ?? null,
        verifiedBadge: supplier?.verifiedBadge ?? false,
        status: engagement.status,
        finalQuoteId: engagement.final_quote_id,
        latestSupplierOffer:
          offers.find((offer) => offer.offeredBy !== buyerContext.appUserId) ?? null,
        offers,
        quotations,
        acceptedOffer: offers.find((offer) => offer.status === "accepted") ?? null,
        acceptedQuotation:
          quotations.find((quotation) => quotation.status === "accepted") ?? null,
        conversationId: conversationByEngagement.get(engagement.engagement_id) ?? null,
      };
    }),
    purchaseOrder:
      purchaseOrderRows[0] == null
        ? null
        : {
            poId: purchaseOrderRows[0].po_id,
            quoteId: purchaseOrderRows[0].quote_id,
            status: purchaseOrderRows[0].status,
            confirmedAt: purchaseOrderRows[0].confirmed_at,
            createdAt: purchaseOrderRows[0].created_at,
          },
  } satisfies BuyerRfqDetailsData;
}

export async function finalizeAcceptedOffer(params: {
  rfqId: number;
  engagementId: number;
  offerId: number;
}) {
  const supabase = await createClient();
  const buyerContext = await getCurrentBuyerContext();

  if (!buyerContext) {
    throw new Error("Buyer profile not found.");
  }

  const { data: rfqRow, error: rfqError } = await supabase
    .from("rfqs")
    .select("rfq_id, buyer_id")
    .eq("rfq_id", params.rfqId)
    .eq("buyer_id", buyerContext.buyerId)
    .maybeSingle();

  if (rfqError || !rfqRow) {
    throw new Error("RFQ not found or access denied.");
  }

  const { data: allEngagements, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select("engagement_id, supplier_id")
    .eq("rfq_id", params.rfqId);

  if (engagementsError) {
    throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
  }

  const chosenEngagement = (allEngagements ?? []).find(
    (engagement) => engagement.engagement_id === params.engagementId
  );

  if (!chosenEngagement) {
    throw new Error("Engagement not found.");
  }

  const { data: offerRow, error: offerError } = await supabase
    .from("negotiation_offers")
    .select(
      "offer_id, engagement_id, price_per_unit, quantity, moq, lead_time, notes"
    )
    .eq("offer_id", params.offerId)
    .eq("engagement_id", params.engagementId)
    .maybeSingle();

  if (offerError || !offerRow) {
    throw new Error("Offer not found.");
  }

  if (
    offerRow.price_per_unit == null ||
    offerRow.quantity == null ||
    offerRow.moq == null
  ) {
    throw new Error("Selected offer is incomplete and cannot become a quotation.");
  }

  const engagementIds = (allEngagements ?? []).map((engagement) => engagement.engagement_id);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  const { data: existingChosenQuote } = await supabase
    .from("quotations")
    .select("quote_id")
    .eq("engagement_id", params.engagementId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let acceptedQuoteId: number;

  if (existingChosenQuote?.quote_id) {
    const { data: updatedQuote, error: updateChosenQuoteError } = await supabase
      .from("quotations")
      .update({
        supplier_id: chosenEngagement.supplier_id,
        price_per_unit: offerRow.price_per_unit,
        quantity: offerRow.quantity,
        moq: offerRow.moq,
        lead_time: offerRow.lead_time,
        notes: offerRow.notes,
        status: "accepted",
        valid_until: validUntil.toISOString().slice(0, 10),
      })
      .eq("quote_id", existingChosenQuote.quote_id)
      .select("quote_id")
      .single();

    if (updateChosenQuoteError || !updatedQuote) {
      throw new Error(updateChosenQuoteError?.message || "Failed to accept quotation.");
    }

    acceptedQuoteId = updatedQuote.quote_id;
  } else {
    const { data: insertedQuote, error: insertQuoteError } = await supabase
      .from("quotations")
      .insert({
        engagement_id: params.engagementId,
        supplier_id: chosenEngagement.supplier_id,
        price_per_unit: offerRow.price_per_unit,
        quantity: offerRow.quantity,
        moq: offerRow.moq,
        lead_time: offerRow.lead_time,
        notes: offerRow.notes,
        status: "accepted",
        valid_until: validUntil.toISOString().slice(0, 10),
      })
      .select("quote_id")
      .single();

    if (insertQuoteError || !insertedQuote) {
      throw new Error(insertQuoteError?.message || "Failed to create accepted quotation.");
    }

    acceptedQuoteId = insertedQuote.quote_id;
  }

  const [acceptOfferResult, rejectOtherOffersResult, rejectOtherQuotesResult] =
    await Promise.all([
      supabase
        .from("negotiation_offers")
        .update({ status: "accepted" })
        .eq("offer_id", params.offerId),
      supabase
        .from("negotiation_offers")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .neq("offer_id", params.offerId)
        .in("status", ["pending", "countered"]),
      supabase
        .from("quotations")
        .update({ status: "rejected" })
        .in("engagement_id", engagementIds)
        .neq("quote_id", acceptedQuoteId)
        .neq("status", "accepted"),
    ]);

  if (acceptOfferResult.error) {
    throw new Error(acceptOfferResult.error.message || "Failed to accept selected offer.");
  }

  if (rejectOtherOffersResult.error) {
    throw new Error(rejectOtherOffersResult.error.message || "Failed to reject other offers.");
  }

  if (rejectOtherQuotesResult.error) {
    throw new Error(rejectOtherQuotesResult.error.message || "Failed to reject other quotations.");
  }

  const otherEngagementIds = engagementIds.filter(
    (engagementId) => engagementId !== params.engagementId
  );

  const updates = [
    supabase
      .from("rfq_engagements")
      .update({
        status: "accepted",
        final_quote_id: acceptedQuoteId,
      })
      .eq("engagement_id", params.engagementId),
    supabase.from("rfqs").update({ status: "fulfilled" }).eq("rfq_id", params.rfqId),
    supabase
      .from("request_matches")
      .update({ is_visible: false })
      .eq("rfq_id", params.rfqId),
  ];

  if (otherEngagementIds.length > 0) {
    updates.push(
      supabase
        .from("rfq_engagements")
        .update({ status: "rejected" })
        .in("engagement_id", otherEngagementIds)
    );
  }

  const updateResults = await Promise.all(updates);
  const failedUpdate = updateResults.find((result) => result.error);

  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || "Failed to finalize RFQ acceptance.");
  }

  return {
    acceptedQuoteId,
  };
}
