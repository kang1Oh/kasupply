import { Suspense } from "react";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function DashboardPageFallback() {
  return <div>Loading dashboard...</div>;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold">{value}</h3>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

async function DashboardPageContent() {
  const status = await getUserOnboardingStatus();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome, {status.appUser?.name}</p>
      </div>

      {status.role === "supplier" && !status.isSupplierVerified && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-700">
          Your supplier account is pending verification.
        </div>
      )}

      {status.role === "supplier" && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard title="Inventory Items" value="0" subtitle="Published products" />
            <StatCard title="Incoming RFQs" value="0" subtitle="Buyer requests" />
            <StatCard title="Active Orders" value="0" subtitle="Orders in progress" />
            <StatCard title="Pending Invoices" value="0" subtitle="Awaiting payment" />
            <StatCard title="Unread Messages" value="0" subtitle="Buyer conversations" />
            <StatCard title="Matched Board Posts" value="0" subtitle="Buyer sourcing requests" />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Next Actions</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>Add your first inventory listing</li>
                <li>Review matched sourcing requests on the bulletin board</li>
                <li>Respond quickly to new RFQs</li>
                <li>Keep your business profile updated</li>
              </ul>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Verification Status</h2>
              <p className="mt-3 text-sm text-gray-600">
                Business documents uploaded. Admin review is in progress.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}