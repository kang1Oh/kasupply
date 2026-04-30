import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BuyerDocumentsForm } from "@/components/buyer-documents-form";
import { AccountActivatedModal } from "@/components/modals/account-activated-modal";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

type BuyerDocumentsPageProps = {
  searchParams?: Promise<{
    activated?: string;
    next?: string;
    result?: string;
    required?: string;
  }>;
};

function BuyerDocumentsPageFallback() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-5">
          <div className="mb-6 space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-[#e8edf4]" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#f3f6fa]" />
          </div>

          <div className="space-y-3">
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
            <div className="h-14 rounded-xl bg-[#f3f6fa]" />
          </div>

          <div className="flex justify-end pt-4">
            <div className="h-10 w-32 rounded-lg bg-[#e8edf4]" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function BuyerDocumentsPageContent({
  searchParams,
}: BuyerDocumentsPageProps) {
  const status = await getUserOnboardingStatus();
  const params = (await searchParams) ?? {};

  if (!status.authenticated) {
    redirect("/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding/buyer");
  }

  if (!status.hasCompletedCategorySelection) {
    const query = new URLSearchParams();

    if (params.required) {
      query.set("required", params.required);
    }

    if (params.next) {
      query.set("next", params.next);
    }

    redirect(
      `/onboarding/buyer/categories${
        query.toString() ? `?${query.toString()}` : ""
      }`,
    );
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
  }

  const isActivatedModalOpen =
    params.activated === "1" && params.result === "approved";

  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <BuyerDocumentsForm
          nextPath={params.next ?? null}
          requiredFlow={params.required ?? null}
        />
      </div>
      <AccountActivatedModal isOpen={isActivatedModalOpen} />
    </div>
  );
}

export default function BuyerDocumentsPage(props: BuyerDocumentsPageProps) {
  return (
    <Suspense fallback={<BuyerDocumentsPageFallback />}>
      <BuyerDocumentsPageContent {...props} />
    </Suspense>
  );
}
