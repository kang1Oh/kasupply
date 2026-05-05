import { createAdminClient } from "@/lib/supabase/admin";
import type { SupplierSearchDocumentInput } from "@/lib/search/types";

type BusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  about: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified_badge: boolean | null;
  verification_status: string | null;
  business_profiles: BusinessProfileRow | BusinessProfileRow[] | null;
};

type SupplierCategoryRow = {
  profile_id: number;
  category_id: number;
};

type ProductCategoryRow = {
  category_id: number;
  category_name: string;
};

type ProductRow = {
  product_id: number;
  supplier_id: number;
  category_id: number | null;
  product_name: string;
  description: string | null;
  unit: string | null;
  moq: number | null;
  max_capacity: number | null;
  lead_time: string | null;
  stock_available: number | null;
  is_published: boolean | null;
  product_categories:
    | {
        category_name?: string | null;
      }
    | {
        category_name?: string | null;
      }[]
    | null;
};

type SupplierSearchSourceData = {
  supplierId: number;
  profileId: number;
  verifiedBadge: boolean;
  verificationStatus: string | null;
  businessName: string;
  businessType: string | null;
  businessLocation: string | null;
  about: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  categoryNames: string[];
  products: Array<{
    productId: number;
    categoryId: number | null;
    categoryName: string | null;
    productName: string;
    description: string | null;
    unit: string | null;
    moq: number | null;
    maxCapacity: number | null;
    leadTime: string | null;
    stockAvailable: number | null;
  }>;
};

function getSingleRelationRow<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function compactTextParts(parts: Array<string | number | null | undefined>) {
  return parts
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
    .join(" | ");
}

function toNumberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getCategoryNameFromRelation(
  value: ProductRow["product_categories"]
) {
  const relation = getSingleRelationRow(value);
  const categoryName = relation?.category_name?.trim();
  return categoryName ? categoryName : null;
}

function buildProfileDocument(source: SupplierSearchSourceData): SupplierSearchDocumentInput {
  const productSummary = source.products
    .map((product) =>
      compactTextParts([
        product.productName,
        product.categoryName,
        product.description,
        product.unit ? `unit ${product.unit}` : null,
        product.moq != null ? `MOQ ${product.moq}` : null,
        product.maxCapacity != null ? `capacity ${product.maxCapacity}` : null,
      ])
    )
    .join("\n");

  const content = [
    compactTextParts([
      source.businessName,
      source.businessType,
      source.businessLocation,
      source.city,
      source.province,
      source.region,
    ]),
    source.about?.trim() || "",
    source.categoryNames.length > 0
      ? `Business categories: ${source.categoryNames.join(", ")}`
      : "",
    productSummary ? `Published products:\n${productSummary}` : "",
  ]
    .filter((value) => value.trim().length > 0)
    .join("\n\n");

  return {
    supplier_id: source.supplierId,
    profile_id: source.profileId,
    source_type: "profile",
    source_id: source.profileId,
    title: source.businessName,
    content,
    category_id: null,
    moq: null,
    max_capacity: null,
    unit: null,
    city: source.city,
    province: source.province,
    region: source.region,
    is_active: true,
    metadata: {
      documentKind: "supplier_profile",
      businessType: source.businessType,
      businessLocation: source.businessLocation,
      categoryNames: source.categoryNames,
      verifiedBadge: source.verifiedBadge,
      verificationStatus: source.verificationStatus,
      publishedProductCount: source.products.length,
    },
  };
}

function buildProductDocument(
  source: SupplierSearchSourceData,
  product: SupplierSearchSourceData["products"][number]
): SupplierSearchDocumentInput {
  const content = [
    compactTextParts([
      product.productName,
      product.categoryName,
      product.description,
    ]),
    compactTextParts([
      source.businessName,
      source.businessType,
      source.about,
    ]),
    compactTextParts([
      product.unit ? `Unit ${product.unit}` : null,
      product.moq != null ? `MOQ ${product.moq}` : null,
      product.maxCapacity != null ? `Max capacity ${product.maxCapacity}` : null,
      product.leadTime ? `Lead time ${product.leadTime}` : null,
      product.stockAvailable != null ? `Stock ${product.stockAvailable}` : null,
    ]),
    compactTextParts([
      source.businessLocation,
      source.city,
      source.province,
      source.region,
    ]),
  ]
    .filter((value) => value.trim().length > 0)
    .join("\n\n");

  return {
    supplier_id: source.supplierId,
    profile_id: source.profileId,
    source_type: "product",
    source_id: product.productId,
    title: compactTextParts([product.productName, source.businessName]),
    content,
    category_id: product.categoryId,
    moq: product.moq,
    max_capacity: product.maxCapacity,
    unit: product.unit,
    city: source.city,
    province: source.province,
    region: source.region,
    is_active: true,
    metadata: {
      documentKind: "supplier_product",
      categoryName: product.categoryName,
      productName: product.productName,
      supplierName: source.businessName,
      leadTime: product.leadTime,
      stockAvailable: product.stockAvailable,
      verifiedBadge: source.verifiedBadge,
      verificationStatus: source.verificationStatus,
    },
  };
}

