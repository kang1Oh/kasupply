import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { SupplierDocumentsStepForm } from "./supplier-documents-step-form";

type DocumentTypeRow = {
  doc_type_id: number;
  document_type_name: string;
};

type UploadedDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
};

const REQUIRED_DOCUMENT_NAMES = [
  "DTI Business Registration Certificate",
  "Mayor's Permit",
  "BIR Certificate",
];

const REQUIRED_DOCUMENT_ORDER = new Map(
  REQUIRED_DOCUMENT_NAMES.map((name, index) => [name, index])
);

function SupplierDocumentsPageFallback() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 text-sm text-[#8a94a6] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        Loading verification requirements...
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

  const { data: documentTypes, error: documentTypesError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .order("document_type_name", { ascending: true });

  if (documentTypesError) {
    throw new Error(documentTypesError.message || "Failed to load document types.");
  }

  const businessProfileId = status.businessProfile?.profile_id;

  if (!businessProfileId) {
    redirect("/onboarding");
  }

  const { data: uploadedDocuments, error: uploadedDocumentsError } = await supabase
    .from("business_documents")
    .select("doc_id, doc_type_id, status")
    .eq("profile_id", businessProfileId);

  if (uploadedDocumentsError) {
    throw new Error(uploadedDocumentsError.message || "Failed to load uploaded documents.");
  }

  const safeDocumentTypes = (documentTypes as DocumentTypeRow[] | null) ?? [];
  const safeUploadedDocuments = (uploadedDocuments as UploadedDocumentRow[] | null) ?? [];

  const requiredDocumentTypes = safeDocumentTypes.filter((docType) =>
    REQUIRED_DOCUMENT_NAMES.includes(docType.document_type_name)
  )
  .sort((left, right) => {
    const leftOrder = REQUIRED_DOCUMENT_ORDER.get(left.document_type_name) ?? 999;
    const rightOrder = REQUIRED_DOCUMENT_ORDER.get(right.document_type_name) ?? 999;

    return leftOrder - rightOrder;
  });

  const optionalDocumentTypes = safeDocumentTypes.filter(
    (docType) => !REQUIRED_DOCUMENT_NAMES.includes(docType.document_type_name)
  );

  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <SupplierDocumentsStepForm
          requiredDocumentTypes={requiredDocumentTypes}
          optionalDocumentTypes={optionalDocumentTypes}
          uploadedDocuments={safeUploadedDocuments}
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
