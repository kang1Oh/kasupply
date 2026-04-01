"use client";

import Link from "next/link";
import { useState } from "react";
import { DatePickerInput } from "@/components/date-picker-input";
import type { ProductCategoryOption } from "@/lib/buyer/rfq-workflows";

type BuyerSourcingRequestFormProps = {
  categories: ProductCategoryOption[];
  defaultDeliveryLocation?: string;
  action: (formData: FormData) => void | Promise<void>;
};

const UNIT_OPTIONS = ["kg", "g", "pcs", "box", "pack", "bottle", "bag", "liter"];
const QUICK_PRICE_OPTIONS = [10, 20, 50, 100];

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#223654]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[12px] text-[#a0abba]">{description}</p>
      ) : null}
    </div>
  );
}

function InputLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#223654]">
      {children}
      {required ? <span className="text-[#ff5b4d]"> *</span> : null}
    </label>
  );
}

function SelectCaret() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#223654]">
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path
          d="m5 7.5 5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BuyerSourcingRequestForm({
  categories,
  defaultDeliveryLocation,
  action,
}: BuyerSourcingRequestFormProps) {
  const [targetPricePerUnit, setTargetPricePerUnit] = useState("");

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <SectionHeading title="What do you need?" />

        <div className="grid gap-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-12">
            <InputLabel htmlFor="requestedProductName" required>
              Title
            </InputLabel>
            <input
              id="requestedProductName"
              name="requestedProductName"
              type="text"
              placeholder="e.g. Looking for bulk fresh kangkong supplier"
              className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-12">
            <InputLabel htmlFor="categoryId" required>
              Category
            </InputLabel>
            <div className="relative">
              <select
                id="categoryId"
                name="categoryId"
                defaultValue=""
                className="h-[46px] w-full appearance-none rounded-[10px] border border-[#d7dee8] bg-white pl-4 pr-11 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                required
              >
                <option value="">Select a Category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
              <SelectCaret />
            </div>
          </div>

          <div className="space-y-2 md:col-span-9">
            <InputLabel htmlFor="quantity" required>
              Quantity
            </InputLabel>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              placeholder="e.g. 200"
              className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654] [color-scheme:light]"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <InputLabel htmlFor="unit" required>
              Unit
            </InputLabel>
            <div className="relative">
              <select
                id="unit"
                name="unit"
                defaultValue="kg"
                className="h-[46px] w-full appearance-none rounded-[10px] border border-[#d7dee8] bg-white pl-4 pr-11 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]"
                required
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <SelectCaret />
            </div>
          </div>

          <div className="space-y-2 md:col-span-12">
            <InputLabel htmlFor="targetPricePerUnit" required>
              Target Price (per unit)
            </InputLabel>
            <input
              id="targetPricePerUnit"
              name="targetPricePerUnit"
              type="number"
              min="0.01"
              step="0.01"
              value={targetPricePerUnit}
              onChange={(event) => setTargetPricePerUnit(event.target.value)}
              placeholder="e.g. 10"
              className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654] [color-scheme:light]"
              required
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-[#b0b8c5]">Quick pick:</span>
              {QUICK_PRICE_OPTIONS.map((price) => {
                const isActive = targetPricePerUnit === String(price);

                return (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setTargetPricePerUnit(String(price))}
                    className={`inline-flex h-7 items-center rounded-[8px] border px-3 text-[11px] font-semibold transition ${
                      isActive
                        ? "border-[#243f68] bg-[#243f68] text-white"
                        : "border-[#d7dee8] bg-[#fafbfd] text-[#526176] hover:border-[#243f68] hover:text-[#243f68]"
                    }`}
                  >
                    {`P${price}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <SectionHeading title="Delivery Details" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <InputLabel htmlFor="needBy" required>
              Need by
            </InputLabel>
            <DatePickerInput id="needBy" name="needBy" required />
          </div>

          <div className="space-y-2 md:col-span-2">
            <InputLabel htmlFor="deliveryLocation" required>
              Location
            </InputLabel>
            <input
              id="deliveryLocation"
              name="deliveryLocation"
              type="text"
              defaultValue={defaultDeliveryLocation ?? ""}
              placeholder="Enter location"
              className="h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-[#e5ebf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <SectionHeading
          title="Additional Info"
          description="Further details help suppliers prepare a more accurate quote."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <InputLabel htmlFor="deadline" required>
              Request Deadline
            </InputLabel>
            <DatePickerInput id="deadline" name="deadline" required />
          </div>
        </div>

        <div className="space-y-2">
          <InputLabel htmlFor="specifications">Notes / Specifications</InputLabel>
          <textarea
            id="specifications"
            name="specifications"
            rows={6}
            placeholder="Packaging preferences, quality requirements, special conditions..."
            className="w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 py-3 text-[14px] text-[#223654] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#223654]"
          />
        </div>
      </section>

      <div className="flex items-center gap-2 text-[12px] text-[#a0abba]">
        <span className="h-2 w-2 rounded-full bg-[#99cfaa]" />
        <p>Verified suppliers in your area will be notified.</p>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/buyer/sourcing-board"
          className="inline-flex h-[46px] items-center rounded-[10px] px-5 text-[14px] text-[#8b95a5] transition hover:text-[#223654]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-[46px] items-center rounded-[10px] bg-[#243f68] px-8 text-[14px] font-medium text-white transition hover:bg-[#1f3658]"
        >
          Post Request
        </button>
      </div>
    </form>
  );
}
