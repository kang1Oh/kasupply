"use client";

import { useState } from "react";
import { submitCounterOffer } from "@/app/buyer/(protected)/rfqs/[rfqId]/actions";

type BuyerCounterOfferFormProps = {
  rfqId: number;
  engagementId: number;
};

export function BuyerCounterOfferForm({
  rfqId,
  engagementId,
}: BuyerCounterOfferFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#edf1f7] bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
      >
        {open ? "Close Counter Offer" : "Counter Offer"}
      </button>

      {open ? (
        <form action={submitCounterOffer} className="mt-4 space-y-4">
          <input type="hidden" name="rfqId" value={rfqId} />
          <input type="hidden" name="engagementId" value={engagementId} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#223654]">
                Price per Unit
              </label>
              <input
                type="number"
                name="pricePerUnit"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#223654]">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#223654]">MOQ</label>
              <input
                type="number"
                name="moq"
                min="1"
                className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#223654]">Lead Time</label>
            <input
              type="text"
              name="leadTime"
              className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#223654]">Notes</label>
            <textarea
              name="notes"
              rows={4}
              className="w-full rounded-md border border-[#d7dee8] bg-white px-4 py-3 text-sm text-[#223654] outline-none transition focus:border-[#223654]"
              placeholder="Explain your proposed terms"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-[#243f68] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3658]"
          >
            Submit Counter Offer
          </button>
        </form>
      ) : null}
    </div>
  );
}
