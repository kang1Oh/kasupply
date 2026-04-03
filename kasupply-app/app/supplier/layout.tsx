import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { SupplierSidebar } from "@/components/supplier-sidebar";

function SupplierLayoutFallback() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="flex min-h-screen">
        <aside className="h-screen w-[230px] shrink-0 bg-[#1E3A5F] px-4 py-4 text-white">
          <div className="animate-pulse">
            <div className="h-10 w-32 rounded-xl bg-white/15" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-11 rounded-lg bg-white/10"
                />
              ))}
            </div>
            <div className="mt-[280px] h-14 rounded-xl bg-white/10" />
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
        </main>
      </div>
    </div>
  );
}

async function SupplierLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.role !== "supplier") {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (!status.hasSubmittedRequiredSupplierDocuments) {
    redirect("/onboarding/supplier-documents");
  }

  if (!status.hasSubmittedSiteImages) {
    redirect("/onboarding/supplier-site-images");
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="flex min-h-screen">
        <SupplierSidebar
          businessName={status.businessProfile?.business_name ?? "Supplier"}
          businessType={status.businessProfile?.business_type ?? "Supplier"}
        />

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SupplierLayoutFallback />}>
      <SupplierLayoutContent>{children}</SupplierLayoutContent>
    </Suspense>
  );
}
