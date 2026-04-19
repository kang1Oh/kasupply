import { Suspense } from "react";
import Link from "next/link";
import { getAdminAccountsPageData } from "@/app/admin/dashboard/actions";
import { DashboardCard, getStatusPillClasses, toTitleCase } from "@/components/admin/admin-view-helpers";
import { AdminAccountStatusForm } from "@/components/admin/admin-account-status-form";

type AccountsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

function AccountsPageFallback() {
  return <div>Loading account monitoring...</div>;
}

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function buildAccountsHref({
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
  return suffix ? `/admin/accounts?${suffix}` : "/admin/accounts";
}

async function AccountsPageContent({ searchParams }: AccountsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = readSearchParam(resolvedSearchParams.q).trim();
  const status = readSearchParam(resolvedSearchParams.status).trim().toLowerCase();
  const page = Number(readSearchParam(resolvedSearchParams.page));
  const data = await getAdminAccountsPageData({ query, status, page });

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Account Monitoring
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

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Accounts"
          value={data.summary.totalAccounts}
          subtitle="Total buyer, supplier, and admin accounts."
        />
        <DashboardCard
          title="Flagged Accounts"
          value={data.summary.flaggedAccounts}
          subtitle="Accounts with moderation or verification review concerns."
        />
        <DashboardCard
          title="Matching Results"
          value={data.pagination.totalItems}
          subtitle="Accounts matching your current filters."
        />
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Accounts</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Apply account status changes here. For production, this separation helps keep sensitive
          user actions away from the main dashboard.
        </p>

        <form
          method="get"
          className="mt-5 grid gap-3 rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
        >
          <input
            type="text"
            name="q"
            defaultValue={data.filters.query}
            placeholder="Search name, email, business, or role"
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          />
          <select
            name="status"
            defaultValue={data.filters.status}
            className="rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="warned">Warned</option>
            <option value="restricted">Restricted</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
          >
            Apply filters
          </button>
          <Link
            href="/admin/accounts"
            className="inline-flex items-center justify-center rounded-lg border border-[#d6deea] px-4 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-white"
          >
            Reset
          </Link>
        </form>

        <p className="mt-4 text-sm text-[#6b7280]">
          {data.pagination.totalItems === 0
            ? "No accounts match the current filters."
            : `Showing ${data.pagination.startIndex}-${data.pagination.endIndex} of ${data.pagination.totalItems} accounts.`}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#7b8797]">
              <tr className="border-b border-[#edf1f6]">
                <th className="px-3 py-3 font-medium">Account</th>
                <th className="px-3 py-3 font-medium">Business</th>
                <th className="px-3 py-3 font-medium">Verification</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-[#6b7280]">
                    No accounts match this search yet.
                  </td>
                </tr>
              ) : (
                data.accounts.map((account) => (
                  <tr key={account.userId} className="border-b border-[#f3f6fb] align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#223654]">{account.displayName}</p>
                      <p className="text-xs text-[#6b7280]">{account.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#dbe2ea] bg-[#f8fafc] px-2 py-0.5 text-xs text-[#475569]">
                          {toTitleCase(account.role)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${getStatusPillClasses(
                            account.accountStatus
                          )}`}
                        >
                          {toTitleCase(account.accountStatus)}
                        </span>
                        {account.hasVerifiedBadge ? (
                          <span className="rounded-full border border-[#b7e4c7] bg-[#ecfdf3] px-2 py-0.5 text-xs text-[#15803d]">
                            Verified Badge
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#334155]">
                        {account.businessName ?? "No business profile"}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {account.locationLabel ?? "No location information"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                          account.verificationLabel
                        )}`}
                      >
                        {toTitleCase(account.verificationLabel ?? "not_started")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-3">
                        {account.openReportsCount > 0 ? (
                          <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#b45309]">
                              Open reports
                            </p>
                            <p className="mt-1 text-sm text-[#92400e]">
                              {account.openReportsCount} active report
                              {account.openReportsCount === 1 ? "" : "s"} linked to this account.
                            </p>
                            <Link
                              href={`/admin/reports?q=${encodeURIComponent(account.email)}`}
                              className="mt-2 inline-flex text-xs font-semibold text-[#92400e] transition hover:text-[#78350f]"
                            >
                              Review reports
                            </Link>
                          </div>
                        ) : null}

                        <AdminAccountStatusForm
                          userId={account.userId}
                          currentStatus={account.accountStatus}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[#edf2f7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#8b95a5]">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {data.pagination.hasPreviousPage ? (
              <Link
                href={buildAccountsHref({
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
                href={buildAccountsHref({
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

export default function AdminAccountsPage(props: AccountsPageProps) {
  return (
    <Suspense fallback={<AccountsPageFallback />}>
      <AccountsPageContent {...props} />
    </Suspense>
  );
}
