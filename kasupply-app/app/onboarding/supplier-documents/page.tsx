import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getSupplierDocumentRequirements } from "@/lib/supplier-requirements";
import { SupplierDocumentsStepForm } from "./supplier-documents-step-form";

type DocumentTypeRow = {
  doc_type_id: number;
  document_type_name: string;
};

type UploadedDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  file_url: string | null;
  status: string | null;
};

type CertificationTypeRow = {
  cert_type_id: number;
  certification_type_name: string;
};

type SupplierProfileRow = {
  supplier_id: number;
};

type UploadedCertificationRow = {
  certification_id: number;
  cert_type_id: number;
  file_url: string | null;
  status: string | null;
};

function SupplierDocumentsPageFallback() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-5">
          <div className="mb-6 space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-[#e8edf4]" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#f3f6fa]" />
          </div>

          <div className="space-y-3">
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
          </div>

          <div className="flex justify-end pt-4">
            <div className="h-10 w-32 rounded-lg bg-[#e8edf4]" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function SupplierDocumentsPageContent() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (!status.hasCompletedCategorySelection) {
    redirect("/onboarding/categories");
  }

  if (status.role !== "supplier") {
    redirect("/dashboard");
  }

  if (status.hasSubmittedRequiredSupplierDocuments && status.hasSubmittedSiteImages) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const businessProfileId = status.businessProfile?.profile_id;

  if (!businessProfileId) {
    redirect("/onboarding");
  }

  const { data: uploadedDocuments, error: uploadedDocumentsError } = await supabase
    .from("business_documents")
    .select("doc_id, doc_type_id, file_url, status")
    .eq("profile_id", businessProfileId)
    .not("file_url", "is", null);

  if (uploadedDocumentsError) {
    throw new Error(uploadedDocumentsError.message || "Failed to load uploaded documents.");
  }

  const safeUploadedDocuments = (
    (uploadedDocuments as UploadedDocumentRow[] | null) ?? []
  )
    .filter((document) => Boolean(document.file_url?.trim()))
    .map(({ doc_id, doc_type_id, file_url, status }) => ({
      doc_id,
      doc_type_id,
      file_url,
      status,
    }));

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id")
    .eq("profile_id", businessProfileId)
    .maybeSingle<SupplierProfileRow>();

  if (supplierProfileError) {
    throw new Error(supplierProfileError.message || "Failed to load supplier profile.");
  }

  const { data: certificationTypes, error: certificationTypesError } = await supabase
    .from("certification_types")
    .select("cert_type_id, certification_type_name")
    .order("cert_type_id", { ascending: true });

  if (certificationTypesError) {
    throw new Error(certificationTypesError.message || "Failed to load certification types.");
  }

  const safeCertificationTypes = (
    (certificationTypes as CertificationTypeRow[] | null) ?? []
  ).map(({ cert_type_id, certification_type_name }) => ({
    cert_type_id,
    certification_type_name,
  }));

  let safeUploadedCertifications: {
    certification_id: number;
    cert_type_id: number;
    file_url: string | null;
    status: string | null;
  }[] = [];

  if (supplierProfile?.supplier_id) {
    const { data: uploadedCertifications, error: uploadedCertificationsError } =
      await supabase
        .from("supplier_certifications")
        .select("certification_id, cert_type_id, file_url, status")
        .eq("supplier_id", supplierProfile.supplier_id)
        .not("file_url", "is", null);

    if (uploadedCertificationsError) {
      throw new Error(
        uploadedCertificationsError.message || "Failed to load uploaded certifications.",
      );
    }

    safeUploadedCertifications = (
      (uploadedCertifications as UploadedCertificationRow[] | null) ?? []
    )
      .filter((certification) => Boolean(certification.file_url?.trim()))
      .map(({ certification_id, cert_type_id, file_url, status }) => ({
        certification_id,
        cert_type_id,
        file_url,
        status,
      }));
  }

  const documentRequirements = await getSupplierDocumentRequirements(supabase);
  const activeDocumentRequirements = documentRequirements.filter(
    (requirement) => requirement.isActive && requirement.showInOnboarding,
  );

  const requiredDocumentTypes: DocumentTypeRow[] = activeDocumentRequirements
    .filter((requirement) => requirement.isRequired)
    .map((requirement) => ({
      doc_type_id: requirement.docTypeId,
      document_type_name: requirement.label,
    }));

  const optionalDocumentTypes: DocumentTypeRow[] = activeDocumentRequirements
    .filter((requirement) => !requirement.isRequired)
    .map((requirement) => ({
      doc_type_id: requirement.docTypeId,
      document_type_name: requirement.label,
    }));

  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <SupplierDocumentsStepForm
          requiredDocumentTypes={requiredDocumentTypes}
          optionalDocumentTypes={optionalDocumentTypes}
          uploadedDocuments={safeUploadedDocuments}
          certificationTypes={safeCertificationTypes}
          uploadedCertifications={safeUploadedCertifications}
          canProceed={status.hasSubmittedRequiredSupplierDocuments}
        />
      </div>
    </div>
  );
}

export default function SupplierDocumentsPage() {
  return (
    <Suspense fallback={<SupplierDocumentsPageFallback />}>
      <SupplierDocumentsPageContent />
    </Suspense>
  );
}