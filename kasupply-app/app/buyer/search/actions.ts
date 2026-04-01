"use server";

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
};

type GetSuppliersParams = {
  query?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
};

export async function getSupplierSearchResults(
  params: GetSuppliersParams = {}
): Promise<SupplierSearchItem[]> {
  const supabase = await createClient();

  const { query = "", city = "", category = "", verifiedOnly = false } = params;

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  const { data: supplierRows, error: supplierError } = await supabase
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

  if (supplierError) {
    console.error("Error fetching supplier profiles:", supplierError);
    throw new Error("Failed to fetch suppliers.");
  }

  const userIds = Array.from(
    new Set(
      (supplierRows ?? [])
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
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("user_id, avatar_url")
      .in("user_id", userIds);

    if (userError) {
      console.error("Error fetching supplier avatars:", userError);
      throw new Error("Failed to fetch supplier avatars.");
    }

    for (const row of userRows ?? []) {
      avatarByUserId.set(row.user_id, row.avatar_url);
    }
  }

  const { data: productRows, error: productError } = await supabase
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

  if (productError) {
    console.error("Error fetching products:", productError);
    throw new Error("Failed to fetch products.");
  }

  const { data: certificationRows, error: certificationError } = await supabase
    .from("supplier_certifications")
    .select("supplier_id, status")
    .eq("status", "approved");

  if (certificationError) {
    console.error("Error fetching certifications:", certificationError);
    throw new Error("Failed to fetch certifications.");
  }

  const productsBySupplier = new Map<number, SupplierSearchItem["products"]>();

  for (const row of productRows ?? []) {
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

  const results: SupplierSearchItem[] = [];

  for (const row of supplierRows ?? []) {
    const profile = Array.isArray(row.business_profiles)
      ? row.business_profiles[0]
      : row.business_profiles;

    if (!profile) continue;

    const supplierProducts = productsBySupplier.get(row.supplier_id) ?? [];

    const searchableText = [
      profile.business_name,
      profile.business_type,
      profile.business_location,
      profile.city,
      profile.province,
      profile.region,
      profile.about ?? "",
      ...supplierProducts.map((product) => product.productName),
      ...supplierProducts.map((product) => product.categoryName),
    ]
      .join(" ")
      .toLowerCase();

    if (verifiedOnly && !row.verified_badge) {
      continue;
    }

    if (normalizedCity && !profile.city.toLowerCase().includes(normalizedCity)) {
      continue;
    }

    if (
      normalizedCategory &&
      !supplierProducts.some((product) =>
        product.categoryName.toLowerCase().includes(normalizedCategory)
      )
    ) {
      continue;
    }

    if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
      continue;
    }

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
    });
  }

  return results;
}
