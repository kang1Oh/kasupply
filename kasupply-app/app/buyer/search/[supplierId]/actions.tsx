"use server";

import { createClient } from "@/lib/supabase/server";

export type SupplierProfileDetails = {
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
  contactName: string | null;
  contactNumber: string | null;
  verified: boolean;
  verifiedBadge: boolean;
  businessDocuments: {
    documentId: number;
    documentTypeName: string;
    fileUrl: string;
    documentUrl: string | null;
    fileName: string;
    isImageFile: boolean;
    isPdfFile: boolean;
    status: string;
    verifiedAt: string | null;
  }[];
  products: {
    productId: number;
    productName: string;
    description: string | null;
    imageUrl: string | null;
    galleryImages: string[];
    categoryName: string;
    unit: string;
    pricePerUnit: number;
    moq: number;
    maxCapacity: number | null;
    leadTime: string | null;
    stockAvailable: number | null;
  }[];
  certifications: {
    certificationId: number;
    certTypeId: number;
    certificationTypeName: string;
    fileUrl: string;
    documentUrl: string | null;
    fileName: string;
    isImageFile: boolean;
    isPdfFile: boolean;
    status: string;
    issuedAt: string | null;
    expiresAt: string | null;
    verifiedAt: string | null;
  }[];
};

function getFileNameFromPath(path: string | null | undefined) {
  if (!path) {
    return "document";
  }

  const parts = path.split("/");
  return parts[parts.length - 1] || "document";
}

function isImagePath(path: string | null | undefined) {
  if (!path) {
    return false;
  }

  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}

function isPdfPath(path: string | null | undefined) {
  if (!path) {
    return false;
  }

  return path.toLowerCase().endsWith(".pdf");
}

function isAbsoluteUrl(path: string | null | undefined) {
  if (!path) {
    return false;
  }

  return /^https?:\/\//i.test(path);
}

function dedupeUrls(urls: string[]) {
  const seen = new Set<string>();
  const uniqueUrls: string[] = [];

  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    uniqueUrls.push(url);
  }

  return uniqueUrls;
}

