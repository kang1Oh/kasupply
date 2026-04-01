import { BuyerRfqsPage } from "@/components/buyer-rfqs-page";
import { getBuyerRFQs } from "./actions";

export default async function BuyerRFQsPage() {
  const rfqs = await getBuyerRFQs();

  return <BuyerRfqsPage rfqs={rfqs} />;
}
