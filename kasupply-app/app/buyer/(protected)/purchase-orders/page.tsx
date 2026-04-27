import { redirect } from "next/navigation";
import { BuyerPurchaseOrdersPage } from "@/components/buyer-purchase-orders-page";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getBuyerPurchaseOrders, getPurchaseOrderCreationDraft } from "./data";
import { CreatePurchaseOrderPage } from "./create-purchase-order-page";

export default async function BuyerPurchaseOrdersRoute({
  searchParams,
}: {
  searchParams?: Promise<{
    rfqId?: string;
    quoteId?: string;
  }>;
}) {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "documents",
    targetPath: "/buyer/purchase-orders",
    reason: "purchase-orders",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const rfqId = Number(resolvedSearchParams.rfqId || "");
  const quoteId = Number(resolvedSearchParams.quoteId || "");
  const shouldLoadDraft =
    !Number.isNaN(rfqId) && rfqId > 0 && !Number.isNaN(quoteId) && quoteId > 0;

  if (shouldLoadDraft) {
    const creationDraft = await getPurchaseOrderCreationDraft(rfqId, quoteId);

    if (!creationDraft) {
      return (
        <main className="mx-auto w-full max-w-[1120px] pb-5 pt-[2px]">
          <section className="rounded-[16px] border border-[#e8edf4] bg-white px-[20px] py-[22px] shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <h1 className="text-[22px] font-semibold text-[#223654]">
              Purchase order draft unavailable
            </h1>
            <p className="mt-[8px] text-[14px] text-[#8c97a7]">
              The confirmed quotation for this RFQ could not be loaded.
            </p>
          </section>
        </main>
      );
    }

    if (creationDraft.existingPurchaseOrderId) {
      redirect(`/buyer/purchase-orders/${creationDraft.existingPurchaseOrderId}`);
    }

    return <CreatePurchaseOrderPage creationDraft={creationDraft} />;
  }

  const orders = await getBuyerPurchaseOrders();

  return (
    <main className="space-y-5 pb-2">
      <BuyerPurchaseOrdersPage orders={orders} />
    </main>
  );
}
