import { BuyerMarketplaceHome } from "@/components/buyer-marketplace-home";
import { type BuyerHomepageSupplier } from "@/components/buyer-supplier-card";
import { getBuyerPurchaseOrders } from "@/app/buyer/(protected)/purchase-orders/data";
import { getCurrentBuyerContext } from "@/lib/buyer/rfq-workflows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProductCategoryRow = {
  category_id: number;
  category_name: string;
};

type BusinessProfileCategoryRow = {
  category_id: number;
};

type PublishedProductRow = {
  product_id: number;
  supplier_id: number;
  category_id: number | null;
  product_name: string;
  image_url: string | null;
  price_per_unit: number | null;
  unit: string | null;
  product_categories:
    | {
        category_id?: number | null;
        category_name?: string | null;
      }
    | {
        category_id?: number | null;
        category_name?: string | null;
      }[]
    | null;
};

type SupplierReviewRow = {
  review_id: number;
  supplier_id: number;
  overall_rating: number;
};

type SupplierDirectoryRow = {
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
        city: string;
        about: string | null;
      }
    | {
        profile_id: number;
        user_id: string | null;
        business_name: string;
        business_type: string;
        city: string;
        about: string | null;
      }[]
    | null;
};

type SupplierDirectoryProductRow = {
  supplier_id: number;
  product_name: string;
  product_categories:
    | {
        category_name?: string | null;
      }
    | {
        category_name?: string | null;
      }[]
    | null;
};

