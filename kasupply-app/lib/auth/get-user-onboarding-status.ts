import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { getSupplierDocumentRequirements } from "@/lib/supplier-requirements";

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
  verification_status?: string | null;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_at: string | null;
  verified_badge: boolean;
  verification_status?: string | null;
};

type BusinessProfileRow = {
  profile_id: number;
  user_id: string;
  business_name: string;
  business_type: string;
  business_location: string;
  city: string;
  province: string;
  region: string;
  about: string | null;
  contact_number: string | null;
  contact_name: string | null;
};

type BusinessProfileCategoryRow = {
  category_id: number;
};

type BusinessProfileCustomCategoryRow = {
  category_name: string;
};

type BusinessDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
  document_types: {
    document_type_name: string;
  } | null;
};

type SiteShowcaseImageRow = {
  image_id: number;
  profile_id: number;
  image_type: string;
  image_url: string;
  status: string;
};

const REQUIRED_SITE_IMAGE_TYPES = [
  "exterior",
  "interior",
  "signage",
  "operational_setup",
  "location_map",
];

function normalizeDocumentName(value: string) {
  return value.trim().toLowerCase();
}

async function loadBuyerProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: number
) {
  const profileWithVerification = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id, verification_status")
    .eq("profile_id", profileId)
    .maybeSingle<BuyerProfileRow>();

  if (!profileWithVerification.error) {
    return profileWithVerification;
  }

  return supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .eq("profile_id", profileId)
    .maybeSingle<BuyerProfileRow>();
}

async function loadSupplierProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: number
) {
  const profileWithVerification = await supabase
    .from("supplier_profiles")
    .select(
      "supplier_id, profile_id, verified, verified_at, verified_badge, verification_status"
    )
    .eq("profile_id", profileId)
    .maybeSingle<SupplierProfileRow>();

  if (!profileWithVerification.error) {
    return profileWithVerification;
  }

  return supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id, verified, verified_at, verified_badge")
    .eq("profile_id", profileId)
    .maybeSingle<SupplierProfileRow>();
}

