import { notFound } from "next/navigation";
import { BuyerSourcingRequestDetailPage } from "@/components/buyer-sourcing-request-detail-page";
import { getSourcingRequestPageData } from "./actions";

export default async function SourcingRequestDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{
    rfqId: string;
  }>;
  searchParams?: Promise<{
    modal?: string;
  }>;
}) {
  const { rfqId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const numericRfqId = Number(rfqId);

  if (!numericRfqId || Number.isNaN(numericRfqId)) {
    notFound();
  }

  const pageData = await getSourcingRequestPageData(numericRfqId);

  if (!pageData) {
    notFound();
  }

  return (
    <BuyerSourcingRequestDetailPage
      buyerBusinessName={pageData.buyerBusinessName}
      data={pageData.data}
      modal={resolvedSearchParams.modal}
    />
  );
}
