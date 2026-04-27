import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSupplierCertificationRequirements } from "@/lib/supplier-requirements";
import {
  saveSupplierCertificationUpdates,
  saveSupplierPermitUpdates,
  uploadSupplierCertification,
} from "./actions";
import { SupplierBusinessProfileForm } from "./business-profile-form";
import { CertificationsForm } from "./certifications-form";
import { PermitsLicensesForm } from "./permits-licenses-form";

type AppUserRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  about: string | null;
  contact_name: string | null;
  contact_number: string | null;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type ProductCategoryRow = {
  category_id: number;
  category_name: string | null;
};

type BusinessProfileCategoryRow = {
  category_id: number;
};

type BusinessProfileCustomCategoryRow = {
  category_name: string | null;
};

type BusinessDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  file_url: string | null;
  status: string | null;
  verified_at: string | null;
  uploaded_at: string | null;
  ocr_extracted_fields: Record<string, unknown> | null;
  metadata_analysis: Record<string, unknown> | null;
  document_types:
    | {
        document_type_name: string | null;
      }
    | {
        document_type_name: string | null;
      }[]
    | null;
};

type SupplierCertificationRow = {
  certification_id: number;
  cert_type_id: number;
  file_url: string | null;
  status: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verified_at: string | null;
  certification_types:
    | {
        certification_type_name: string | null;
      }
    | {
        certification_type_name: string | null;
      }[]
    | null;
};

function HeaderActionIcon({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
    >
      {children}
    </button>
  );
}

function getDocumentTypeName(
  relation: BusinessDocumentRow["document_types"],
  fallback = "Business Document",
) {
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item?.document_type_name?.trim() || fallback;
}

