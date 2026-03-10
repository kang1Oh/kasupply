import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

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
      hasSubmittedSupplierDocuments: false,
      isSupplierVerified: false,
      debug: null,
    };
  }

  const role = user.roles?.role_name?.toLowerCase() ?? null;

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.user_id)
    .maybeSingle<BusinessProfileRow>();

  let hasSubmittedSupplierDocuments = false;
  let isSupplierVerified = false;
  let supplierProfile: SupplierProfileRow | null = null;
  let supplierDocumentsCount = 0;
  let supplierDocumentsErrorMessage: string | null = null;

  if (role === "supplier" && businessProfile) {
    const { data: supplierProfileData } = await supabase
      .from("supplier_profiles")
      .select("supplier_id, profile_id, verified, verified_at, verified_badge")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<SupplierProfileRow>();

    supplierProfile = supplierProfileData ?? null;
    isSupplierVerified = supplierProfile?.verified ?? false;

    const { count, error: supplierDocumentsError } = await supabase
      .from("business_documents")
      .select("doc_id", { count: "exact", head: true })
      .eq("profile_id", businessProfile.profile_id);

    supplierDocumentsCount = count ?? 0;
    hasSubmittedSupplierDocuments = supplierDocumentsCount > 0;
    supplierDocumentsErrorMessage = supplierDocumentsError?.message ?? null;
  }

  return {
    authenticated: true,
    hasBusinessProfile: !!businessProfile,
    businessProfile: businessProfile ?? null,
    appUser: user,
    role,
    hasSubmittedSupplierDocuments,
    isSupplierVerified,
    debug: {
      user_id: user.user_id,
      role,
      businessProfileError: businessProfileError?.message ?? null,
      businessProfileId: businessProfile?.profile_id ?? null,
      supplierProfileId: supplierProfile?.profile_id ?? null,
      supplierDocumentsCount,
      supplierDocumentsErrorMessage,
    },
  };
}