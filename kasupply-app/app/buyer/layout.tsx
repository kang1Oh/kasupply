import { Suspense } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { BuyerFooter } from "@/components/buyer-footer";
import { BuyerHeader } from "@/components/buyer-header";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { getBuyerUnreadNotificationCount } from "@/lib/buyer/notifications";

function BuyerLayoutFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-[#e6edf6] bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 sm:px-5 lg:px-6">
          <div className="h-7 w-32 rounded-lg bg-[#eef3f9]" />
          <div className="hidden items-center gap-3 lg:flex">
            <div className="h-8 w-16 rounded-lg bg-[#eef3f9]" />
            <div className="h-8 w-16 rounded-lg bg-[#eef3f9]" />
            <div className="h-8 w-14 rounded-lg bg-[#eef3f9]" />
            <div className="h-8 w-28 rounded-lg bg-[#eef3f9]" />
            <div className="h-8 w-28 rounded-lg bg-[#eef3f9]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#eef3f9]" />
            <div className="h-9 w-9 rounded-lg bg-[#eef3f9]" />
            <div className="h-9 w-px bg-[#eef3f9]" />
            <div className="h-9 w-9 rounded-full bg-[#eef3f9]" />
          </div>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 px-4 py-5 sm:px-5 lg:px-6">
        <div className="w-full space-y-4">
          <div className="h-10 w-56 rounded-xl bg-[#f3f6fb]" />
          <div className="h-56 rounded-[24px] bg-[#f3f6fb]" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 rounded-[24px] bg-[#f3f6fb]" />
            <div className="h-48 rounded-[24px] bg-[#f3f6fb]" />
          </div>
        </div>
      </main>
      <BuyerFooter />
    </div>
  );
}

async function BuyerLayoutContent({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const status = await getUserOnboardingStatus();

  const user = status.appUser;
  const unreadNotificationCount = user
    ? await getBuyerUnreadNotificationCount(user.user_id)
    : 0;

  // Fetch business profile for the header avatar initials
  let businessName: string | null = null;
  if (user) {
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", user.user_id)
      .maybeSingle();
    businessName = businessProfile?.business_name ?? null;
  }

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
    notifications:
      getBuyerAccessRedirect(status, {
        requirement: "authenticated",
        targetPath: "/buyer/notifications",
        reason: "notifications",
      }) ?? "/buyer/notifications",
    account:
      getBuyerAccessRedirect(status, {
        requirement: "authenticated",
        targetPath: "/buyer/account",
      }) ?? "/buyer/account",
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BuyerHeader
        isLoggedIn={!!user}
        userName={user?.name ?? null}
        businessName={businessName}
        accessLinks={accessLinks}
        unreadNotificationCount={unreadNotificationCount}
      />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-3 sm:px-5 lg:px-6">
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
