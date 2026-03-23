import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { SupplierSiteImageUploadForm } from "@/components/supplier-site-image-upload-form";

function SupplierSiteImagesPageFallback() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 text-sm text-[#8a94a6] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        Loading site verification images...
      </div>
    </div>
  );
}

async function SupplierSiteImagesPageContent() {
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

  if (!status.hasSubmittedRequiredSupplierDocuments) {
    redirect("/onboarding/supplier-documents");
  }

  const profileId = status.businessProfile?.profile_id;

  if (!profileId) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <SupplierSiteImageUploadForm
          existingImages={status.siteImages}
        />
      </div>
    </div>
  );
}

export default function SupplierSiteImagesPage() {
  return (
    <Suspense fallback={<SupplierSiteImagesPageFallback />}>
      <SupplierSiteImagesPageContent />
    </Suspense>
  );
}
