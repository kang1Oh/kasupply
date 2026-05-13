"use server";

import { findSupplierSearchDocuments } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export type SupplierSearchItem = {
  supplierId: number;
  profileId: number;
  avatarUrl: string | null;
  businessName: string;
  businessType: string;
  businessLocation: string;
  city: string;
  province: string;
  region: string;
  about: string | null;
  verified: boolean;
  verifiedBadge: boolean;
  products: {
    productId: number;
    productName: string;
    categoryName: string;
    description: string | null;
    pricePerUnit: number;
    unit: string;
    moq: number;
  }[];
  searchableProducts: {
    productName: string;
    categoryName: string;
    description: string | null;
  }[];
  certificationsCount: number;
  reviewCount: number;
  averageOverallRating: number | null;
  searchScore: number | null;
  semanticSimilarity: number | null;
  keywordScore: number | null;
  matchLabel: string | null;
  matchReason: string | null;
};

type GetSuppliersParams = {
  query?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
};

type SupplierRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_badge: boolean;
  business_profiles:
    | {
        profile_id: number;
        user_id: string | null;
        business_name: string;
        business_type: string;
        business_location: string;
        city: string;
        province: string;
        region: string;
        about: string | null;
      }
    | {
        profile_id: number;
        user_id: string | null;
        business_name: string;
        business_type: string;
        business_location: string;
        city: string;
        province: string;
        region: string;
        about: string | null;
      }[]
    | null;
};

type ProductRow = {
  product_id: number;
  supplier_id: number;
  product_name: string;
  description: string | null;
  price_per_unit: number;
  unit: string;
  moq: number;
  is_published: boolean;
  product_categories:
    | {
        category_name?: string | null;
      }
    | {
        category_name?: string | null;
      }[]
    | null;
};

type SupplierReviewSummaryRow = {
  supplier_id: number;
  overall_rating: number;
};

type SearchIntent = {
  detectedCity: string | null;
  detectedProvince: string | null;
  detectedRegion: string | null;
  locationTokens: string[];
  softLocationPhrase: string | null;
  intentTokens: string[];
  intentQuery: string;
  hasSpecificIntent: boolean;
};

const GENERIC_QUERY_TOKENS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "by",
  "city",
  "companies",
  "company",
  "distributor",
  "distributors",
  "for",
  "from",
  "in",
  "located",
  "manufacturer",
  "manufacturers",
  "near",
  "nearby",
  "of",
  "or",
  "provider",
  "providers",
  "region",
  "seller",
  "sellers",
  "supplier",
  "suppliers",
  "the",
  "to",
  "trader",
  "traders",
  "vendor",
  "vendors",
  "wholesaler",
  "wholesalers",
  "with",
]);

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function tokenize(value: string | null | undefined) {
  return Array.from(
    new Set(
      normalizeText(value)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2)
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function getSemanticSimilarityScore(similarity: number | null | undefined) {
  if (similarity == null || !Number.isFinite(similarity)) {
    return 0;
  }

  const normalized = Math.max(0, Math.min(1, (similarity - 0.58) / 0.28));
  return clampScore(normalized * 100);
}

function getSemanticMatchLabel(score: number) {
  if (score >= 88) return "Excellent match";
  if (score >= 76) return "Strong match";
  if (score >= 64) return "Relevant match";
  return "Possible match";
}

function findLocationPhraseMatch(query: string, candidates: string[]) {
  const normalizedQuery = normalizeText(query);
  const normalizedCandidates = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.trim())
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
    )
  );

  for (const candidate of normalizedCandidates) {
    const normalizedCandidate = normalizeText(candidate);

    if (normalizedCandidate && normalizedQuery.includes(normalizedCandidate)) {
      return candidate;
    }
  }

  return null;
}

