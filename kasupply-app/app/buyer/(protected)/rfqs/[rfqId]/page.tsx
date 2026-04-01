import { notFound } from "next/navigation";
import { BuyerRfqDetailPage } from "@/components/buyer-rfq-detail-page";
import { getRFQDetails } from "./actions";

export default async function BuyerRFQDetailPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{
    rfqId: string;
  }>;
  searchParams?: Promise<{
    modal?: string;
    quoteId?: string;
    engagementId?: string;
  }>;
}) {
  const { rfqId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const numericRfqId = Number(rfqId);

  if (!numericRfqId || Number.isNaN(numericRfqId)) {
    notFound();
  }

  const data = await getRFQDetails(numericRfqId);

  if (!data) {
    notFound();
  }

  return (
    <BuyerRfqDetailPage
      data={data}
      modal={resolvedSearchParams.modal}
      quoteId={resolvedSearchParams.quoteId}
      engagementId={resolvedSearchParams.engagementId}
    />
  );
}
