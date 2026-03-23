import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BusinessCategoriesStepForm } from "@/components/business-categories-step-form";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { saveBusinessProfileCategories } from "@/app/onboarding/categories/actions";

type BuyerCategoriesPageProps = {
  searchParams?: Promise<{
    next?: string;
    required?: string;
  }>;
};

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

function BuyerCategoriesPageFallback() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 text-sm text-[#8a94a6] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        Loading profile categories...
      </div>
    </main>
  );
}

async function BuyerCategoriesPageContent({
  searchParams,
}: BuyerCategoriesPageProps) {
  const status = await getUserOnboardingStatus();
  const params = (await searchParams) ?? {};

  if (!status.authenticated) {
    redirect("/login");
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
  }

  if (!status.hasBusinessProfile) {
    const query = new URLSearchParams();

    if (params.required) {
      query.set("required", params.required);
    }

    if (params.next) {
      query.set("next", params.next);
    }

    redirect(`/onboarding/buyer${query.toString() ? `?${query.toString()}` : ""}`);
  }

  const profileId = status.businessProfile?.profile_id;

  if (!profileId) {
    redirect("/onboarding/buyer");
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: savedCategories }, { data: customCategories }] =
    await Promise.all([
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
          initialSelectedCategoryIds={
            ((savedCategories as BusinessProfileCategoryRow[] | null) ?? []).map(
              (item) => item.category_id,
            )
          }
          initialOtherCategories={
            ((customCategories as BusinessProfileCustomCategoryRow[] | null) ?? []).map(
              (item) => item.category_name,
            )
          }
          backHref="/onboarding/buyer"
          sectionTitle="What are you looking for?"
          sectionDescription="Select the product categories or interests that match your buying needs."
          nextPath={params.next ?? null}
          requiredFlow={params.required ?? null}
          action={saveBusinessProfileCategories}
        />
      </div>
    </main>
  );
}

export default function BuyerCategoriesPage(props: BuyerCategoriesPageProps) {
  return (
    <Suspense fallback={<BuyerCategoriesPageFallback />}>
      <BuyerCategoriesPageContent {...props} />
    </Suspense>
  );
}