function getStatusLabel(status: string | null | undefined, verifiedAt: string | null) {
  if (verifiedAt || String(status ?? "").toLowerCase() === "approved") {
    return "Verified";
  }

  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Pending";
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatExpiryLabel(value: string | null) {
  if (!value) {
    return "No expiry date available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `Expires ${new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(parsed)}`;
}

function getCertificationTypeName(
  relation: SupplierCertificationRow["certification_types"],
  fallback = "Certification",
) {
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item?.certification_type_name?.trim() || fallback;
}

function extractExpiryDate(document: BusinessDocumentRow) {
  const sources = [document.ocr_extracted_fields, document.metadata_analysis];
  const candidateKeys = [
    "expires_at",
    "expiry_date",
    "expiration_date",
    "valid_until",
    "expiry",
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const key of candidateKeys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

async function getBusinessDocumentUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null | undefined,
) {
  if (!filePath) {
    return null;
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const { data, error } = await supabase.storage
    .from("business-documents")
    .createSignedUrl(filePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

async function getCertificationDocumentUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null | undefined,
) {
  if (!filePath) {
    return null;
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const bucketNames = ["supplier_certifications", "supplier-certifications"];

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

export default async function SupplierAccountSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab =
    resolvedSearchParams.tab === "permits"
      ? "permits"
      : resolvedSearchParams.tab === "certifications"
        ? "certifications"
        : "business";

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/auth/login");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, name, email, avatar_url")
    .eq("auth_user_id", authUser.id)
    .single<AppUserRow>();

  if (appUserError || !appUser) {
    throw new Error(appUserError.message || "User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(
      "profile_id, business_name, business_type, business_location, city, province, region, about, contact_name, contact_number",
    )
    .eq("user_id", appUser.user_id)
    .single<BusinessProfileRow>();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    redirect("/onboarding");
  }

  const [
    { data: categoryRows, error: categoryRowsError },
    { data: selectedCategoryRows, error: selectedCategoryRowsError },
    { data: customCategoryRows, error: customCategoryRowsError },
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("category_id, category_name")
      .order("category_name", { ascending: true }),
    supabase
      .from("business_profile_categories")
      .select("category_id")
      .eq("profile_id", businessProfile.profile_id),
    supabase
      .from("business_profile_custom_categories")
      .select("category_name")
      .eq("profile_id", businessProfile.profile_id)
      .order("category_name", { ascending: true }),
  ]);

  if (categoryRowsError) {
    throw new Error(categoryRowsError.message || "Failed to load category options.");
  }

  if (selectedCategoryRowsError) {
    throw new Error(
      selectedCategoryRowsError.message || "Failed to load selected categories.",
    );
  }

  if (customCategoryRowsError) {
    throw new Error(
      customCategoryRowsError.message || "Failed to load custom categories.",
    );
  }

  const { data: businessDocuments, error: businessDocumentsError } = await supabase
    .from("business_documents")
    .select(
      `
      doc_id,
      doc_type_id,
      file_url,
      status,
      verified_at,
      uploaded_at,
      ocr_extracted_fields,
      metadata_analysis,
      document_types!business_documents_doc_type_id_fkey (
        document_type_name
      )
    `,
    )
    .eq("profile_id", businessProfile.profile_id)
    .order("uploaded_at", { ascending: false });

  if (businessDocumentsError) {
    throw new Error(
      businessDocumentsError.message || "Failed to load supplier business documents.",
    );
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
    `,
    )
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("certification_id", { ascending: false });

  if (certificationError) {
    throw new Error(
      certificationError.message || "Failed to load supplier certifications.",
    );
  }

  const certificationRequirements = await getSupplierCertificationRequirements(supabase);

  const permitRows = await Promise.all(
    ((businessDocuments as BusinessDocumentRow[] | null) ?? []).map(async (document) => ({
      documentId: document.doc_id,
      title: getDocumentTypeName(document.document_types),
      statusLabel: getStatusLabel(document.status, document.verified_at),
      isVerified:
        Boolean(document.verified_at) ||
        String(document.status ?? "").toLowerCase() === "approved",
      expiryLabel: formatExpiryLabel(extractExpiryDate(document)),
      viewUrl: await getBusinessDocumentUrl(supabase, document.file_url),
    })),
  );

  const certificationList = await Promise.all(
    ((certificationRows as SupplierCertificationRow[] | null) ?? []).map(
      async (certification) => ({
        certificationId: certification.certification_id,
        title: getCertificationTypeName(certification.certification_types),
        statusLabel: getStatusLabel(certification.status, certification.verified_at),
        isVerified:
          Boolean(certification.verified_at) ||
          String(certification.status ?? "").toLowerCase() === "approved",
        expiryLabel: formatExpiryLabel(certification.expires_at),
        viewUrl: await getCertificationDocumentUrl(supabase, certification.file_url),
      }),
    ),
  );

  const certificationTypeOptions = certificationRequirements
    .filter((requirement) => requirement.isActive && requirement.allowPostOnboardingSubmission)
    .map((requirement) => ({
      certTypeId: requirement.certTypeId,
      label: requirement.label,
    }))
    .filter((type) => type.label);

  const availableCategories = ((categoryRows as ProductCategoryRow[] | null) ?? [])
    .map((category) => ({
      categoryId: category.category_id,
      categoryName: category.category_name?.trim() || "Uncategorized",
    }))
    .filter((category) => category.categoryName);

  const initialSelectedCategoryIds = (
    (selectedCategoryRows as BusinessProfileCategoryRow[] | null) ?? []
  )
    .map((category) => category.category_id)
    .filter((categoryId) => Number.isFinite(categoryId));

  const initialOtherCategories = (
    (customCategoryRows as BusinessProfileCustomCategoryRow[] | null) ?? []
  )
    .map((category) => category.category_name?.trim() || "")
    .filter(Boolean);

  return (
    <div className="-m-6 min-h-screen bg-[#F6F8FB]">
      <section className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[14px] text-[#A4ACBA]">
            <span className="font-normal">KaSupply</span>
            <span className="text-[#CBD2DE]">/</span>
            <span className="font-medium text-[#1E3A5F]">Account Settings</span>
          </div>

          <div className="flex items-center gap-2">
            <HeaderActionIcon ariaLabel="Notifications">
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </HeaderActionIcon>
            <HeaderActionIcon ariaLabel="Messages">
              <MessageSquare className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </HeaderActionIcon>
          </div>
        </div>
      </section>

      <div className="px-[40px] py-[28px]">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[24px]">
            <h1 className="text-[23px] font-semibold text-[#1E3A5F]">
              Account Setting
            </h1>
            <p className="mt-[2px] text-[16px] text-[#94A3B8]">
              Manage your profile, permits, and certifications.
            </p>
          </div>

          <div className="border-b border-[#E6EBF3]">
            <nav className="flex items-center gap-[34px] px-[14px] pt-[18px]">
              {[
                ["Business Profile", "business"],
                ["Permits & Licenses", "permits"],
                ["Certifications", "certifications"],
              ].map(([label, value]) => {
                const isActive = activeTab === value;
                return (
                  <Link
                    key={value}
                    href={`/supplier/account-settings?tab=${value}`}
                    className={`relative pb-[12px] text-[16px] font-medium transition ${
                      isActive ? "text-[#3C6FF7]" : "text-[#C9CFDA]"
                    }`}
                  >
                    {label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#4E7CFF]" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-[14px]">
            {activeTab === "business" ? (
              <SupplierBusinessProfileForm
                headerBusinessName={businessProfile.business_name?.trim() || "Business Profile"}
                headerInitials="DF"
                userEmail={appUser.email?.trim() || ""}
                businessProfile={{
                  businessName: businessProfile.business_name?.trim() || "",
                  businessType: businessProfile.business_type?.trim() || "",
                  businessLocation: businessProfile.business_location?.trim() || "",
                  city: businessProfile.city?.trim() || "",
                  province: businessProfile.province?.trim() || "",
                  region: businessProfile.region?.trim() || "",
                  contactName: businessProfile.contact_name?.trim() || "",
                  contactNumber: businessProfile.contact_number?.trim() || "",
                  businessDescription: businessProfile.about?.trim() || "",
                }}
                categories={availableCategories}
                initialSelectedCategoryIds={initialSelectedCategoryIds}
                initialOtherCategories={initialOtherCategories}
              />
            ) : activeTab === "certifications" ? (
              <CertificationsForm
                certifications={certificationList}
                certificationTypes={certificationTypeOptions}
                saveAction={saveSupplierCertificationUpdates}
                addAction={uploadSupplierCertification}
              />
            ) : (
              <PermitsLicensesForm
                documents={permitRows}
                saveAction={saveSupplierPermitUpdates}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
