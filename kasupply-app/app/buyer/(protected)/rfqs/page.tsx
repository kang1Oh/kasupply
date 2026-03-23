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
    <div>
      <h1 className="text-2xl font-bold">RFQs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Buyer RFQ creation and tracking will appear here.
      </p>
    </div>
  );
}
