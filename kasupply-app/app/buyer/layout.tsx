import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { BuyerHeader } from "@/components/buyer-header";

function BuyerLayoutFallback() {
  return <div className="p-6">Loading buyer area...</div>;
}

async function BuyerLayoutContent({ children }: { children: ReactNode }) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
  }

  if (!status.hasBusinessProfile || !status.hasBuyerProfile) {
    redirect("/onboarding");
  }

  if (!status.hasSubmittedBuyerDocuments) {
    redirect("/onboarding/buyer-documents");
  }

  return (
    <div className="min-h-screen bg-black">
      <BuyerHeader />
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </div>
  );
}

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<BuyerLayoutFallback />}>
      <BuyerLayoutContent>{children}</BuyerLayoutContent>
    </Suspense>
  );
}