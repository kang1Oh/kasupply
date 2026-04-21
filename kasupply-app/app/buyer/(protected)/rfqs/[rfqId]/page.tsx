import { notFound } from "next/navigation";
import { BuyerRfqDetailPage } from "@/components/buyer-rfq-detail-page";
import { getRFQDetails } from "./actions";

export default async function BuyerRFQDetailPageRoute({
  params,
}: {
  params: Promise<{
    rfqId: string;
  }>;
}) {
  const { rfqId } = await params;
  const numericRfqId = Number(rfqId);

  if (!numericRfqId || Number.isNaN(numericRfqId)) {
    notFound();
  }

  const data = await getRFQDetails(numericRfqId);

  if (!data) {
    notFound();
  }

  return <BuyerRfqDetailPage data={data} />;
}
