import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function ProtectedBuyerLayoutFallback() {
  return <div className="p-6">Loading buyer area...</div>;
}

async function ProtectedBuyerLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login?source=buyer-protected-layout");
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

  return <>{children}</>;
}

export default function ProtectedBuyerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<ProtectedBuyerLayoutFallback />}>
      <ProtectedBuyerLayoutContent>{children}</ProtectedBuyerLayoutContent>
    </Suspense>
  );
}