function withCacheKey(url: string, key: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(key)}`;
}

function getBusinessDocumentTypeName(docTypeId: number) {
  const documentTypeNames: Record<number, string> = {
    1: "DTI",
    2: "SEC",
    3: "Mayor's Permit",
    4: "BIR",
    5: "FDA Permit",
  };

  return documentTypeNames[docTypeId] ?? "Business Document";
}

async function getCertificationDocumentUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null | undefined
) {
  if (!filePath) {
    return null;
  }

  if (isAbsoluteUrl(filePath)) {
    return filePath;
  }

  const bucketNames = [
    "supplier_certifications",
    "supplier-certifications",
    "business-documents",
  ];

  for (const bucketName of bucketNames) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

async function getBusinessDocumentUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null | undefined
) {
  if (!filePath) {
    return null;
  }

  if (isAbsoluteUrl(filePath)) {
    return filePath;
  }

  const { data, error } = await supabase.storage
    .from("business-documents")
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    console.error("Unable to resolve business document URL:", filePath, error);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function getProductImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
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

export async function getSupplierProfileDetails(
  supplierId: number
): Promise<SupplierProfileDetails | null> {
  const supabase = await createClient();

  const { data: supplierRow, error: supplierError } = await supabase
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
        about,
        contact_name,
        contact_number
      )
    `
    )
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (supplierError) {
    console.error("Error fetching supplier profile:", supplierError);
    throw new Error("Failed to fetch supplier profile.");
  }

  if (!supplierRow) {
    return null;
  }

  const profile = Array.isArray(supplierRow.business_profiles)
    ? supplierRow.business_profiles[0]
    : supplierRow.business_profiles;

  if (!profile) {
    return null;
  }

  let avatarUrl: string | null = null;

  if (profile.user_id) {
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching supplier avatar:", userError);
      throw new Error("Failed to fetch supplier avatar.");
    }

    avatarUrl = userRow?.avatar_url ?? null;
  }

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select(
      `
      product_id,
      supplier_id,
      product_name,
      description,
      image_url,
      unit,
      price_per_unit,
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
    .order("updated_at", { ascending: false });

  if (productError) {
    console.error("Error fetching supplier products:", productError);
    throw new Error("Failed to fetch supplier products.");
  }

  const productIds = (productRows ?? []).map((row) => row.product_id);
  const { data: productImageRows, error: productImageError } = productIds.length
      ? await supabase
        .from("product_images")
        .select("image_id, product_id, storage_path, sort_order, is_cover")
        .in("product_id", productIds)
        .order("product_id", { ascending: true })
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (productImageError) {
    console.error("Error fetching supplier product images:", productImageError);
    throw new Error("Failed to fetch supplier product images.");
  }

  const productGalleryMap = new Map<
    number,
    Array<{
      id: number;
      path: string;
      sortOrder: number | null;
      isCover: boolean | null;
      url: string;
    }>
  >();
  for (const imageRow of productImageRows ?? []) {
    const imageUrl = await getProductImageUrl(supabase, imageRow.storage_path);
    if (!imageUrl) continue;

    const currentImages = productGalleryMap.get(imageRow.product_id) ?? [];
    currentImages.push({
      id: imageRow.image_id,
      path: imageRow.storage_path,
      sortOrder: imageRow.sort_order,
      isCover: imageRow.is_cover,
      url: imageUrl,
    });
    productGalleryMap.set(imageRow.product_id, currentImages);
  }

  const { data: certificationRows, error: certificationError } = await supabase
    .from("supplier_certifications")
    .select(
      `
      certification_id,
      cert_type_id,
      file_url,
      status,
      issued_at,
      expires_at,
      verified_at,
      certification_types (
        certification_type_name
      )
    `
    )
    .eq("supplier_id", supplierId)
    .eq("status", "approved")
    .order("certification_id", { ascending: false });

  if (certificationError) {
    console.error("Error fetching supplier certifications:", certificationError);
    throw new Error("Failed to fetch supplier certifications.");
  }

  const { data: businessDocumentRows, error: businessDocumentError } =
    await supabase
      .from("business_documents")
      .select(
        `
        doc_id,
        doc_type_id,
        file_url,
        status,
        verified_at,
        is_visible_to_others
      `
      )
      .eq("profile_id", profile.profile_id)
      .eq("is_visible_to_others", true)
      .eq("status", "approved")
      .order("uploaded_at", { ascending: false });

  if (businessDocumentError) {
    console.error(
      "Error fetching supplier business documents:",
      businessDocumentError
    );
    throw new Error("Failed to fetch supplier business documents.");
  }

  const businessDocuments = await Promise.all(
    (businessDocumentRows ?? []).map(async (row) => {
      const filePath = row.file_url ?? null;
      const fileName = getFileNameFromPath(filePath);
      const isImageFile = isImagePath(filePath);
      const isPdfFile = isPdfPath(filePath);

      return {
        documentId: row.doc_id,
        documentTypeName: getBusinessDocumentTypeName(row.doc_type_id),
        fileUrl: filePath ?? "",
        documentUrl: await getBusinessDocumentUrl(supabase, filePath),
        fileName,
        isImageFile,
        isPdfFile,
        status: row.status,
        verifiedAt: row.verified_at,
      };
    })
  );

  const certifications = await Promise.all(
    (certificationRows ?? []).map(async (row) => {
      const filePath = row.file_url ?? null;
      const fileName = getFileNameFromPath(filePath);
      const isImageFile = isImagePath(filePath);
      const isPdfFile = isPdfPath(filePath);
      const documentUrl = await getCertificationDocumentUrl(
        supabase,
        filePath
      );

      if (!documentUrl) {
        console.error(
          "Unable to resolve supplier certification document URL:",
          filePath
        );
      }

      return {
        certificationId: row.certification_id,
        certTypeId: row.cert_type_id,
        certificationTypeName:
          Array.isArray(row.certification_types)
            ? row.certification_types[0]?.certification_type_name ?? "Unknown"
            : (row.certification_types as
                | { certification_type_name?: string }
                | null)?.certification_type_name ?? "Unknown",
        fileUrl: filePath ?? "",
        documentUrl,
        fileName,
        isImageFile,
        isPdfFile,
        status: row.status,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        verifiedAt: row.verified_at,
      };
    })
  );

  const products = await Promise.all(
    (productRows ?? []).map(async (row) => {
      const galleryRows = (productGalleryMap.get(row.product_id) ?? []).sort((left, right) => {
        if (Boolean(left.isCover) !== Boolean(right.isCover)) {
          return left.isCover ? -1 : 1;
        }

        return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      });

      const galleryImages = galleryRows.map((image) =>
        withCacheKey(image.url, `${image.id}-${image.sortOrder ?? 0}`)
      );
      const coverImageUrl = galleryImages[0]
        ? galleryImages[0]
        : await getProductImageUrl(supabase, row.image_url);
      const uniqueGalleryImages = dedupeUrls(
        coverImageUrl ? [coverImageUrl, ...galleryImages] : galleryImages
      );

      return {
        productId: row.product_id,
        productName: row.product_name,
        description: row.description,
        imageUrl: coverImageUrl,
        galleryImages: uniqueGalleryImages,
        categoryName:
          Array.isArray(row.product_categories)
            ? row.product_categories[0]?.category_name ?? "Uncategorized"
            : (row.product_categories as { category_name?: string } | null)
                ?.category_name ?? "Uncategorized",
        unit: row.unit,
        pricePerUnit: Number(row.price_per_unit),
        moq: row.moq,
        maxCapacity: row.max_capacity,
        leadTime: row.lead_time,
        stockAvailable: row.stock_available,
      };
    })
  );

  return {
    supplierId: supplierRow.supplier_id,
    profileId: profile.profile_id,
    avatarUrl,
    businessName: profile.business_name,
    businessType: profile.business_type,
    businessLocation: profile.business_location,
    city: profile.city,
    province: profile.province,
    region: profile.region,
    about: profile.about,
    contactName: profile.contact_name,
    contactNumber: profile.contact_number,
    verified: supplierRow.verified,
    verifiedBadge: supplierRow.verified_badge,
    businessDocuments,
    products,
    certifications,
  };
}
