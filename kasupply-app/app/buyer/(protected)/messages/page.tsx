import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

export default async function BuyerMessagesPage() {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "profile",
    targetPath: "/buyer/messages",
    reason: "messages",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Messaging</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Buyer conversations and inbox will appear here.
      </p>
    </div>
  );
}
