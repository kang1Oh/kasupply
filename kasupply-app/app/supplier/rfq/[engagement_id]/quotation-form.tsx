"use client";

import { useMemo, useState } from "react";

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

  const totalAmount = useMemo(() => {
    const parsed = Number(pricePerUnit);
    if (!Number.isFinite(parsed) || quantity == null) return null;
    return parsed * quantity;
  }, [pricePerUnit, quantity]);

  return (
    <form id="quotation-form" action={submitAction} className="space-y-[14px]">
      <input type="hidden" name="engagement_id" value={engagementId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="quantity" value={String(quantity ?? "")} />
      <input type="hidden" name="valid_until" value={validUntil} />
      <input type="hidden" name="rfq_deadline" value={rfqDeadline} />

      <div className="grid gap-[14px] md:grid-cols-2">
        <label className="block">
          <span className="mb-[6px] block text-[12px] font-medium text-[#5E6A7D]">
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
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[13px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
          />
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[12px] font-medium text-[#5E6A7D]">
            Total amount
          </span>
          <input
            type="text"
            readOnly
            value={formatCurrency(totalAmount)}
            placeholder="Auto-calculated"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-[#FAFBFD] px-[14px] text-[13px] text-[#9AA5B6] outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[12px] font-medium text-[#5E6A7D]">
            Lead time <span className="text-[#F04E4E]">*</span>
          </span>
          <input
            name="lead_time"
            type="text"
            required
            defaultValue={defaultLeadTime}
            placeholder="e.g. 3 business day"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[13px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
          />
        </label>

        <label className="block">
          <span className="mb-[6px] block text-[12px] font-medium text-[#5E6A7D]">
            Minimum Order Quantity <span className="text-[#F04E4E]">*</span>
          </span>
          <input
            name="moq"
            type="number"
            min="0"
            required
            defaultValue={defaultMoq ?? ""}
            placeholder="e.g. 100 kg"
            className="h-[44px] w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] text-[13px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-[6px] block text-[12px] font-medium text-[#5E6A7D]">
          Note to buyer <span className="text-[#C6CBD4]">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultNotes}
          placeholder="Any important details about your products, delivery, or terms..."
          className="w-full rounded-[10px] border border-[#D7E0EB] bg-white px-[14px] py-[12px] text-[13px] text-[#223654] outline-none transition focus:border-[#AFC0DA]"
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
