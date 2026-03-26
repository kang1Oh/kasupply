import { BuyerSearchPage } from "@/components/buyer-search-page";
import { getSupplierSearchResults } from "../../search/actions";

export default async function BuyerSearchPageRoute() {
  const suppliers = await getSupplierSearchResults();

  return <BuyerSearchPage suppliers={suppliers} />;
}
