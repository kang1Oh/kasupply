import { Suspense } from "react";
import { getSupplierDashboardData, openMatchedRfq } from "./actions";

function DashboardPageFallback() {
  return <div>Loading supplier dashboard...</div>;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
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

function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="text-sm text-gray-600">
      {complete ? "✅" : "⬜"} {label}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

async function DashboardPageContent() {
  const data = await getSupplierDashboardData();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supplier Dashboard</h1>
        <p className="text-gray-600">Welcome, {data.supplierName}</p>
      </div>

      {data.verificationStatus !== "verified" && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-700">
          Your supplier verification status is currently{" "}
          <span className="font-semibold">{data.verificationStatus}</span>.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Inventory Items"
          value={data.stats.inventoryItems}
          subtitle="Products in your supplier catalog"
        />
        <StatCard
          title="Incoming RFQs"
          value={data.stats.incomingRfqs}
          subtitle="Active supplier engagements"
        />
        <StatCard
          title="Sourcing Matches"
          value={data.stats.matchedBoardPosts}
          subtitle="Visible sourcing board matches"
        />
        <StatCard
          title="Active Orders"
          value={data.stats.activeOrders}
          subtitle="Orders still in progress"
        />
        <StatCard
          title="Pending Invoices"
          value={data.stats.pendingInvoices}
          subtitle="Invoices awaiting payment"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Verification Progress</h2>

          <div className="mt-3 space-y-2">
            <ChecklistItem
              label="Business profile completed"
              complete={data.onboarding.hasBusinessProfile}
            />
            <ChecklistItem
              label="Required supplier documents uploaded"
              complete={data.onboarding.hasSubmittedRequiredSupplierDocuments}
            />
            <ChecklistItem
              label="Site showcase images uploaded"
              complete={data.onboarding.hasSubmittedSiteImages}
            />

            <div className="pt-2 text-sm text-gray-600">
              <span className="font-medium">Current status:</span>{" "}
              {data.verificationStatus}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">Matched Sourcing Board Opportunities</h2>
            <p className="mt-1 text-sm text-gray-500">
              Click anywhere on a card to open it in your supplier RFQ workspace.
            </p>
          </div>

          {data.bulletinBoardItems.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-gray-500">
              No matched sourcing board opportunities yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {data.bulletinBoardItems.map((item) => (
                <form action={openMatchedRfq} key={item.matchId}>
                  <input type="hidden" name="match_id" value={item.matchId} />
                  <input type="hidden" name="rfq_id" value={item.rfqId} />
                  <button
                    type="submit"
                    className="block w-full rounded-lg border p-4 text-left transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {item.status}
                        </span>
                        {item.matchScore !== null ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                            Match Score: {item.matchScore}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-gray-600">{item.description}</p>

                      {item.matchReason ? (
                        <p className="text-xs text-gray-500">
                          Match reason: {item.matchReason}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Quantity: {item.quantityLabel}</span>
                        <span>Deadline: {formatDate(item.deadline)}</span>
                        <span>Posted: {formatDate(item.createdAt)}</span>
                        <span>Notified: {formatDate(item.notifiedAt)}</span>
                      </div>
                    </div>
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SupplierDashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
