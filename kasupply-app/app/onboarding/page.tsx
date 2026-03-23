import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { completeOnboarding } from "./actions";
import { OnboardingStepOneForm } from "./onboarding-step-one-form";

const PHILIPPINE_REGIONS = [
  "NCR - National Capital Region",
  "CAR - Cordillera Administrative Region",
  "Region I - Ilocos Region",
  "Region II - Cagayan Valley",
  "Region III - Central Luzon",
  "Region IV-A - CALABARZON",
  "Region IV-B - MIMAROPA",
  "Region V - Bicol Region",
  "Region VI - Western Visayas",
  "Region VII - Central Visayas",
  "Region VIII - Eastern Visayas",
  "Region IX - Zamboanga Peninsula",
  "Region X - Northern Mindanao",
  "Region XI - Davao Region",
  "Region XII - SOCCSKSARGEN",
  "Region XIII - Caraga",
  "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao",
];

function OnboardingPageFallback() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 text-sm text-[#8a94a6] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        Loading onboarding...
      </div>
    </main>
  );
}

async function OnboardingPageContent() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.role === "buyer") {
    redirect("/buyer");
  }

  if (status.hasBusinessProfile && !status.hasCompletedCategorySelection) {
    redirect("/onboarding/categories");
  }

  if (
    status.hasBusinessProfile &&
    status.hasCompletedCategorySelection &&
    !status.hasSubmittedRequiredSupplierDocuments
  ) {
    redirect("/onboarding/supplier-documents");
  }

  if (
    status.hasBusinessProfile &&
    status.hasCompletedCategorySelection &&
    status.hasSubmittedRequiredSupplierDocuments &&
    !status.hasSubmittedSiteImages
  ) {
    redirect("/onboarding/supplier-site-images");
  }

  if (status.hasBusinessProfile) {
    redirect("/supplier/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <OnboardingStepOneForm
          action={completeOnboarding}
          regions={PHILIPPINE_REGIONS}
        />
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingPageFallback />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
