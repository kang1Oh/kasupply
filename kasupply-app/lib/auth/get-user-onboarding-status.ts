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
      isSupplierVerified: false,
      onboardingCompleted: false,
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
  let isSupplierVerified = false;

  let buyerProfile: BuyerProfileRow | null = null;
  let supplierProfile: SupplierProfileRow | null = null;

  let buyerDocumentsCount = 0;
  let supplierDocumentsCount = 0;
  let buyerDocumentsErrorMessage: string | null = null;
  let supplierDocumentsErrorMessage: string | null = null;

  if (role === "buyer" && businessProfile) {
    const { data: buyerProfileData } = await supabase
      .from("buyer_profiles")
      .select("buyer_id, profile_id")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<BuyerProfileRow>();

    buyerProfile = buyerProfileData ?? null;
    hasBuyerProfile = !!buyerProfile;

    const { count, error: buyerDocumentsError } = await supabase
      .from("business_documents")
      .select("doc_id", { count: "exact", head: true })
      .eq("profile_id", businessProfile.profile_id);

    buyerDocumentsCount = count ?? 0;
    hasSubmittedBuyerDocuments = buyerDocumentsCount > 0;
    buyerDocumentsErrorMessage = buyerDocumentsError?.message ?? null;
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

    const { count, error: supplierDocumentsError } = await supabase
      .from("business_documents")
      .select("doc_id", { count: "exact", head: true })
      .eq("profile_id", businessProfile.profile_id);

    supplierDocumentsCount = count ?? 0;
    hasSubmittedSupplierDocuments = supplierDocumentsCount > 0;
    supplierDocumentsErrorMessage = supplierDocumentsError?.message ?? null;
  }

  const onboardingCompleted =
    role === "buyer"
      ? !!businessProfile && hasBuyerProfile && hasSubmittedBuyerDocuments
      : role === "supplier"
        ? !!businessProfile && hasSupplierProfile && hasSubmittedSupplierDocuments
        : false;

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
    isSupplierVerified,
    onboardingCompleted,
    debug: {
      user_id: user.user_id,
      role,
      businessProfileError: businessProfileError?.message ?? null,
      businessProfileId: businessProfile?.profile_id ?? null,
      buyerProfileId: buyerProfile?.profile_id ?? null,
      supplierProfileId: supplierProfile?.profile_id ?? null,
      buyerDocumentsCount,
      supplierDocumentsCount,
      buyerDocumentsErrorMessage,
      supplierDocumentsErrorMessage,
    },
  };
}