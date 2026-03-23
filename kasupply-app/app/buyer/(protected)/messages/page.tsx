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
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#223654]">Messages</h1>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Buyer conversations and inbox will appear here.
        </p>
      </div>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Inbox</h2>
        <p className="mt-2 text-sm text-[#8b95a5]">
          View supplier conversations, respond to inquiries, and keep procurement discussions organized.
        </p>
      </section>
    </main>
  );
}
