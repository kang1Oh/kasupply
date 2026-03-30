import { BuyerMarketplaceHome } from "@/components/buyer-marketplace-home";
import { AccountActivatedModal } from "@/components/modals";
import { createClient } from "@/lib/supabase/server";
import { getSupplierSearchResults } from "./search/actions";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getPastSuppliers } from "./actions";

type BuyerPageProps = {
  searchParams?: Promise<{
    activated?: string;
  }>;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function BuyerPage({ searchParams }: BuyerPageProps) {
  const supabase = await createClient();
  const supplierResults = await getSupplierSearchResults();
  const { data: categoryRows } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true })
    .limit(6);

  const params = (await searchParams) ?? {};
  const showActivatedModal = params.activated === "1";

  const suppliers = supplierResults.map((supplier) => {
    const categoryTags = Array.from(
      new Set(
        supplier.products
          .map((product) => product.categoryName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return {
      id: supplier.supplierId,
      profileId: supplier.profileId,
      name: supplier.businessName,
      initials: getInitials(supplier.businessName),
      supplierType: supplier.businessType,
      categoryTags,
      shortDescription:
        supplier.about?.trim() || "No business description provided yet.",
      location: supplier.city,
      verified: true,
      recommendationScore: categoryTags.length,
      matchLabel: "No match yet",
      reviewLabel: "No reviews yet",
    };
  });

  return (
    <>
      <AccountActivatedModal
        isOpen={showActivatedModal}
        title="Account activated!"
        description="Your buyer account is verified and ready. You can now browse suppliers, send RFQs, and post on the sourcing board."
        ctaHref="/buyer"
        ctaLabel="Go To Dashboard"
      />

      <main className="space-y-6 py-6">
        <BuyerMarketplaceHome
          heroCategories={categoryRows ?? []}
          suppliers={suppliers}
        />
      </main>
    </>
  );
}
