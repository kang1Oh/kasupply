import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_at: string | null;
  verified_badge: boolean;
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

type BusinessDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
  document_types: {
    document_type_name: string;
  } | null;
};

type SiteShowcaseVideoRow = {
  video_id: number;
  profile_id: number;
  file_url: string;
  status: string;
  uploaded_at: string;
  verified_at: string | null;
};

const REQUIRED_SUPPLIER_DOCUMENTS = [
  "DTI Business Registration Certificate",
  "Mayor's Permit",
  "FDA Certificate",
];

function normalizeDocumentName(value: string) {
  return value.trim().toLowerCase();
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
      hasSubmittedBuyerDocuments: false,
      hasSubmittedSupplierDocuments: false,
      hasSubmittedRequiredSupplierDocuments: false,
      hasSubmittedSiteVideo: false,
      isSupplierVerified: false,
      supplierVerificationStatus: "not_started" as
        | "not_started"
        | "incomplete"
        | "pending"
        | "verified",
      requiredDocumentsChecklist: [],
      siteVideo: null,
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
  let hasSubmittedBuyerDocuments = false;
  let hasSubmittedSupplierDocuments = false;
  let hasSubmittedRequiredSupplierDocuments = false;
  let hasSubmittedSiteVideo = false;
  let isSupplierVerified = false;

  let buyerProfile: BuyerProfileRow | null = null;
  let supplierProfile: SupplierProfileRow | null = null;
  let siteVideo: SiteShowcaseVideoRow | null = null;
  let supplierDocumentsErrorMessage: string | null = null;

  let requiredDocumentsChecklist: Array<{
    name: string;
    uploaded: boolean;
    status: string | null;
  }> = REQUIRED_SUPPLIER_DOCUMENTS.map((name) => ({
    name,
    uploaded: false,
    status: null,
  }));

  if (role === "buyer" && businessProfile) {
    const { data: buyerProfileData } = await supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<BuyerProfileRow>();

    buyerProfile = buyerProfileData ?? null;
    hasBuyerProfile = !!buyerProfile;
    hasSubmittedBuyerDocuments = !!buyerProfile;
  }

  if (role === "supplier" && businessProfile) {
    const { data: supplierProfileData } = await supabase
      .from("supplier_profiles")
      .select("supplier_id, profile_id, verified, verified_at, verified_badge")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<SupplierProfileRow>();

    supplierProfile = supplierProfileData ?? null;
    hasSupplierProfile = !!supplierProfile;
    isSupplierVerified = supplierProfile?.verified ?? false;

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

    requiredDocumentsChecklist = REQUIRED_SUPPLIER_DOCUMENTS.map((name) => {
      const existing = uploadedDocumentNames.get(normalizeDocumentName(name));
      return {
        name,
        uploaded: existing?.uploaded ?? false,
        status: existing?.status ?? null,
      };
    });

    hasSubmittedRequiredSupplierDocuments = requiredDocumentsChecklist.every(
      (doc) => doc.uploaded
    );

    const { data: siteVideoData } = await supabase
      .from("site_showcase_videos")
      .select("video_id, profile_id, file_url, status, uploaded_at, verified_at")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<SiteShowcaseVideoRow>();

    siteVideo = siteVideoData ?? null;
    hasSubmittedSiteVideo = !!siteVideo;
  }

  let supplierVerificationStatus: "not_started" | "incomplete" | "pending" | "verified" =
    "not_started";

  if (role === "supplier" && businessProfile) {
    if (isSupplierVerified) {
      supplierVerificationStatus = "verified";
    } else if (
      hasSubmittedRequiredSupplierDocuments &&
      hasSubmittedSiteVideo
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
    hasSubmittedBuyerDocuments,
    hasSubmittedSupplierDocuments,
    hasSubmittedRequiredSupplierDocuments,
    hasSubmittedSiteVideo,
    isSupplierVerified,
    supplierVerificationStatus,
    requiredDocumentsChecklist,
    siteVideo,
    debug: {
      user_id: user.user_id,
      role,
      businessProfileError: businessProfileError?.message ?? null,
      businessProfileId: businessProfile?.profile_id ?? null,
      buyerProfileId: buyerProfile?.profile_id ?? null,
      supplierProfileId: supplierProfile?.profile_id ?? null,
      supplierDocumentsErrorMessage,
    },
  };
}
