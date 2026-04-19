"use client";

import { useState } from "react";
import { reviewModerationReportAction } from "@/app/admin/dashboard/actions";

export function AdminReportReviewForm({
  reportId,
  currentReportStatus,
  currentAccountStatus,
}: {
  reportId: number;
  currentReportStatus: string;
  currentAccountStatus: string;
}) {
  const [nextAccountStatus, setNextAccountStatus] = useState("no_change");
  const requiresReason = nextAccountStatus !== "no_change";

  return (
    <form action={reviewModerationReportAction} className="space-y-3">
      <input type="hidden" name="report_id" value={reportId} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-[#64748b]">
          <span>Report outcome</span>
          <select
            name="next_report_status"
            defaultValue={currentReportStatus}
            className="w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          >
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="action_taken">Action Taken</option>
            <option value="dismissed">Dismissed</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-[#64748b]">
          <span>Account action</span>
          <select
            name="next_account_status"
            value={nextAccountStatus}
            onChange={(event) => setNextAccountStatus(event.target.value)}
            className="w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
          >
            <option value="no_change">No account change</option>
            <option value="active">Restore to Active</option>
            <option value="warned">Warn</option>
            <option value="restricted">Restrict</option>
            <option value="suspended">Suspend</option>
            <option value="banned">Ban</option>
          </select>
        </label>
      </div>

      <p className="text-[11px] text-[#94a3b8]">
        Current account status: <span className="font-medium">{currentAccountStatus}</span>. The
        current login flow blocks restricted, suspended, and banned accounts from signing in.
      </p>

      <label className="block space-y-1 text-xs font-medium text-[#64748b]">
        <span>Reason {requiresReason ? "(required for account action)" : "(optional)"}</span>
        <textarea
          name="reason"
          required={requiresReason}
          rows={3}
          placeholder="Summarize why this report was actioned, dismissed, or escalated."
          className="w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
        />
      </label>

      <label className="block space-y-1 text-xs font-medium text-[#64748b]">
        <span>Admin response</span>
        <textarea
          name="response"
          rows={3}
          placeholder="Optional response or update to store with this report."
          className="w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm text-[#334155]"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
      >
        Save report review
      </button>
    </form>
  );
}
