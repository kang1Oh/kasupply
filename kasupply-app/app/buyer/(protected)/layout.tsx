import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function ProtectedBuyerLayoutFallback() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="mb-6 space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-[#e8edf4]" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[#f3f6fa]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-[#e4e9f1] bg-[#f3f6fa]"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

async function ProtectedBuyerLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/login?source=buyer-protected-layout");
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
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