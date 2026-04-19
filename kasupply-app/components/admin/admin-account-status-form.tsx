"use client";

import { useState } from "react";
import { updateAccountModerationStatus } from "@/app/admin/dashboard/actions";

export function AdminAccountStatusForm({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [nextStatus, setNextStatus] = useState(currentStatus.toLowerCase());
  const requiresReason = nextStatus === "suspended" || nextStatus === "banned";

  return (
    <form action={updateAccountModerationStatus} className="flex flex-col gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex gap-2">
        <select
          name="next_status"
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value)}
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
        required={requiresReason}
        placeholder={requiresReason ? "Reason required for suspend or ban" : "Optional reason"}
        className="rounded-md border border-[#d6deea] bg-white px-3 py-2 text-xs text-[#334155]"
      />
      <p className="text-[11px] text-[#8b95a5]">Reason is required for suspend and ban actions.</p>
    </form>
  );
}
