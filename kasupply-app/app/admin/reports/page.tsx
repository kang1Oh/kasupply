import { Suspense } from "react";
import Link from "next/link";
import { getAdminReportsPageData } from "@/app/admin/dashboard/actions";
import {
  DashboardCard,
  formatDate,
  getStatusPillClasses,
  toTitleCase,
} from "@/components/admin/admin-view-helpers";
import { AdminReportReviewForm } from "@/components/admin/admin-report-review-form";

type ReportsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

function ReportsPageFallback() {
  return <div>Loading reported accounts...</div>;
}

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function buildReportsHref({
  query,
  status,
  page,
}: {
  query: string;
  status: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (status && status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const suffix = params.toString();
  return suffix ? `/admin/reports?${suffix}` : "/admin/reports";
}

async function ReportsPageContent({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = readSearchParam(resolvedSearchParams.q).trim();
  const status = readSearchParam(resolvedSearchParams.status).trim().toLowerCase();
  const page = Number(readSearchParam(resolvedSearchParams.page));
  const data = await getAdminReportsPageData({ query, status, page });

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Report Review
            </h1>
          </div>

          <Link
            href="/admin/dashboard"
            className="inline-flex rounded-lg border border-[#223654] px-4 py-2.5 text-sm font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardCard
          title="All Reports"
          value={data.summary.totalReports}
          subtitle="Reported user cases currently stored."
        />
        <DashboardCard
          title="Open Reports"
          value={data.summary.openReports}
          subtitle="Reports still awaiting admin resolution."
        />
        <DashboardCard
          title="Under Review"
          value={data.summary.underReviewReports}
          subtitle="Cases actively being reviewed by admin."
        />
        <DashboardCard
          title="Resolved"
          value={data.summary.resolvedReports}
          subtitle="Reports already actioned, dismissed, or closed."
        />
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Reported Accounts</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Search by reported user, reporter, or report details to review cases and take action.
        </p>

        <form
          method="get"
          className="mt-5 grid gap-3 rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
        >
          <input
            type="text"
            name="q"
            defaultValue={data.filters.query}
            placeholder="Search reported account, reporter, business, or issue"
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          />
          <select
            name="status"
            defaultValue={data.filters.status}
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          >
            <option value="all">All report statuses</option>
            <option value="open">Open</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="action_taken">Action Taken</option>
            <option value="dismissed">Dismissed</option>
            <option value="closed">Closed</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
          >
            Apply filters
          </button>
          <Link
            href="/admin/reports"
            className="inline-flex items-center justify-center rounded-lg border border-[#d6deea] px-4 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-white"
          >
            Reset
          </Link>
        </form>

        <p className="mt-4 text-sm text-[#6b7280]">
          {data.pagination.totalItems === 0
            ? "No reported accounts match the current filters."
            : `Showing ${data.pagination.startIndex}-${data.pagination.endIndex} of ${data.pagination.totalItems} reports.`}
        </p>

        <div className="mt-4 space-y-4">
          {data.reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7e0eb] bg-[#fbfcfe] p-6 text-sm text-[#6b7280]">
              No reported accounts match this search yet.
            </div>
          ) : (
            data.reports.map((report) => (
              <article
                key={report.reportId}
                className="rounded-[20px] border border-[#e8eef6] bg-[#fbfcfe] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-[#223654]">
                        Report #{report.reportId}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                          report.status
                        )}`}
                      >
                        {toTitleCase(report.status)}
                      </span>
                      <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-1 text-xs text-[#475569]">
                        Priority: {toTitleCase(report.priority)}
                      </span>
                      <span className="rounded-full border border-[#dbe2ea] bg-white px-2 py-1 text-xs text-[#475569]">
                        Reason: {toTitleCase(report.reasonCode)}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#edf2f7] bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                          Reported account
                        </p>
                        <p className="mt-2 font-medium text-[#223654]">
                          {report.reportedUser?.displayName ?? "Unknown account"}
                        </p>
                        <p className="text-sm text-[#6b7280]">
                          {report.reportedUser?.email ?? "No email"}
                        </p>
                        <p className="mt-1 text-sm text-[#6b7280]">
                          {report.reportedUser?.role
                            ? `${toTitleCase(report.reportedUser.role)}`
                            : "Unknown role"}
                          {report.reportedUser?.businessName
                            ? ` | ${report.reportedUser.businessName}`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-[#8b95a5]">
                          Account status:{" "}
                          <span className="font-medium text-[#475569]">
                            {toTitleCase(report.reportedUser?.accountStatus ?? "unknown")}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#edf2f7] bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Reporter</p>
                        <p className="mt-2 font-medium text-[#223654]">
                          {report.reporter?.displayName ?? "Anonymous or deleted user"}
                        </p>
                        <p className="text-sm text-[#6b7280]">
                          {report.reporter?.email ?? "No email"}
                        </p>
                        <p className="mt-2 text-xs text-[#8b95a5]">
                          Filed {formatDate(report.createdAt)}
                        </p>
                        {report.assignedAdminName ? (
                          <p className="mt-1 text-xs text-[#8b95a5]">
                            Assigned admin: {report.assignedAdminName}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#edf2f7] bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                        Report details
                      </p>
                      <p className="mt-2 text-sm text-[#475569]">
                        {report.description ?? "No additional description provided."}
                      </p>
                      {report.adminResolution ? (
                        <p className="mt-3 text-sm text-[#334155]">
                          <span className="font-medium">Latest admin resolution:</span>{" "}
                          {report.adminResolution}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-[#edf2f7] bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                          Report activity
                        </p>
                        <div className="mt-3 space-y-3">
                          {report.messages.length === 0 ? (
                            <p className="text-sm text-[#8b95a5]">
                              No admin or system updates have been saved yet.
                            </p>
                          ) : (
                            report.messages.map((message) => (
                              <div
                                key={message.messageId}
                                className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8b95a5]">
                                  <span className="font-medium text-[#475569]">
                                    {message.senderName}
                                  </span>
                                  <span>{toTitleCase(message.senderType)}</span>
                                  <span>{formatDate(message.createdAt)}</span>
                                </div>
                                <p className="mt-2 text-sm text-[#475569]">
                                  {message.messageBody}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#edf2f7] bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8b95a5]">
                          Enforcement history
                        </p>
                        <div className="mt-3 space-y-3">
                          {report.enforcementHistory.length === 0 ? (
                            <p className="text-sm text-[#8b95a5]">
                              No enforcement actions have been recorded for this report yet.
                            </p>
                          ) : (
                            report.enforcementHistory.map((item) => (
                              <div
                                key={item.enforcementId}
                                className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusPillClasses(
                                      item.actionType
                                    )}`}
                                  >
                                    {toTitleCase(item.actionType)}
                                  </span>
                                  <span className="text-xs text-[#8b95a5]">
                                    {formatDate(item.createdAt)}
                                  </span>
                                  {item.isActive ? (
                                    <span className="text-xs font-medium text-[#15803d]">
                                      Active
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm text-[#475569]">{item.reason}</p>
                                {item.adminName ? (
                                  <p className="mt-1 text-xs text-[#8b95a5]">
                                    Logged by {item.adminName}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full xl:max-w-[420px]">
                    <div className="rounded-2xl border border-[#e6edf6] bg-white p-4">
                      <h3 className="text-sm font-semibold text-[#223654]">Review this report</h3>
                      <p className="mt-1 text-xs text-[#8b95a5]">
                        Capture the admin response here and apply any needed account action.
                      </p>
                      <div className="mt-4">
                        <AdminReportReviewForm
                          reportId={report.reportId}
                          currentReportStatus={report.status}
                          currentAccountStatus={report.reportedUser?.accountStatus ?? "active"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[#edf2f7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#8b95a5]">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {data.pagination.hasPreviousPage ? (
              <Link
                href={buildReportsHref({
                  query: data.filters.query,
                  status: data.filters.status,
                  page: data.pagination.page - 1,
                })}
                className="rounded-lg border border-[#d6deea] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-4 py-2 text-sm font-semibold text-[#94a3b8]">
                Previous
              </span>
            )}
            {data.pagination.hasNextPage ? (
              <Link
                href={buildReportsHref({
                  query: data.filters.query,
                  status: data.filters.status,
                  page: data.pagination.page + 1,
                })}
                className="rounded-lg border border-[#223654] px-4 py-2 text-sm font-semibold text-[#223654] transition hover:bg-[#f8fafc]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-4 py-2 text-sm font-semibold text-[#94a3b8]">
                Next
              </span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminReportsPage(props: ReportsPageProps) {
  return (
    <Suspense fallback={<ReportsPageFallback />}>
      <ReportsPageContent {...props} />
    </Suspense>
  );
}
