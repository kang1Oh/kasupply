import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BuyerAccountForm } from "@/components/buyer-account-form";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

type BuyerOnboardingPageProps = {
  searchParams?: Promise<{
    next?: string;
    required?: string;
  }>;
};

function BuyerOnboardingPageFallback() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-9 w-72 rounded-md bg-[#edf1f7]" />
              <div className="h-4 w-80 rounded-md bg-[#f3f6fa]" />
            </div>
            <div className="h-4 w-20 rounded-md bg-[#f3f6fa]" />
          </div>

          <div className="h-5 w-full rounded-md bg-[#f3f6fa]" />
          <div className="h-[520px] rounded-[14px] bg-[#fafbfd]" />
        </div>
      </div>
    </main>
  );
}

async function BuyerOnboardingPageContent({
  searchParams,
}: BuyerOnboardingPageProps) {
  const status = await getUserOnboardingStatus();
  const params = (await searchParams) ?? {};

  if (!status.authenticated) {
    redirect("/login");
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <BuyerAccountForm
          user={{
            name: status.appUser?.name ?? "",
            email: status.appUser?.email ?? "",
          }}
          businessProfile={{
            business_name: status.businessProfile?.business_name ?? "",
            business_type: status.businessProfile?.business_type ?? "",
            contact_name: status.businessProfile?.contact_name ?? "",
            contact_number: status.businessProfile?.contact_number ?? "",
            business_location: status.businessProfile?.business_location ?? "",
            city: status.businessProfile?.city ?? "",
            province: status.businessProfile?.province ?? "",
            region: status.businessProfile?.region ?? "",
            about: status.businessProfile?.about ?? "",
          }}
          documentId={null}
          documentVisibility={false}
          nextPath={params.next ?? null}
          requiredFlow={params.required ?? null}
        />
      </div>
    </main>
  );
}

export default function BuyerOnboardingPage(props: BuyerOnboardingPageProps) {
  return (
    <Suspense fallback={<BuyerOnboardingPageFallback />}>
      <BuyerOnboardingPageContent {...props} />
    </Suspense>
  );
}
