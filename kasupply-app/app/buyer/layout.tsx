import { Suspense } from "react";
import type { ReactNode } from "react";
import { BuyerFooter } from "@/components/buyer-footer";
import { BuyerHeader } from "@/components/buyer-header";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function BuyerLayoutFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BuyerHeader isLoggedIn={false} />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        Loading buyer area...
      </main>
      <BuyerFooter />
    </div>
  );
}

async function BuyerLayoutContent({ children }: { children: ReactNode }) {
  const status = await getUserOnboardingStatus();

  const user = status.appUser;

  const accessLinks = {
    rfqs:
      getBuyerAccessRedirect(status, {
        requirement: "profile",
        targetPath: "/buyer/rfqs",
        reason: "rfq",
      }) ?? "/buyer/rfqs",
    sourcingBoard:
      getBuyerAccessRedirect(status, {
        requirement: "profile",
        targetPath: "/buyer/sourcing-board",
        reason: "sourcing-board",
      }) ?? "/buyer/sourcing-board",
    purchaseOrders:
      getBuyerAccessRedirect(status, {
        requirement: "documents",
        targetPath: "/buyer/purchase-orders",
        reason: "purchase-orders",
      }) ?? "/buyer/purchase-orders",
    messages:
      getBuyerAccessRedirect(status, {
        requirement: "profile",
        targetPath: "/buyer/messages",
        reason: "messages",
      }) ?? "/buyer/messages",
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BuyerHeader
        isLoggedIn={!!user}
        userName={user?.name ?? null}
        accessLinks={accessLinks}
      />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <BuyerFooter />
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
