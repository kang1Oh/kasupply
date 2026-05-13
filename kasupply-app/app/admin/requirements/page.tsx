import { Suspense } from "react";
import Link from "next/link";
import { AdminRequirementsTabs } from "@/components/admin/admin-requirements-tabs";
import {
  getAdminSupplierRequirementsPageData,
} from "@/app/admin/dashboard/actions";

function RequirementsPageFallback() {
  return <div>Loading supplier requirements...</div>;
}

async function RequirementsPageContent() {
  const data = await getAdminSupplierRequirementsPageData();

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Supplier Requirements
            </h1>
          </div>
        </div>
      </section>

      <AdminRequirementsTabs data={data} />
    </main>
  );
}

export default function AdminRequirementsPage() {
  return (
    <Suspense fallback={<RequirementsPageFallback />}>
      <RequirementsPageContent />
    </Suspense>
  );
}