export async function loadSupplierSearchSourceData(
  supplierId: number
): Promise<SupplierSearchSourceData> {
  const supabase = createAdminClient();

  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select(
      `
      supplier_id,
      profile_id,
      verified_badge,
      verification_status,
      business_profiles (
        profile_id,
        business_name,
        business_type,
        business_location,
        about,
        city,
        province,
        region
      )
    `
    )
    .eq("supplier_id", supplierId)
    .maybeSingle<SupplierProfileRow>();

  if (supplierProfileError) {
    throw new Error(supplierProfileError.message || "Failed to load supplier profile.");
  }

  if (!supplierProfile) {
    throw new Error(`Supplier ${supplierId} was not found.`);
  }

  const businessProfile = getSingleRelationRow(supplierProfile.business_profiles);

  if (!businessProfile) {
    throw new Error(`Supplier ${supplierId} does not have a business profile.`);
  }

  const [{ data: categoryRows, error: categoryRowsError }, { data: productRows, error: productRowsError }] =
    await Promise.all([
      supabase
        .from("business_profile_categories")
        .select("profile_id, category_id")
        .eq("profile_id", supplierProfile.profile_id)
        .returns<SupplierCategoryRow[]>(),
      supabase
        .from("products")
        .select(
          `
          product_id,
          supplier_id,
          category_id,
          product_name,
          description,
          unit,
          moq,
          max_capacity,
          lead_time,
          stock_available,
          is_published,
          product_categories (
            category_name
          )
        `
        )
        .eq("supplier_id", supplierId)
        .eq("is_published", true)
        .returns<ProductRow[]>(),
    ]);

  if (categoryRowsError) {
    throw new Error(categoryRowsError.message || "Failed to load supplier categories.");
  }

  if (productRowsError) {
    throw new Error(productRowsError.message || "Failed to load supplier products.");
  }

  const categoryIds = Array.from(
    new Set((categoryRows ?? []).map((row) => row.category_id).filter((value) => value != null))
  );

  const categoryNameById = new Map<number, string>();

  if (categoryIds.length > 0) {
    const { data: productCategories, error: productCategoriesError } = await supabase
      .from("product_categories")
      .select("category_id, category_name")
      .in("category_id", categoryIds)
      .returns<ProductCategoryRow[]>();

    if (productCategoriesError) {
      throw new Error(productCategoriesError.message || "Failed to load category names.");
    }

    for (const category of productCategories ?? []) {
      categoryNameById.set(category.category_id, category.category_name);
    }
  }

  return {
    supplierId: supplierProfile.supplier_id,
    profileId: supplierProfile.profile_id,
    verifiedBadge: Boolean(supplierProfile.verified_badge),
    verificationStatus: supplierProfile.verification_status,
    businessName: businessProfile.business_name?.trim() || `Supplier #${supplierId}`,
    businessType: businessProfile.business_type,
    businessLocation: businessProfile.business_location,
    about: businessProfile.about,
    city: businessProfile.city,
    province: businessProfile.province,
    region: businessProfile.region,
    categoryNames: categoryIds
      .map((categoryId) => categoryNameById.get(categoryId) ?? null)
      .filter((value): value is string => Boolean(value)),
    products: (productRows ?? []).map((product) => ({
      productId: product.product_id,
      categoryId: product.category_id,
      categoryName:
        getCategoryNameFromRelation(product.product_categories) ??
        (product.category_id != null ? categoryNameById.get(product.category_id) ?? null : null),
      productName: product.product_name,
      description: product.description,
      unit: product.unit,
      moq: toNumberOrNull(product.moq),
      maxCapacity: toNumberOrNull(product.max_capacity),
      leadTime: product.lead_time,
      stockAvailable: toNumberOrNull(product.stock_available),
    })),
  };
}

export async function buildSupplierSearchDocumentsForSupplier(supplierId: number) {
  const source = await loadSupplierSearchSourceData(supplierId);
  const profileDocument = buildProfileDocument(source);
  const productDocuments = source.products.map((product) =>
    buildProductDocument(source, product)
  );

  return {
    supplierId: source.supplierId,
    profileId: source.profileId,
    documents: [profileDocument, ...productDocuments],
    profileDocuments: [profileDocument],
    productDocuments,
  };
}

