"use client";

import { useMemo, useState } from "react";

export const LEAD_TIME_OPTIONS = [
  "1 day",
  "2 days",
  "3 days",
  "5 days",
  "7 days",
  "14 days",
  "30 days",
] as const;

type LeadTimeFieldProps = {
  defaultValue?: string | null;
};

export function normalizeLeadTime(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function LeadTimeField({ defaultValue = "" }: LeadTimeFieldProps) {
  const normalizedDefaultValue = normalizeLeadTime(defaultValue);
  const matchedOption =
    LEAD_TIME_OPTIONS.find(
      (option) => normalizeLeadTime(option) === normalizedDefaultValue,
    ) ?? null;

  const [selectedOption, setSelectedOption] = useState<string>(
    matchedOption ?? (normalizedDefaultValue ? "Other" : ""),
  );
  const [customLeadTime, setCustomLeadTime] = useState<string>(
    matchedOption ? "" : String(defaultValue ?? ""),
  );

  const submittedLeadTime = useMemo(() => {
    if (selectedOption === "Other") {
      return customLeadTime.trim();
    }

    return selectedOption;
  }, [customLeadTime, selectedOption]);

  return (
    <div className="space-y-3">
      <input type="hidden" name="lead_time" value={submittedLeadTime} />

      <div className="relative">
        <select
          value={selectedOption}
          onChange={(event) => setSelectedOption(event.target.value)}
          required
          className="h-[34px] w-full appearance-none rounded-[8px] border border-[#C9D3E0] bg-white px-3 pr-10 text-[12px] text-[#344054] outline-none"
        >
          <option value="" disabled>
            Select lead time
          </option>
          {LEAD_TIME_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#98A2B3]">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {selectedOption === "Other" ? (
        <input
          type="text"
          value={customLeadTime}
          onChange={(event) => setCustomLeadTime(event.target.value)}
          required
          className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
          placeholder="Enter custom lead time"
        />
      ) : null}
    </div>
  );
}
