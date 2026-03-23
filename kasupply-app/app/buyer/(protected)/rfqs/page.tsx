import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

export default async function BuyerRFQsPage() {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "profile",
    targetPath: "/buyer/rfqs",
    reason: "rfq",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#223654]">RFQs</h1>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Buyer RFQ creation and tracking will appear here.
        </p>
      </div>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">RFQ Workspace</h2>
        <p className="mt-2 text-sm text-[#8b95a5]">
          Create new requests, review supplier responses, and track RFQ activity in one place.
        </p>
      </section>
    </main>
  );
}