function extractSoftLocationPhrase(query: string) {
  const normalizedQuery = normalizeText(query);
  const pattern =
    /\b(?:in|near|around|within|from)\s+([a-z0-9\s-]{3,})$/i;
  const match = normalizedQuery.match(pattern);

  if (!match) {
    return null;
  }

  const phrase = match[1]
    .replace(/\b(area|location|place)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return phrase.length >= 3 ? phrase : null;
}

function buildSearchIntent(params: {
  query: string;
  cities: string[];
  provinces: string[];
  regions: string[];
}): SearchIntent {
  const detectedCity = findLocationPhraseMatch(params.query, params.cities);
  const detectedProvince =
    detectedCity == null ? findLocationPhraseMatch(params.query, params.provinces) : null;
  const detectedRegion =
    detectedCity == null && detectedProvince == null
      ? findLocationPhraseMatch(params.query, params.regions)
      : null;
  const softLocationPhrase =
    detectedCity == null && detectedProvince == null && detectedRegion == null
      ? extractSoftLocationPhrase(params.query)
      : null;

  const locationTokens = tokenize(
    [detectedCity, detectedProvince, detectedRegion, softLocationPhrase]
      .filter(Boolean)
      .join(" ")
  );
  const intentTokens = tokenize(params.query).filter(
    (token) => !GENERIC_QUERY_TOKENS.has(token) && !locationTokens.includes(token)
  );

  return {
    detectedCity,
    detectedProvince,
    detectedRegion,
    locationTokens,
    softLocationPhrase,
    intentTokens,
    intentQuery: intentTokens.join(" "),
    hasSpecificIntent: intentTokens.length > 0,
  };
}

function getIntentAwareKeywordScore(params: {
  query: string;
  intentTokens: string[];
  supplier: Pick<
    SupplierSearchItem,
    | "businessName"
    | "about"
    | "searchableProducts"
  >;
}) {
  const normalizedQuery = normalizeText(params.query);
  const queryTokens = params.intentTokens.length > 0 ? params.intentTokens : tokenize(params.query);

  if (!normalizedQuery || queryTokens.length === 0) {
    return 0;
  }

  const profileText = [
    params.supplier.businessName,
    params.supplier.about ?? "",
  ].join(" ");

  const productText = params.supplier.searchableProducts
    .map((product) =>
      [product.productName, product.categoryName, product.description ?? ""].join(" ")
    )
    .join(" ");

  const fullText = `${profileText} ${productText}`.trim();
  const fullTokens = tokenize(fullText);
  const productTokens = tokenize(productText);
  const profileTokens = tokenize(profileText);

  const exactPhraseBoost =
    params.intentTokens.length > 0 && normalizeText(fullText).includes(params.intentTokens.join(" "))
      ? 28
      : normalizeText(fullText).includes(normalizedQuery)
        ? 10
        : 0;
  const productOverlapScore = getOverlapRatio(queryTokens, productTokens) * 55;
  const profileOverlapScore = getOverlapRatio(queryTokens, profileTokens) * 18;
  const fullOverlapScore = getOverlapRatio(queryTokens, fullTokens) * 12;

  return clampScore(
    exactPhraseBoost + productOverlapScore + profileOverlapScore + fullOverlapScore
  );
}

function getStructuredBoost(params: {
  supplier: Pick<
    SupplierSearchItem,
    "verifiedBadge" | "products" | "city" | "province" | "businessLocation" | "about"
  >;
  locationCity: string;
  locationProvince: string;
  softLocationPhrase: string | null;
  normalizedCategory: string;
}) {
  let boost = 0;

  if (params.supplier.verifiedBadge) {
    boost += 4;
  }

  if (
    params.locationCity &&
    normalizeText(params.supplier.city) === params.locationCity
  ) {
    boost += 8;
  } else if (
    params.locationProvince &&
    normalizeText(params.supplier.province) === params.locationProvince
  ) {
    boost += 5;
  }

  if (
    params.normalizedCategory &&
    params.supplier.products.some(
      (product) => normalizeText(product.categoryName) === params.normalizedCategory
    )
  ) {
    boost += 4;
  }

  if (params.softLocationPhrase) {
    const normalizedSoftLocation = normalizeText(params.softLocationPhrase);
    const searchableLocationText = normalizeText(
      `${params.supplier.businessLocation} ${params.supplier.about ?? ""}`
    );

    if (searchableLocationText.includes(normalizedSoftLocation)) {
      boost += 7;
    } else {
      const softLocationTokens = tokenize(normalizedSoftLocation);
      const searchableLocationTokens = tokenize(searchableLocationText);
      const overlapRatio = getOverlapRatio(softLocationTokens, searchableLocationTokens);

      if (overlapRatio >= 0.7) {
        boost += 5;
      } else if (overlapRatio >= 0.45) {
        boost += 3;
      }
    }
  }

  return boost;
}

function getIntentMatchEvidence(params: {
  intentTokens: string[];
  supplier: Pick<SupplierSearchItem, "businessName" | "about" | "searchableProducts">;
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
  const productText = params.supplier.searchableProducts
    .map((product) =>
      [product.productName, product.categoryName, product.description ?? ""].join(" ")
    )
    .join(" ");
  const profileText = [params.supplier.businessName, params.supplier.about ?? ""].join(" ");

  return {
    productOverlap: getOverlapRatio(params.intentTokens, tokenize(productText)),
    profileOverlap: getOverlapRatio(params.intentTokens, tokenize(profileText)),
    exactProductPhrase: normalizeText(productText).includes(intentPhrase),
    exactProfilePhrase: normalizeText(profileText).includes(intentPhrase),
  };
}

function passesIntentRelevanceGate(params: {
  intent: SearchIntent;
  supplier: Pick<SupplierSearchItem, "businessName" | "about" | "searchableProducts">;
  keywordScore: number;
  productSemanticScore: number;
  profileSemanticScore: number;
}) {
  if (!params.intent.hasSpecificIntent) {
    return params.keywordScore > 0 || params.productSemanticScore >= 28 || params.profileSemanticScore >= 34;
  }

  const evidence = getIntentMatchEvidence({
    intentTokens: params.intent.intentTokens,
    supplier: params.supplier,
  });

  if (evidence.exactProductPhrase) {
    return true;
  }

  if (evidence.productOverlap >= 0.34) {
    return true;
  }

  if (params.productSemanticScore >= 56) {
    return true;
  }

  if (params.profileSemanticScore >= 68 && evidence.profileOverlap >= 0.34) {
    return true;
  }

  if (params.keywordScore >= 42) {
    return true;
  }

  return false;
}

export async function getSupplierSearchResults(
  params: GetSuppliersParams = {}
): Promise<SupplierSearchItem[]> {
  const supabase = await createClient();

  const { query = "", city = "", category = "", verifiedOnly = false } = params;

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  const supplierRowsPromise = supabase
    .from("supplier_profiles")
    .select(
      `
      supplier_id,
      profile_id,
      verified,
      verified_badge,
      business_profiles (
        profile_id,
        user_id,
        business_name,
        business_type,
        business_location,
        city,
        province,
        region,
        about
      )
    `
    )
    .order("supplier_id", { ascending: false });
  const productRowsPromise = supabase
    .from("products")
    .select(
      `
      product_id,
      supplier_id,
      product_name,
      description,
      price_per_unit,
      unit,
      moq,
      is_published,
      product_categories (
        category_name
      )
    `
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false });
  const certificationRowsPromise = supabase
    .from("supplier_certifications")
    .select("supplier_id, status")
    .eq("status", "approved");
  const supplierReviewRowsPromise = supabase
    .from("supplier_reviews")
    .select("supplier_id, overall_rating");

  const [
    { data: supplierRows, error: supplierError },
    { data: productRows, error: productError },
    { data: certificationRows, error: certificationError },
    { data: supplierReviewRows, error: supplierReviewError },
  ] = await Promise.all([
    supplierRowsPromise,
    productRowsPromise,
    certificationRowsPromise,
    supplierReviewRowsPromise,
  ]);

  if (supplierError) {
    console.error("Error fetching supplier profiles:", supplierError);
    throw new Error("Failed to fetch suppliers.");
  }

  const safeSupplierRows = (supplierRows as SupplierRow[] | null) ?? [];
  const supplierLocations = {
    cities: safeSupplierRows
      .map((row) => {
        const profile = Array.isArray(row.business_profiles)
          ? row.business_profiles[0]
          : row.business_profiles;
        return profile?.city ?? "";
      })
      .filter(Boolean),
    provinces: safeSupplierRows
      .map((row) => {
        const profile = Array.isArray(row.business_profiles)
          ? row.business_profiles[0]
          : row.business_profiles;
        return profile?.province ?? "";
      })
      .filter(Boolean),
    regions: safeSupplierRows
      .map((row) => {
        const profile = Array.isArray(row.business_profiles)
          ? row.business_profiles[0]
          : row.business_profiles;
        return profile?.region ?? "";
      })
      .filter(Boolean),
  };
  const searchIntent = buildSearchIntent({
    query,
    cities: supplierLocations.cities,
    provinces: supplierLocations.provinces,
    regions: supplierLocations.regions,
  });
  const effectiveCityFilter = normalizedCity || normalizeText(searchIntent.detectedCity);
  const effectiveProvinceFilter = normalizeText(searchIntent.detectedProvince);
  const effectiveRegionFilter = normalizeText(searchIntent.detectedRegion);

  const userIds = Array.from(
    new Set(
      safeSupplierRows
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
  const activeUserIds = new Set<string>();

  if (userIds.length > 0) {
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("user_id, avatar_url, status")
      .in("user_id", userIds);

    if (userError) {
      console.error("Error fetching supplier avatars:", userError);
      throw new Error("Failed to fetch supplier avatars.");
    }

    for (const row of userRows ?? []) {
      avatarByUserId.set(row.user_id, row.avatar_url);

      if (normalizeText(row.status) === "active") {
        activeUserIds.add(row.user_id);
      }
    }
  }

  if (productError) {
    console.error("Error fetching products:", productError);
    throw new Error("Failed to fetch products.");
  }

  if (certificationError) {
    console.error("Error fetching certifications:", certificationError);
    throw new Error("Failed to fetch certifications.");
  }

  if (supplierReviewError) {
    console.error("Error fetching supplier reviews:", supplierReviewError);
    throw new Error("Failed to fetch supplier review summaries.");
  }

  const productsBySupplier = new Map<number, SupplierSearchItem["products"]>();

  for (const row of ((productRows as ProductRow[] | null) ?? [])) {
    const supplierId = row.supplier_id;

    if (!productsBySupplier.has(supplierId)) {
      productsBySupplier.set(supplierId, []);
    }

    productsBySupplier.get(supplierId)!.push({
      productId: row.product_id,
      productName: row.product_name,
      categoryName:
        Array.isArray(row.product_categories)
          ? row.product_categories[0]?.category_name ?? "Uncategorized"
          : (row.product_categories as { category_name?: string } | null)
              ?.category_name ?? "Uncategorized",
      description: row.description,
      pricePerUnit: Number(row.price_per_unit),
      unit: row.unit,
      moq: row.moq,
    });
  }

  const certificationCountBySupplier = new Map<number, number>();

  for (const row of certificationRows ?? []) {
    certificationCountBySupplier.set(
      row.supplier_id,
      (certificationCountBySupplier.get(row.supplier_id) ?? 0) + 1
    );
  }

  const reviewSummaryBySupplier = new Map<
    number,
    {
      reviewCount: number;
      averageOverallRating: number | null;
    }
  >();

  for (const row of ((supplierReviewRows as SupplierReviewSummaryRow[] | null) ?? [])) {
    const current = reviewSummaryBySupplier.get(row.supplier_id) ?? {
      reviewCount: 0,
      averageOverallRating: 0,
    };

    current.reviewCount += 1;
    current.averageOverallRating = (current.averageOverallRating ?? 0) + Number(row.overall_rating);
    reviewSummaryBySupplier.set(row.supplier_id, current);
  }

  for (const [supplierId, summary] of reviewSummaryBySupplier) {
    reviewSummaryBySupplier.set(supplierId, {
      reviewCount: summary.reviewCount,
      averageOverallRating:
        summary.reviewCount > 0
          ? Number(((summary.averageOverallRating ?? 0) / summary.reviewCount).toFixed(1))
          : null,
    });
  }

  const results: SupplierSearchItem[] = [];

  for (const row of safeSupplierRows) {
    const profile = Array.isArray(row.business_profiles)
      ? row.business_profiles[0]
      : row.business_profiles;

    if (!profile) continue;
    if (!profile.user_id || !activeUserIds.has(profile.user_id)) continue;

    const supplierProducts = productsBySupplier.get(row.supplier_id) ?? [];

    results.push({
      supplierId: row.supplier_id,
      profileId: profile.profile_id,
      avatarUrl: profile.user_id ? avatarByUserId.get(profile.user_id) ?? null : null,
      businessName: profile.business_name,
      businessType: profile.business_type,
      businessLocation: profile.business_location,
      city: profile.city,
      province: profile.province,
      region: profile.region,
      about: profile.about,
      verified: row.verified,
      verifiedBadge: row.verified_badge,
      products: supplierProducts.slice(0, 4),
      searchableProducts: supplierProducts.map((product) => ({
        productName: product.productName,
        categoryName: product.categoryName,
        description: product.description,
      })),
      certificationsCount: certificationCountBySupplier.get(row.supplier_id) ?? 0,
      reviewCount: reviewSummaryBySupplier.get(row.supplier_id)?.reviewCount ?? 0,
      averageOverallRating:
        reviewSummaryBySupplier.get(row.supplier_id)?.averageOverallRating ?? null,
      searchScore: null,
      semanticSimilarity: null,
      keywordScore: null,
      matchLabel: null,
      matchReason: null,
    });
  }

  let filteredResults = results.filter((supplier) => {
    if (!supplier.verifiedBadge && !supplier.verified) {
      return false;
    }

    if (verifiedOnly && !supplier.verifiedBadge) {
      return false;
    }

    if (effectiveCityFilter || effectiveProvinceFilter || effectiveRegionFilter) {
      const cityMatches = effectiveCityFilter
        ? normalizeText(supplier.city).includes(effectiveCityFilter)
        : false;
      const provinceMatches = effectiveProvinceFilter
        ? normalizeText(supplier.province).includes(effectiveProvinceFilter)
        : false;
      const regionMatches = effectiveRegionFilter
        ? normalizeText(supplier.region).includes(effectiveRegionFilter)
        : false;

      if (!cityMatches && !provinceMatches && !regionMatches) {
        return false;
      }
    }

    if (normalizedCategory) {
      const categoryMatches = supplier.products.some((product) =>
        normalizeText(product.categoryName).includes(normalizedCategory)
      );

      if (!categoryMatches) {
        return false;
      }
    }

    return true;
  });

  if (!normalizedQuery) {
    return filteredResults.sort((left, right) => right.supplierId - left.supplierId);
  }

  const semanticMatchesBySupplier = new Map<
    number,
    {
      productSimilarity: number | null;
      profileSimilarity: number | null;
      bestSourceType: "profile" | "product" | null;
      bestSimilarity: number;
      matchCount: number;
    }
  >();

  try {
    const semanticMatches = await findSupplierSearchDocuments({
      query: searchIntent.intentQuery || query,
      matchCount: 60,
      sourceTypes: ["profile", "product"],
      city: searchIntent.detectedCity,
      province: searchIntent.detectedCity ? null : searchIntent.detectedProvince,
      region:
        searchIntent.detectedCity || searchIntent.detectedProvince
          ? null
          : searchIntent.detectedRegion,
    });

    for (const match of semanticMatches) {
      const similarity = getSemanticSimilarityScore(match.similarity);
      const existing = semanticMatchesBySupplier.get(match.supplier_id) ?? {
        productSimilarity: null,
        profileSimilarity: null,
        bestSourceType: null,
        bestSimilarity: 0,
        matchCount: 0,
      };

      if (match.source_type === "product") {
        existing.productSimilarity = Math.max(existing.productSimilarity ?? 0, similarity);
      } else {
        existing.profileSimilarity = Math.max(existing.profileSimilarity ?? 0, similarity);
      }

      if (similarity > existing.bestSimilarity) {
        existing.bestSimilarity = similarity;
        existing.bestSourceType = match.source_type;
      }

      existing.matchCount += 1;
      semanticMatchesBySupplier.set(match.supplier_id, existing);
    }
  } catch (error) {
    console.error("Semantic supplier search failed. Falling back to keyword ranking.", error);
  }

  const scoredResults: Array<SupplierSearchItem | null> = filteredResults.map((supplier) => {
      const semanticMatch = semanticMatchesBySupplier.get(supplier.supplierId);
      const keywordScore = getIntentAwareKeywordScore({
        query: searchIntent.intentQuery || query,
        intentTokens: searchIntent.intentTokens,
        supplier,
      });
      const structuredBoost = getStructuredBoost({
        supplier,
        locationCity: effectiveCityFilter,
        locationProvince: effectiveProvinceFilter,
        softLocationPhrase: searchIntent.softLocationPhrase,
        normalizedCategory,
      });
      const productSemanticScore = semanticMatch?.productSimilarity ?? 0;
      const profileSemanticScore = semanticMatch?.profileSimilarity ?? 0;
      const semanticScore = searchIntent.hasSpecificIntent
        ? productSemanticScore * 0.75 + profileSemanticScore * 0.25
        : Math.max(productSemanticScore, profileSemanticScore);
      const hybridScore =
        semanticScore > 0
          ? semanticScore * 0.55 + keywordScore * 0.35 + structuredBoost
          : keywordScore * 0.8 + structuredBoost;
      const finalScore = clampScore(hybridScore);

      if (
        !passesIntentRelevanceGate({
          intent: searchIntent,
          supplier,
          keywordScore,
          productSemanticScore,
          profileSemanticScore,
        })
      ) {
        return null;
      }

      const minimumScore = searchIntent.hasSpecificIntent ? 32 : 18;
      if (finalScore < minimumScore) {
        return null;
      }

      return {
        ...supplier,
        searchScore: finalScore,
        semanticSimilarity: semanticMatch?.bestSimilarity ?? null,
        keywordScore: keywordScore > 0 ? keywordScore : null,
        matchLabel: getSemanticMatchLabel(finalScore),
        matchReason:
          semanticMatch != null
            ? semanticMatch.bestSourceType === "product"
              ? "Matched using product relevance with location-aware filtering."
              : "Matched using business niche relevance with location-aware filtering."
            : "Matched using keyword relevance.",
      } satisfies SupplierSearchItem;
    });

  filteredResults = scoredResults
    .filter((supplier): supplier is SupplierSearchItem => supplier !== null)
    .sort((left, right) => {
      const leftScore = left.searchScore ?? 0;
      const rightScore = right.searchScore ?? 0;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return right.supplierId - left.supplierId;
    });

  return filteredResults;
}
