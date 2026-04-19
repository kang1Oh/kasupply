import { Suspense } from "react";
import Link from "next/link";
import { getAdminDashboardData, getAdminReportsPageData } from "./actions";
import {
  DashboardCard,
  formatDate,
  getStatusPillClasses,
  toTitleCase,
} from "@/components/admin/admin-view-helpers";

function DashboardPageFallback() {
  return <div>Loading admin dashboard...</div>;
}

async function DashboardPageContent() {
  const [data, reportsData] = await Promise.all([
    getAdminDashboardData(),
    getAdminReportsPageData({ status: "open", pageSize: 5 }),
  ]);
  const verificationPreview = data.verificationRuns.slice(0, 6);

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Platform Oversight Dashboard
            </h1>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Accounts"
          value={data.summary.totalAccounts}
          subtitle="Buyer, supplier, and admin accounts currently tracked."
        />
        <DashboardCard
          title="Flagged Accounts"
          value={data.summary.flaggedAccounts}
          subtitle="Accounts with moderation status or verification review flags."
        />
        <DashboardCard
          title="Open Reports"
          value={reportsData.summary.openReports}
          subtitle="Reported accounts still awaiting admin review."
        />
        <DashboardCard
          title="Published Listings"
          value={data.summary.publishedListings}
          subtitle="Live listings across the marketplace."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-lg font-semibold text-[#223654]">Reports Needing Review</h2>
            <p className="mt-1 text-sm text-[#8b95a5]">
              Start here when an admin needs to review reported accounts and decide whether an
              enforcement action is needed.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[#7b8797]">
                <tr className="border-b border-[#edf1f6]">
                  <th className="px-3 py-3 font-medium">Reported Account</th>
                  <th className="px-3 py-3 font-medium">Issue</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-[#6b7280]">
                      No open user reports are waiting for review.
                    </td>
                  </tr>
                ) : (
                  reportsData.reports.map((report) => (
                    <tr key={report.reportId} className="border-b border-[#f3f6fb] align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-[#223654]">
                          {report.reportedUser?.displayName ?? "Unknown account"}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {report.reportedUser?.email ?? "No email"}
                        </p>
                        {report.reportedUser?.businessName ? (
                          <p className="mt-1 text-xs text-[#8b95a5]">
                            {report.reportedUser.businessName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[#334155]">
                          {toTitleCase(report.reasonCode)}
                        </p>
                        <p className="text-xs text-[#6b7280]">Report #{report.reportId}</p>
                        <p className="mt-1 text-xs text-[#8b95a5]">
                          Filed {formatDate(report.createdAt)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                            report.status
                          )}`}
                        >
                          {toTitleCase(report.status)}
                        </span>
                        <p className="mt-2 text-xs text-[#8b95a5]">
                          Priority: {toTitleCase(report.priority)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/reports?q=${encodeURIComponent(
                            report.reportedUser?.email ?? String(report.reportId)
                          )}`}
                          className="inline-flex rounded-md border border-[#d6deea] px-3 py-2 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                        >
                          Review report
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href="/admin/reports"
              className="text-sm font-semibold text-[#1d4ed8] transition hover:text-[#1e40af]"
            >
              Open full report queue
            </Link>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Recent Admin Actions</h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Audit trail for moderation and oversight activity.
          </p>

          <div className="mt-4 space-y-3">
            {data.recentActions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7e0eb] bg-[#fbfcfe] p-4 text-sm text-[#6b7280]">
                No admin actions have been logged yet.
              </div>
            ) : (
              data.recentActions.map((item) => (
                <div
                  key={item.actionId}
                  className="rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#223654]">
                      {toTitleCase(item.actionType)}
                    </span>
                    <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-0.5 text-xs text-[#64748b]">
                      {toTitleCase(item.targetType)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#475569]">Target: {item.targetId}</p>
                  <p className="mt-1 text-xs text-[#8b95a5]">{formatDate(item.createdAt)}</p>
                  {item.reason ? (
                    <p className="mt-2 text-sm text-[#6b7280]">Reason: {item.reason}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#223654]">Platform Oversight</h2>
            <p className="mt-1 text-sm text-[#8b95a5]">
              Verification remains visible here as system-health context, but it no longer leads
              the dashboard.
            </p>
          </div>

          <Link
            href="/admin/requirements"
            className="inline-flex rounded-lg border border-[#223654] px-4 py-2 text-sm font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
          >
            Manage requirements
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4">
            <p className="text-sm text-[#8b95a5]">Verification Queue</p>
            <p className="mt-2 text-3xl font-semibold text-[#223654]">
              {data.summary.verificationQueueCount}
            </p>
            <p className="mt-2 text-sm text-[#6b7280]">
              Queued, failed, processing, and review-required runs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[#7b8797]">
                <tr className="border-b border-[#edf1f6]">
                  <th className="px-3 py-3 font-medium">Run</th>
                  <th className="px-3 py-3 font-medium">Target</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {verificationPreview.map((run) => (
                  <tr key={run.runId} className="border-b border-[#f3f6fb] align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#223654]">{toTitleCase(run.kind)}</p>
                      <p className="text-xs text-[#6b7280]">Run #{run.runId}</p>
                      <p className="mt-1 text-xs text-[#8b95a5]">
                        Created {formatDate(run.createdAt)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#334155]">
                        {run.businessName ?? `Profile #${run.profileId}`}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {toTitleCase(run.targetType)} {run.targetId ? `#${run.targetId}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                          run.status
                        )}`}
                      >
                        {toTitleCase(run.status)}
                      </span>
                      <p className="mt-2 text-xs text-[#8b95a5]">
                        Triggered by {toTitleCase(run.triggeredBy)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/verification/${run.runId}`}
                        className="inline-flex rounded-md border border-[#d6deea] px-3 py-2 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
