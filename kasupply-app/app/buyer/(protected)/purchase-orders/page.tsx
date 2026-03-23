import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

export default async function BuyerTransactionsPage() {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "documents",
    targetPath: "/buyer/purchase-orders",
    reason: "purchase-orders",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Transactions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Purchase orders and transaction history will appear here.
      </p>
    </div>
  );
}