type HomepageSupplierDirectoryItem = {
  supplierId: number;
  profileId: number;
  avatarUrl: string | null;
  businessName: string;
  businessType: string;
  city: string;
  about: string | null;
  verified: boolean;
  verifiedBadge: boolean;
  categoryTags: string[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
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

async function getProductImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null,
) {
  if (!filePath) {
    return null;
  }

  if (isAbsoluteUrl(filePath)) {
    return filePath;
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(filePath, 60 * 60);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

function buildBrowseCategoryCards(params: {
  buyerCategoryIds: Set<number>;
  products: PublishedProductRow[];
}) {
  const cardsByCategory = new Map<
    number,
    {
      categoryId: number;
      categoryName: string;
      productCount: number;
      isBuyerInterest: boolean;
      sampleProducts: Array<{
        productId: number;
        supplierId: number;
        productName: string;
        imagePath: string | null;
        pricePerUnit: number | null;
        unit: string | null;
      }>;
    }
  >();

  for (const row of params.products) {
    const joinedCategory = Array.isArray(row.product_categories)
      ? row.product_categories[0]
      : row.product_categories;
    const categoryId = row.category_id ?? joinedCategory?.category_id ?? null;
    const categoryName = joinedCategory?.category_name?.trim() ?? "";

    if (categoryId == null || !categoryName) {
      continue;
    }

    const existing = cardsByCategory.get(categoryId) ?? {
      categoryId,
      categoryName,
      productCount: 0,
      isBuyerInterest: params.buyerCategoryIds.has(categoryId),
      sampleProducts: [],
    };

    existing.productCount += 1;

    if (
      existing.sampleProducts.length < 3 &&
      !existing.sampleProducts.some(
        (product) => normalizeText(product.productName) === normalizeText(row.product_name),
      )
    ) {
      existing.sampleProducts.push({
        productId: row.product_id,
        supplierId: row.supplier_id,
        productName: row.product_name,
        imagePath: row.image_url,
        pricePerUnit:
          row.price_per_unit == null ? null : Number(row.price_per_unit),
        unit: row.unit,
      });
    }

    cardsByCategory.set(categoryId, existing);
  }

  return [...cardsByCategory.values()]
    .filter((card) => card.sampleProducts.length > 0)
    .sort((left, right) => {
      if (left.isBuyerInterest !== right.isBuyerInterest) {
        return Number(right.isBuyerInterest) - Number(left.isBuyerInterest);
      }

      if (right.productCount !== left.productCount) {
        return right.productCount - left.productCount;
      }

      return left.categoryName.localeCompare(right.categoryName);
    })
    .slice(0, 12);
}

function buildPopularRecommendedSuppliers(params: {
  supplierDirectory: HomepageSupplierDirectoryItem[];
  reviewRows: SupplierReviewRow[];
}) {
  const reviewStatsBySupplierId = new Map<
    number,
    {
      reviewCount: number;
      positiveReviewCount: number;
      averageRating: number;
      totalRating: number;
    }
  >();

  for (const review of params.reviewRows) {
    const existing = reviewStatsBySupplierId.get(review.supplier_id) ?? {
      reviewCount: 0,
      positiveReviewCount: 0,
      averageRating: 0,
      totalRating: 0,
    };

    existing.reviewCount += 1;
    existing.totalRating += Number(review.overall_rating);

    if (Number(review.overall_rating) >= 4) {
      existing.positiveReviewCount += 1;
    }

    existing.averageRating = existing.totalRating / existing.reviewCount;
    reviewStatsBySupplierId.set(review.supplier_id, existing);
  }

  const suppliersWithReviews = params.supplierDirectory
    .map((supplier) => {
      const stats = reviewStatsBySupplierId.get(supplier.supplierId);

      if (!stats || stats.reviewCount === 0) {
        return null;
      }

      return {
        supplierId: supplier.supplierId,
        profileId: supplier.profileId,
        name: supplier.businessName,
        initials: getInitials(supplier.businessName),
        avatarUrl: supplier.avatarUrl,
        supplierType: supplier.businessType,
        categoryTags: supplier.categoryTags,
        shortDescription:
          supplier.about?.trim() || "No business description provided yet.",
        location: supplier.city,
        verified: supplier.verifiedBadge || supplier.verified,
        recommendationScore: Number(stats.averageRating.toFixed(2)),
        matchLabel: `${stats.averageRating.toFixed(1)} rating`,
        reviewLabel: `${stats.reviewCount} review${
          stats.reviewCount === 1 ? "" : "s"
        }`,
      } satisfies BuyerHomepageSupplier;
    })
    .filter((supplier): supplier is BuyerHomepageSupplier => supplier !== null)
    .sort((left, right) => {
      const leftStats = reviewStatsBySupplierId.get(left.supplierId);
      const rightStats = reviewStatsBySupplierId.get(right.supplierId);
      const ratingDifference =
        (rightStats?.averageRating ?? 0) - (leftStats?.averageRating ?? 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      const positiveDifference =
        (rightStats?.positiveReviewCount ?? 0) - (leftStats?.positiveReviewCount ?? 0);

      if (positiveDifference !== 0) {
        return positiveDifference;
      }

      const countDifference =
        (rightStats?.reviewCount ?? 0) - (leftStats?.reviewCount ?? 0);

      if (countDifference !== 0) {
        return countDifference;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 8);

  if (suppliersWithReviews.length > 0) {
    return suppliersWithReviews;
  }

  return params.supplierDirectory
    .slice(0, 8)
    .map((supplier) => {
      return {
        supplierId: supplier.supplierId,
        profileId: supplier.profileId,
        name: supplier.businessName,
        initials: getInitials(supplier.businessName),
        avatarUrl: supplier.avatarUrl,
        supplierType: supplier.businessType,
        categoryTags: supplier.categoryTags,
        shortDescription:
          supplier.about?.trim() || "No business description provided yet.",
        location: supplier.city,
        verified: supplier.verifiedBadge || supplier.verified,
        recommendationScore: 0,
        matchLabel: supplier.verifiedBadge ? "Verified supplier" : "Featured supplier",
        reviewLabel: "No reviews yet",
      } satisfies BuyerHomepageSupplier;
    });
}

async function loadHomepageSupplierReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const adminClient = createAdminClient();
  const reviewsClient = adminClient ?? supabase;
  const { data, error } = await reviewsClient
    .from("supplier_reviews")
    .select("review_id, supplier_id, overall_rating");

  return {
    data: (data as SupplierReviewRow[] | null) ?? [],
    error,
  };
}

async function loadHomepageSupplierDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const [
    { data: supplierRows, error: supplierError },
    { data: productRows, error: productError },
  ] = await Promise.all([
    supabase
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
          city,
          about
        )
      `,
      )
      .order("supplier_id", { ascending: false }),
    supabase
      .from("products")
      .select(
        `
        supplier_id,
        product_name,
        product_categories (
          category_name
        )
      `,
      )
      .eq("is_published", true)
      .order("updated_at", { ascending: false }),
  ]);

  if (supplierError) {
    throw new Error(supplierError.message || "Failed to load homepage suppliers.");
  }

  if (productError) {
    throw new Error(productError.message || "Failed to load homepage products.");
  }

  const safeSupplierRows = (supplierRows as SupplierDirectoryRow[] | null) ?? [];
  const safeProductRows = (productRows as SupplierDirectoryProductRow[] | null) ?? [];
  const userIds = Array.from(
    new Set(
      safeSupplierRows
        .map((row) => {
          const profile = Array.isArray(row.business_profiles)
            ? row.business_profiles[0]
            : row.business_profiles;

          return profile?.user_id ?? null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const avatarByUserId = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("user_id, avatar_url")
      .in("user_id", userIds);

    if (userError) {
      throw new Error(userError.message || "Failed to load homepage supplier avatars.");
    }

    for (const row of userRows ?? []) {
      avatarByUserId.set(row.user_id, row.avatar_url);
    }
  }

  const categoryTagsBySupplierId = new Map<number, string[]>();

  for (const row of safeProductRows) {
    const category = Array.isArray(row.product_categories)
      ? row.product_categories[0]
      : row.product_categories;
    const categoryName = category?.category_name?.trim();

    if (!categoryName) {
      continue;
    }

    if (!categoryTagsBySupplierId.has(row.supplier_id)) {
      categoryTagsBySupplierId.set(row.supplier_id, []);
    }

    const tags = categoryTagsBySupplierId.get(row.supplier_id)!;
    if (!tags.some((tag) => normalizeText(tag) === normalizeText(categoryName))) {
      tags.push(categoryName);
    }
  }

  return safeSupplierRows
    .map((row) => {
      const profile = Array.isArray(row.business_profiles)
        ? row.business_profiles[0]
        : row.business_profiles;

      if (!profile) {
        return null;
      }

      return {
        supplierId: row.supplier_id,
        profileId: profile.profile_id,
        avatarUrl: profile.user_id ? avatarByUserId.get(profile.user_id) ?? null : null,
        businessName: profile.business_name,
        businessType: profile.business_type,
        city: profile.city,
        about: profile.about,
        verified: row.verified,
        verifiedBadge: row.verified_badge,
        categoryTags: categoryTagsBySupplierId.get(row.supplier_id) ?? [],
      } satisfies HomepageSupplierDirectoryItem;
    })
    .filter((supplier): supplier is HomepageSupplierDirectoryItem => supplier !== null);
}

export default async function BuyerPage() {
  const supabase = await createClient();
  let buyerContext: Awaited<ReturnType<typeof getCurrentBuyerContext>> = null;

  try {
    buyerContext = await getCurrentBuyerContext();
  } catch (error) {
    console.error("Unable to load buyer context for homepage.", error);
  }

  const heroCategoriesPromise = supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true })
    .limit(8);
  const publishedProductsPromise = supabase
    .from("products")
    .select(
      `
      product_id,
      supplier_id,
      category_id,
      product_name,
      image_url,
      price_per_unit,
      unit,
      product_categories (
        category_id,
        category_name
      )
    `,
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(180);
  const reviewRowsPromise = loadHomepageSupplierReviews(supabase);
  const supplierDirectoryPromise = loadHomepageSupplierDirectory(supabase);

  let savedCategoryRows: BusinessProfileCategoryRow[] = [];
  let orderAgainItems: Array<{
    poId: number;
    productName: string;
    supplierName: string;
    quantityLabel: string;
    completedAt: string | null;
    totalAmount: number | null;
    specifications: string | null;
    orderHref: string;
    reorderHref: string;
    supplierHref: string | null;
  }> = [];

  if (buyerContext) {
    const [{ data: savedCategories }, purchaseOrders] = await Promise.all([
      supabase
        .from("business_profile_categories")
        .select("category_id")
        .eq("profile_id", buyerContext.profileId),
      getBuyerPurchaseOrders(),
    ]);

    savedCategoryRows = (savedCategories as BusinessProfileCategoryRow[] | null) ?? [];

    orderAgainItems = purchaseOrders
      .filter((order) => order.status === "completed")
      .slice(0, 6)
      .map((order) => ({
        poId: order.poId,
        productName: order.productName,
        supplierName: order.supplierInfo?.businessName ?? "Previous supplier",
        quantityLabel: order.quantityLabel,
        completedAt: order.completedAt,
        totalAmount: order.totalAmount,
        specifications: order.specifications,
        orderHref: `/buyer/purchase-orders/${order.poId}`,
        reorderHref:
          order.supplierId && order.productId
            ? `/buyer/rfqs/new?supplierId=${order.supplierId}&productId=${order.productId}`
            : order.supplierId
              ? `/buyer/search/${order.supplierId}`
              : "/buyer/search",
        supplierHref: order.supplierId ? `/buyer/search/${order.supplierId}` : null,
      }));
  }

  const [
    { data: heroCategoryRows },
    { data: publishedProductRows },
    { data: reviewRows, error: reviewError },
    supplierDirectory,
  ] = await Promise.all([
    heroCategoriesPromise,
    publishedProductsPromise,
    reviewRowsPromise,
    supplierDirectoryPromise,
  ]);

  let safeReviewRows: SupplierReviewRow[] = [];

  if (reviewError && !isMissingSupplierReviewsTableError(reviewError.message)) {
    throw new Error(reviewError.message || "Failed to load supplier reviews.");
  }

  if (!reviewError) {
    safeReviewRows = (reviewRows as SupplierReviewRow[] | null) ?? [];
  }

  const recommendedSuppliers = buildPopularRecommendedSuppliers({
    supplierDirectory,
    reviewRows: safeReviewRows,
  });
  const browseCategories = buildBrowseCategoryCards({
    buyerCategoryIds: new Set(savedCategoryRows.map((row) => row.category_id)),
    products: (publishedProductRows as PublishedProductRow[] | null) ?? [],
  });
  const resolvedBrowseCategories = await Promise.all(
    browseCategories.map(async (category) => ({
      ...category,
      sampleProducts: await Promise.all(
        category.sampleProducts.map(async (product) => ({
          productId: product.productId,
          supplierId: product.supplierId,
          productName: product.productName,
          imageUrl: await getProductImageUrl(supabase, product.imagePath),
          pricePerUnit: product.pricePerUnit,
          unit: product.unit,
        })),
      ),
    })),
  );

  return (
    <main className="space-y-6 py-6">
      <BuyerMarketplaceHome
        heroCategories={(heroCategoryRows as ProductCategoryRow[] | null) ?? []}
        recommendedSuppliers={recommendedSuppliers}
        browseCategories={resolvedBrowseCategories}
        orderAgainItems={orderAgainItems}
        showSupplierSignupPromo={!buyerContext && orderAgainItems.length === 0}
      />
    </main>
  );
}
