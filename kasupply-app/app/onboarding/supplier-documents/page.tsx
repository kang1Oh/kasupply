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
    .select("doc_id, doc_type_id, status")
    .eq("profile_id", businessProfileId);

  if (uploadedDocumentsError) {
    throw new Error(uploadedDocumentsError.message || "Failed to load uploaded documents.");
  }

  const safeUploadedDocuments = (uploadedDocuments as UploadedDocumentRow[] | null) ?? [];
  const documentRequirements = await getSupplierDocumentRequirements(supabase);
  const activeDocumentRequirements = documentRequirements.filter(
    (requirement) => requirement.isActive && requirement.showInOnboarding
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
