import { BuyerMarketplaceHome } from "@/components/buyer-marketplace-home";
import { createClient } from "@/lib/supabase/server";
import { getSupplierSearchResults } from "./search/actions";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function BuyerPage() {
  const supabase = await createClient();
  const supplierResults = await getSupplierSearchResults();
  const { data: categoryRows } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true })
    .limit(6);

  const suppliers = supplierResults.map((supplier) => {
    const categoryTags = Array.from(
      new Set(
        supplier.products
          .map((product) => product.categoryName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return {
      supplierId: supplier.supplierId,
      profileId: supplier.profileId,
      name: supplier.businessName,
      initials: getInitials(supplier.businessName),
      avatarUrl: supplier.avatarUrl,
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
    <main className="space-y-6 py-6">
      <BuyerMarketplaceHome
        heroCategories={categoryRows ?? []}
        suppliers={suppliers}
      />
    </main>
  );
}
