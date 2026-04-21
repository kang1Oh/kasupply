"use client";

import { useMemo, useState } from "react";
import { LEAD_TIME_OPTIONS, normalizeLeadTime } from "@/app/supplier/inventory/lead-time-field";

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "Not set";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("PHP", "₱");
}

type SupplierQuotationFormProps = {
  engagementId: number;
  returnTo: string;
  quantity: number | null;
  validUntil: string;
  rfqDeadline: string;
  defaultPricePerUnit: number | null;
  defaultLeadTime: string;
  defaultMoq: number | null;
  defaultNotes: string;
  submitAction: (formData: FormData) => Promise<void>;
};

export function SupplierQuotationForm({
  engagementId,
  returnTo,
  quantity,
  validUntil,
  rfqDeadline,
  defaultPricePerUnit,
  defaultLeadTime,
  defaultMoq,
  defaultNotes,
  submitAction,
}: SupplierQuotationFormProps) {
  const [pricePerUnit, setPricePerUnit] = useState(
    defaultPricePerUnit != null ? String(defaultPricePerUnit) : "",
  );
  const normalizedDefaultLeadTime = normalizeLeadTime(defaultLeadTime);
  const matchedLeadTimeOption =
    LEAD_TIME_OPTIONS.find(
      (option) => normalizeLeadTime(option) === normalizedDefaultLeadTime,
    ) ?? null;
  const [selectedLeadTime, setSelectedLeadTime] = useState<string>(
    matchedLeadTimeOption ?? (normalizedDefaultLeadTime ? "Other" : ""),
  );
  const [customLeadTime, setCustomLeadTime] = useState<string>(
    matchedLeadTimeOption ? "" : defaultLeadTime,
  );

  const totalAmount = useMemo(() => {
    const parsed = Number(pricePerUnit);
    if (!Number.isFinite(parsed) || quantity == null) return null;
    return parsed * quantity;
  }, [pricePerUnit, quantity]);

  const submittedLeadTime = useMemo(() => {
    if (selectedLeadTime === "Other") {
      return customLeadTime.trim();
    }

    return selectedLeadTime;
  }, [customLeadTime, selectedLeadTime]);

  return (
    <form id="quotation-form" action={submitAction} className="space-y-[14px]">
      <input type="hidden" name="engagement_id" value={engagementId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="quantity" value={String(quantity ?? "")} />
      <input type="hidden" name="valid_until" value={validUntil} />
      <input type="hidden" name="rfq_deadline" value={rfqDeadline} />

      <div className="grid gap-[14px] md:grid-cols-2">
        <label className="block">
          <span className="mb-[6px] block text-[14px] font-medium text-[#5E6A7D]">
            Quoted price (per unit) <span className="text-[#F04E4E]">*</span>
          </span>
          <input
            name="price_per_unit"
            type="number"
            step="0.01"
            min="0"
            required
            value={pricePerUnit}
            onChange={(event) => setPricePerUnit(event.target.value)}
            placeholder="e.g. ₱19"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[14px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
          />
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[14px] font-medium text-[#5E6A7D]">
            Total amount
          </span>
          <input
            type="text"
            readOnly
            value={formatCurrency(totalAmount)}
            placeholder="Auto-calculated"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-[#FAFBFD] px-[14px] text-[14px] text-[#9AA5B6] outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[14px] font-medium text-[#5E6A7D]">
            Lead time <span className="text-[#F04E4E]">*</span>
          </span>
          <input type="hidden" name="lead_time" value={submittedLeadTime} />
          <div className="relative">
            <select
              value={selectedLeadTime}
              onChange={(event) => setSelectedLeadTime(event.target.value)}
              required
              className="h-[44px] w-full appearance-none rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] pr-[42px] text-[14px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
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

            <span className="pointer-events-none absolute inset-y-0 right-[14px] flex items-center text-[#98A2B3]">
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

          {selectedLeadTime === "Other" ? (
            <input
              type="text"
              value={customLeadTime}
              onChange={(event) => setCustomLeadTime(event.target.value)}
              required
              placeholder="Enter custom lead time"
              className="mt-[8px] h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[14px] text-[#223654] outline-none transition placeholder:text-[#9AA5B6] focus:border-[#AFC0DA]"
            />
          ) : null}
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[14px] font-medium text-[#5E6A7D]">
            Minimum Order Quantity <span className="text-[#F04E4E]">*</span>
          </span>
          <input
            name="moq"
            type="number"
            min="0"
            required
            defaultValue={defaultMoq ?? ""}
            placeholder="e.g. 100 kg"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[14px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-[6px] block text-[14px] font-medium text-[#5E6A7D]">
          Note to buyer <span className="text-[#C6CBD4]">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultNotes}
          placeholder="Any important details about your products, delivery, or terms..."
          className="w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] py-[12px] text-[14px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
        />
      </label>

      <button
        type="submit"
        className="sr-only"
      >
        Submit quotation
      </button>
    </form>
  );
}
