import { Suspense } from "react";
import Link from "next/link";
import {
  getAdminDashboardData,
  reprocessOutstandingVerificationQueueAction,
  retryProfileVerificationAction,
  retryVerificationRunAction,
  toggleListingModeration,
  updateAccountModerationStatus,
} from "./actions";

function DashboardCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5ebf4] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-sm text-[#8b95a5]">{title}</p>
      <h2 className="mt-2 text-3xl font-semibold text-[#223654]">{value}</h2>
      <p className="mt-2 text-sm text-[#6b7280]">{subtitle}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function toTitleCase(value: string | null | undefined) {
  const safeValue = String(value ?? "").trim();
  if (!safeValue) return "Unknown";

  return safeValue
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function getStatusPillClasses(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "approved" || normalized === "active" || normalized === "published") {
    return "border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d]";
  }

  if (normalized === "review_required" || normalized === "warned") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#b45309]";
  }

  if (normalized === "restricted" || normalized === "suspended" || normalized === "failed") {
    return "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]";
  }

  if (normalized === "banned" || normalized === "rejected") {
    return "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
  }

  if (normalized === "queued" || normalized === "processing" || normalized === "submitted") {
    return "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]";
  }

  return "border-[#dbe2ea] bg-[#f8fafc] text-[#475569]";
}

function DashboardPageFallback() {
  return <div>Loading admin dashboard...</div>;
}

async function DashboardPageContent() {
  const data = await getAdminDashboardData();

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
            <p className="mt-2 max-w-3xl text-sm text-[#6b7280]">
              Monitor buyer and supplier accounts, reprocess verification runs,
              and enforce moderation actions across the marketplace.
            </p>
          </div>

          <form action={reprocessOutstandingVerificationQueueAction} className="flex items-center gap-3">
            <input type="hidden" name="limit" value="25" />
            <button
              type="submit"
              className="rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
            >
              Reprocess Outstanding Queue
            </button>
          </form>
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
          title="Published Listings"
          value={data.summary.publishedListings}
          subtitle="Listings that are currently visible to marketplace buyers."
        />
        <DashboardCard
          title="Verification Queue"
          value={data.summary.verificationQueueCount}
          subtitle="Queued, failed, processing, and review-required verification runs."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Account Monitoring</h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Review user status, business identity, and verification posture.
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
                {data.accounts.map((account) => (
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
                      <div className="space-y-2">
                        <form action={updateAccountModerationStatus} className="flex flex-col gap-2">
                          <input type="hidden" name="user_id" value={account.userId} />
                          <div className="flex gap-2">
                            <select
                              name="next_status"
                              defaultValue={account.accountStatus.toLowerCase()}
                              className="rounded-md border border-[#d6deea] bg-white px-3 py-2 text-xs text-[#334155]"
                            >
                              <option value="active">Active</option>
                              <option value="warned">Warn</option>
                              <option value="restricted">Restrict</option>
                              <option value="suspended">Suspend</option>
                              <option value="banned">Ban</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-md border border-[#223654] px-3 py-2 text-xs font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
                            >
                              Apply
                            </button>
                          </div>
                          <input
                            type="text"
                            name="reason"
                            placeholder="Optional reason"
                            className="rounded-md border border-[#d6deea] bg-white px-3 py-2 text-xs text-[#334155]"
                          />
                        </form>

                        {account.profileId ? (
                          <form action={retryProfileVerificationAction}>
                            <input type="hidden" name="profile_id" value={account.profileId} />
                            <button
                              type="submit"
                              className="rounded-md bg-[#eef4ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
                            >
                              Reprocess Profile Verification
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Recent Admin Actions</h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            Audit trail for moderation and verification interventions.
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
        <h2 className="text-lg font-semibold text-[#223654]">Verification Reprocessing</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Retry automated verification runs without manually reviewing onboarding submissions.
        </p>

        <div className="mt-4 overflow-x-auto">
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
              {data.verificationRuns.map((run) => (
                <tr key={run.runId} className="border-b border-[#f3f6fb] align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#223654]">{toTitleCase(run.kind)}</p>
                    <p className="text-xs text-[#6b7280]">Run #{run.runId}</p>
                    <p className="mt-1 text-xs text-[#8b95a5]">
                      Created {formatDate(run.createdAt)}
                    </p>
                    <Link
                      href={`/admin/verification/${run.runId}`}
                      className="mt-2 inline-flex text-xs font-semibold text-[#1d4ed8] transition hover:text-[#1e40af]"
                    >
                      View details
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#334155]">
                      {run.businessName ?? `Profile #${run.profileId}`}
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      {toTitleCase(run.targetType)} {run.targetId ? `#${run.targetId}` : ""}
                    </p>
                    {run.errorMessage ? (
                      <p className="mt-2 text-xs text-[#b91c1c]">{run.errorMessage}</p>
                    ) : null}
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
                    {run.completedAt ? (
                      <p className="mt-1 text-xs text-[#8b95a5]">
                        Completed {formatDate(run.completedAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <form action={retryVerificationRunAction}>
                        <input type="hidden" name="run_id" value={run.runId} />
                        <button
                          type="submit"
                          className="rounded-md border border-[#223654] px-3 py-2 text-xs font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
                        >
                          Retry This Run
                        </button>
                      </form>
                      <form action={retryProfileVerificationAction}>
                        <input type="hidden" name="profile_id" value={run.profileId} />
                        <button
                          type="submit"
                          className="rounded-md bg-[#eef4ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
                        >
                          Retry Latest For Profile
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Content Moderation</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Unpublish or restore supplier listings when products are flagged or require intervention.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#7b8797]">
              <tr className="border-b border-[#edf1f6]">
                <th className="px-3 py-3 font-medium">Listing</th>
                <th className="px-3 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.productListings.map((product) => (
                <tr key={product.productId} className="border-b border-[#f3f6fb] align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#223654]">{product.productName}</p>
                    <p className="text-xs text-[#6b7280]">Product #{product.productId}</p>
                    <p className="mt-1 text-xs text-[#8b95a5]">
                      Updated {formatDate(product.updatedAt)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#334155]">{product.supplierName}</p>
                    <p className="text-xs text-[#6b7280]">
                      Stock: {product.stockAvailable ?? "N/A"} | Price:{" "}
                      {product.pricePerUnit ?? "N/A"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                        product.isPublished ? "published" : "draft"
                      )}`}
                    >
                      {product.isPublished ? "Published" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <form action={toggleListingModeration} className="flex flex-col gap-2">
                      <input type="hidden" name="product_id" value={product.productId} />
                      <input
                        type="hidden"
                        name="next_published"
                        value={product.isPublished ? "false" : "true"}
                      />
                      <input
                        type="text"
                        name="reason"
                        placeholder="Optional reason"
                        className="rounded-md border border-[#d6deea] bg-white px-3 py-2 text-xs text-[#334155]"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-[#223654] px-3 py-2 text-xs font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
                      >
                        {product.isPublished ? "Remove Listing" : "Restore Listing"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
