import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BusinessCategoriesStepForm } from "@/components/business-categories-step-form";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { saveBusinessProfileCategories } from "./actions";

type ProductCategoryRow = {
  category_id: number;
  category_name: string;
};

type BusinessProfileCategoryRow = {
  category_id: number;
};

type BusinessProfileCustomCategoryRow = {
  category_name: string;
};

function CategoriesPageFallback() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="mb-6 space-y-2">
          <div className="h-6 w-56 animate-pulse rounded bg-[#e8edf4]" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#f3f6fa]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl border border-[#e4e9f1] bg-[#f3f6fa]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function CategoriesPageContent() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/login");
  }

  if (status.role !== "supplier") {
    redirect("/dashboard");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (status.hasCompletedCategorySelection) {
    redirect("/onboarding/supplier-documents");
  }

  const supabase = await createClient();
  const profileId = status.businessProfile?.profile_id;

  if (!profileId) {
    redirect("/onboarding");
  }

  const [
    { data: categories },
    { data: savedCategories },
    { data: customCategories },
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("category_id, category_name")
      .order("category_name", { ascending: true }),
    supabase
      .from("business_profile_categories")
      .select("category_id")
      .eq("profile_id", profileId),
    supabase
      .from("business_profile_custom_categories")
      .select("category_name")
      .eq("profile_id", profileId),
  ]);

  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <BusinessCategoriesStepForm
          categories={(categories as ProductCategoryRow[] | null) ?? []}
          initialSelectedCategoryIds={(
            (savedCategories as BusinessProfileCategoryRow[] | null) ?? []
          ).map((item) => item.category_id)}
          initialOtherCategories={(
            (customCategories as BusinessProfileCustomCategoryRow[] | null) ?? []
          ).map((item) => item.category_name)}
          backHref="/onboarding"
          action={saveBusinessProfileCategories}
        />
      </div>
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageFallback />}>
      <CategoriesPageContent />
    </Suspense>
  );
}