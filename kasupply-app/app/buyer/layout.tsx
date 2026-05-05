import { Suspense } from "react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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
  let status: Awaited<ReturnType<typeof getUserOnboardingStatus>> | null = null;

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    status = claimsData?.claims ? await getUserOnboardingStatus() : null;
  } catch (error) {
    console.error("Unable to load buyer auth claims for layout.", error);
  }

  const user = status?.appUser ?? null;

  if (status?.authenticated && status.role && status.role !== "buyer") {
    redirect("/dashboard");
  }

  if (status?.authenticated && status.role === "buyer") {
    if (!status.hasBusinessProfile) {
      redirect("/onboarding/buyer");
    }

    if (!status.hasCompletedCategorySelection) {
      redirect("/onboarding/buyer/categories");
    }

    if (!status.hasApprovedBuyerDocuments) {
      redirect("/onboarding/buyer-documents");
    }
  }

  let unreadNotificationCount = 0;

  if (user) {
    try {
      unreadNotificationCount = await getBuyerUnreadNotificationCount(user.user_id);
    } catch (error) {
      console.error("Unable to load buyer unread notifications.", error);
    }
  }

  // Fetch business profile for the header avatar initials
  let businessName: string | null = null;
  if (user) {
    try {
      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("business_name")
        .eq("user_id", user.user_id)
        .maybeSingle();
      businessName = businessProfile?.business_name ?? null;
    } catch (error) {
      console.error("Unable to load buyer business name for header.", error);
    }
  }

  const accessLinks = {
    rfqs:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "profile",
            targetPath: "/buyer/rfqs",
            reason: "rfq",
          })
        : null) ?? "/buyer/rfqs",
    sourcingBoard:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "profile",
            targetPath: "/buyer/sourcing-board",
            reason: "sourcing-board",
          })
        : null) ?? "/buyer/sourcing-board",
    purchaseOrders:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "documents",
            targetPath: "/buyer/purchase-orders",
            reason: "purchase-orders",
          })
        : null) ?? "/buyer/purchase-orders",
    messages:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "profile",
            targetPath: "/buyer/messages",
            reason: "messages",
          })
        : null) ?? "/buyer/messages",
    notifications:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "authenticated",
            targetPath: "/buyer/notifications",
            reason: "notifications",
          })
        : null) ?? "/buyer/notifications",
    account:
      (status
        ? getBuyerAccessRedirect(status, {
            requirement: "authenticated",
            targetPath: "/buyer/account",
          })
        : null) ?? "/buyer/account",
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BuyerHeader
        isLoggedIn={!!user}
        userName={user?.name ?? null}
        businessName={businessName}
        avatarUrl={user?.avatar_url ?? null}
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
