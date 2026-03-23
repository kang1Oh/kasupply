import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BuyerDocumentsForm } from "@/components/buyer-documents-form";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

type BuyerDocumentsPageProps = {
  searchParams?: Promise<{
    next?: string;
    required?: string;
  }>;
};

function BuyerDocumentsPageFallback() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 text-sm text-[#8a94a6] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        Loading verification requirements...
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

  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <BuyerDocumentsForm
          nextPath={params.next ?? null}
          requiredFlow={params.required ?? null}
        />
      </div>
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
