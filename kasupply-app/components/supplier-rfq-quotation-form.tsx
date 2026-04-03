"use client";

import { useMemo, useState } from "react";

type SupplierRfqQuotationFormProps = {
  action: (formData: FormData) => void;
  engagementId: number;
  returnTo: string;
  rfqDeadline: string | null;
  defaultQuantity: number;
  unit: string | null;
  defaultPricePerUnit?: number | null;
  defaultLeadTime?: string | null;
  defaultMoq?: number | null;
  defaultNotes?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function SupplierRfqQuotationForm({
  action,
  engagementId,
  returnTo,
  rfqDeadline,
  defaultQuantity,
  unit,
  defaultPricePerUnit,
  defaultLeadTime,
  defaultMoq,
  defaultNotes,
}: SupplierRfqQuotationFormProps) {
  const [quotedPrice, setQuotedPrice] = useState(
    defaultPricePerUnit != null ? String(defaultPricePerUnit) : "",
  );

  const totalAmount = useMemo(() => {
    const parsed = Number(quotedPrice);
    if (Number.isNaN(parsed) || parsed < 0) return "Auto-calculated";
    return formatCurrency(parsed * defaultQuantity);
  }, [defaultQuantity, quotedPrice]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="engagement_id" value={engagementId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="quantity" value={defaultQuantity} />
      <input type="hidden" name="rfq_deadline" value={rfqDeadline ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#344054]">
            Quoted price (per unit) <span className="text-[#F04438]">*</span>
          </label>
          <input
            name="price_per_unit"
            type="number"
            step="0.01"
            min="0"
            required
            value={quotedPrice}
            onChange={(event) => setQuotedPrice(event.target.value)}
            placeholder={`e.g. ${unit ? `₱19/${unit}` : "₱19"}`}
            className="h-[40px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[13px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#344054]">
            Total amount
          </label>
          <input
            type="text"
            value={totalAmount}
            readOnly
            className="h-[40px] w-full rounded-[8px] border border-[#C9D3E0] bg-[#F9FAFB] px-3 text-[13px] text-[#98A2B3] outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#344054]">
            Lead time <span className="text-[#F04438]">*</span>
          </label>
          <input
            name="lead_time"
            type="text"
            required
            defaultValue={defaultLeadTime ?? ""}
            placeholder="e.g. 1 business day"
            className="h-[40px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[13px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#344054]">
            Minimum Order Quantity <span className="text-[#F04438]">*</span>
          </label>
          <input
            name="moq"
            type="number"
            min="0"
            required
            defaultValue={defaultMoq ?? ""}
            placeholder={`e.g. 100 ${unit ?? "kg"}`}
            className="h-[40px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[13px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-[#344054]">
          Note to buyer <span className="text-[#D0D5DD]">(optional)</span>
        </label>
        <textarea
          name="notes"
          rows={5}
          defaultValue={defaultNotes ?? ""}
          placeholder="Any important details about your products, delivery, or terms..."
          className="w-full rounded-[8px] border border-[#C9D3E0] px-3 py-2.5 text-[13px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
        />
      </div>
    </form>
  );
}
