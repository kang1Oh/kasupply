import { BuyerSearchPage } from "@/components/buyer-search-page";
import { getSupplierSearchResults } from "./actions";

export default async function BuyerSearchPageRoute({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialSearchQuery = resolvedSearchParams.q?.trim() ?? "";
  const suppliers = await getSupplierSearchResults({
    query: initialSearchQuery,
  });

  return (
    <BuyerSearchPage
      suppliers={suppliers}
      initialSearchQuery={initialSearchQuery}
    />
  );
}
