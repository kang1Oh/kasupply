import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupplierCertificationRequirements } from "@/lib/supplier-requirements";
import {
  saveSupplierCertificationUpdates,
  saveSupplierPermitUpdates,
  uploadSupplierCertification,
} from "./actions";
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
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
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
  children,
}: {
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#E6EBF3] bg-[#FBFCFE] text-[#B4BECF] transition hover:border-[#D7E0EC] hover:text-[#7D8CA3]"
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
  const activeTab = resolvedSearchParams.tab === "business" ? "business" : resolvedSearchParams.tab === "certifications" ? "certifications" : "permits";

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
    .select("profile_id, business_name, business_type")
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

  return (
    <div className="-m-6 min-h-screen bg-[#F6F8FB]">
      <header className="border-b border-[#E6EBF3] bg-white">
        <div className="flex items-center justify-between px-[20px] py-[10px]">
          <div className="flex items-center gap-[8px] text-[11px] text-[#B0B9C8]">
            <span>KaSupply</span>
            <span>&gt;</span>
            <span className="font-medium text-[#708196]">Account Settings</span>
          </div>

          <div className="flex items-center gap-[8px]">
            <HeaderActionIcon>
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
                <path
                  d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.12c0 .48-.16.94-.46 1.31l-1.2 1.53a1 1 0 0 0 .79 1.61h10.24a1 1 0 0 0 .79-1.61l-1.2-1.53a2.1 2.1 0 0 1-.46-1.31V9A4.25 4.25 0 0 0 12 4.75Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.25 18a1.75 1.75 0 0 0 3.5 0"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </HeaderActionIcon>
            <HeaderActionIcon>
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
                <path
                  d="M7.25 7.25h9.5a2 2 0 0 1 2 2v6.02a2 2 0 0 1-2 2h-5.08l-2.92 2.48c-.65.55-1.65.09-1.65-.76v-1.72H7.25a2 2 0 0 1-2-2V9.25a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </HeaderActionIcon>
          </div>
        </div>
      </header>

      <div className="px-[20px] py-[14px]">
        <div className="mx-auto max-w-[1040px]">
          <div className="border-b border-[#E9EEF5] pb-[11px]">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#223654]">
              Account Setting
            </h1>
            <p className="mt-[2px] text-[12px] text-[#9CA8B9]">
              Manage your profile, permits, and certifications.
            </p>
          </div>

          <div className="border-b border-[#E9EEF5]">
            <nav className="flex items-center gap-[26px] px-[10px] pt-[13px]">
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
                    className={`relative pb-[10px] text-[12px] font-medium transition ${
                      isActive ? "text-[#3C6FF7]" : "text-[#C1C8D4]"
                    }`}
                  >
                    {label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#5F88FF]" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-[14px]">
            {activeTab === "certifications" ? (
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