export async function getUserOnboardingStatus() {
  const supabase = await createClient();

  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    return {
      authenticated: false,
      hasBusinessProfile: false,
      businessProfile: null,
      appUser: null,
      role: null,
      hasBuyerProfile: false,
      hasSupplierProfile: false,
      hasCompletedCategorySelection: false,
      hasSubmittedBuyerDocuments: false,
      hasSubmittedSupplierDocuments: false,
      hasSubmittedRequiredSupplierDocuments: false,
      hasSubmittedSiteImages: false,
      isSupplierVerified: false,
      supplierVerificationStatus: "not_started" as
        | "not_started"
        | "incomplete"
        | "pending"
        | "verified",
      requiredDocumentsChecklist: [],
      siteImages: [],
      debug: null,
    };
  }

  const role = user.roles?.role_name?.toLowerCase() ?? null;

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(`
      profile_id,
      user_id,
      business_name,
      business_type,
      business_location,
      city,
      province,
      region,
      about,
      contact_number,
      contact_name
    `)
    .eq("user_id", user.user_id)
    .maybeSingle<BusinessProfileRow>();

  let hasBuyerProfile = false;
  let hasSupplierProfile = false;
  let hasCompletedCategorySelection = false;
  let hasSubmittedBuyerDocuments = false;
  let hasSubmittedSupplierDocuments = false;
  let hasSubmittedRequiredSupplierDocuments = false;
  let hasSubmittedSiteImages = false;
  let isSupplierVerified = false;

  let buyerProfile: BuyerProfileRow | null = null;
  let supplierProfile: SupplierProfileRow | null = null;
  let siteImages: SiteShowcaseImageRow[] = [];
  let supplierDocumentsErrorMessage: string | null = null;
  let buyerVerificationStatus: string | null = null;
  let supplierVerificationState: string | null = null;
  const supplierDocumentRequirements = businessProfile
    ? await getSupplierDocumentRequirements(supabase)
    : [];
  const activeSupplierDocumentRequirements = supplierDocumentRequirements.filter(
    (requirement) => requirement.isActive && requirement.showInOnboarding
  );
  const requiredSupplierDocumentRequirements = activeSupplierDocumentRequirements.filter(
    (requirement) => requirement.isRequired
  );

  let requiredDocumentsChecklist: Array<{
    name: string;
    uploaded: boolean;
    status: string | null;
  }> = requiredSupplierDocumentRequirements.map((requirement) => ({
    name: requirement.label,
    uploaded: false,
    status: null,
  }));

  if (businessProfile) {
    const [{ data: savedCategories }, { data: customCategories }] = await Promise.all([
      supabase
        .from("business_profile_categories")
        .select("category_id")
        .eq("profile_id", businessProfile.profile_id),
      supabase
        .from("business_profile_custom_categories")
        .select("category_name")
        .eq("profile_id", businessProfile.profile_id),
    ]);

    const safeSavedCategories =
      (savedCategories as BusinessProfileCategoryRow[] | null) ?? [];
    const safeCustomCategories =
      (customCategories as BusinessProfileCustomCategoryRow[] | null) ?? [];

    hasCompletedCategorySelection =
      safeSavedCategories.length > 0 || safeCustomCategories.length > 0;
  }

  if (role === "buyer" && businessProfile) {
    const { data: buyerProfileData } = await loadBuyerProfileRow(
      supabase,
      businessProfile.profile_id
    );

    buyerProfile = buyerProfileData ?? null;
    hasBuyerProfile = !!buyerProfile;
    buyerVerificationStatus = buyerProfile?.verification_status ?? null;

    const { data: buyerDocuments } = await supabase
      .from("business_documents")
      .select(`
        doc_id,
        doc_type_id,
        status,
        document_types!business_documents_doc_type_id_fkey (
          document_type_name
        )
      `)
      .eq("profile_id", businessProfile.profile_id);

    const safeBuyerDocuments = (buyerDocuments as BusinessDocumentRow[] | null) ?? [];
    hasSubmittedBuyerDocuments = safeBuyerDocuments.some((doc) =>
      normalizeDocumentName(doc.document_types?.document_type_name ?? "") ===
      normalizeDocumentName("DTI Business Registration Certificate")
    );
  }

  if (role === "supplier" && businessProfile) {
    const { data: supplierProfileData } = await loadSupplierProfileRow(
      supabase,
      businessProfile.profile_id
    );

    supplierProfile = supplierProfileData ?? null;
    hasSupplierProfile = !!supplierProfile;
    supplierVerificationState = supplierProfile?.verification_status ?? null;
    isSupplierVerified =
      (supplierProfile?.verified ?? false) ||
      supplierVerificationState === "approved";

    const { data: supplierDocuments, error: supplierDocumentsError } =
      await supabase
        .from("business_documents")
        .select(`
          doc_id,
          doc_type_id,
          status,
          document_types!business_documents_doc_type_id_fkey (
            document_type_name
          )
        `)
        .eq("profile_id", businessProfile.profile_id);

    supplierDocumentsErrorMessage = supplierDocumentsError?.message ?? null;

    const safeDocuments = (supplierDocuments as BusinessDocumentRow[] | null) ?? [];
    hasSubmittedSupplierDocuments = safeDocuments.length > 0;

    const uploadedDocumentNames = new Map<
      string,
      { uploaded: boolean; status: string | null }
    >();

    for (const doc of safeDocuments) {
      const rawName = doc.document_types?.document_type_name ?? "";
      const normalizedName = normalizeDocumentName(rawName);

      if (!uploadedDocumentNames.has(normalizedName)) {
        uploadedDocumentNames.set(normalizedName, {
          uploaded: true,
          status: doc.status ?? null,
        });
      }
    }

    requiredDocumentsChecklist = requiredSupplierDocumentRequirements.map((requirement) => {
      const existing = uploadedDocumentNames.get(normalizeDocumentName(requirement.label));
      return {
        name: requirement.label,
        uploaded: existing?.uploaded ?? false,
        status: existing?.status ?? null,
      };
    });

    hasSubmittedRequiredSupplierDocuments =
      requiredDocumentsChecklist.length === 0 ||
      requiredDocumentsChecklist.every((doc) => doc.uploaded);

    const { data: siteImageData } = await supabase
      .from("site_showcase_images")
      .select("image_id, profile_id, image_type, image_url, status")
      .eq("profile_id", businessProfile.profile_id)
      .in("image_type", REQUIRED_SITE_IMAGE_TYPES);

    siteImages = (siteImageData as SiteShowcaseImageRow[] | null) ?? [];
    const uploadedTypes = new Set(siteImages.map((image) => image.image_type));
    hasSubmittedSiteImages = REQUIRED_SITE_IMAGE_TYPES.every((type) =>
      uploadedTypes.has(type)
    );
  }

  let supplierVerificationStatus: "not_started" | "incomplete" | "pending" | "verified" =
    "not_started";

  if (role === "supplier" && businessProfile) {
    if (isSupplierVerified) {
      supplierVerificationStatus = "verified";
    } else if (
      supplierVerificationState === "submitted" ||
      supplierVerificationState === "under_review" ||
      supplierVerificationState === "review_required"
    ) {
      supplierVerificationStatus = "pending";
    } else if (
      hasSubmittedRequiredSupplierDocuments &&
      hasSubmittedSiteImages
    ) {
      supplierVerificationStatus = "pending";
    } else {
      supplierVerificationStatus = "incomplete";
    }
  }

  return {
    authenticated: true,
    hasBusinessProfile: !!businessProfile,
    businessProfile: businessProfile ?? null,
    appUser: user,
    role,
    hasBuyerProfile,
    hasSupplierProfile,
    hasCompletedCategorySelection,
    hasSubmittedBuyerDocuments,
    hasSubmittedSupplierDocuments,
    hasSubmittedRequiredSupplierDocuments,
    hasSubmittedSiteImages,
    isSupplierVerified,
    supplierVerificationStatus,
    requiredDocumentsChecklist,
    siteImages,
    debug: {
      user_id: user.user_id,
      role,
      businessProfileError: businessProfileError?.message ?? null,
      businessProfileId: businessProfile?.profile_id ?? null,
      buyerProfileId: buyerProfile?.profile_id ?? null,
      buyerVerificationStatus,
      supplierProfileId: supplierProfile?.profile_id ?? null,
      supplierVerificationState,
      supplierDocumentsErrorMessage,
    },
  };
}
