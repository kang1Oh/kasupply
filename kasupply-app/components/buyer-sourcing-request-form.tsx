"use client";

import Link from "next/link";
import { useState } from "react";
import { DatePickerInput } from "@/components/date-picker-input";
import type { ProductCategoryOption } from "@/lib/buyer/rfq-workflows";

type BuyerSourcingRequestFormProps = {
  categories: ProductCategoryOption[];
  units: string[];
  defaultDeliveryLocation?: string;
  action: (formData: FormData) => void | Promise<void>;
};

const QUICK_PRICE_OPTIONS = [10, 20, 50, 100];

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-[#edf1f5] px-[16px] py-[12px]">
      <h2 className="text-[13px] font-semibold uppercase tracking-[-0.01em] text-[#27456f]">
        {title}
      </h2>
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
    <label htmlFor={htmlFor} className="text-[12px] font-medium text-[#223654]">
      {children}
      {required ? <span className="text-[#f05b50]"> *</span> : null}
    </label>
  );
}

function SelectCaret() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-[12px] flex items-center text-[#5e6a7d]">
      <svg viewBox="0 0 20 20" className="h-[13px] w-[13px]" aria-hidden="true">
        <path
          d="m6 8 4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[#e8edf3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <SectionHeading title={title} />
      <div className="px-[14px] py-[16px]">{children}</div>
    </section>
  );
}

function TextField({
  id,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
  inputMode,
}: {
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      required={required}
      inputMode={inputMode}
      min={type === "number" ? "1" : undefined}
      step={type === "number" ? "any" : undefined}
      className="h-[40px] w-full rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] text-[12px] text-[#223654] outline-none transition placeholder:text-[#b5bdc8] focus:border-[#223654] [color-scheme:light]"
    />
  );
}

export function BuyerSourcingRequestForm({
  categories,
  units,
  defaultDeliveryLocation,
  action,
}: BuyerSourcingRequestFormProps) {
  const [targetPricePerUnit, setTargetPricePerUnit] = useState("");

  return (
    <form action={action} className="space-y-[10px]">
      <FormCard title="WHAT DO YOU NEED?">
        <div className="space-y-[12px]">
          <div className="space-y-[6px]">
            <InputLabel htmlFor="requestedProductName" required>
              Title
            </InputLabel>
            <TextField
              id="requestedProductName"
              name="requestedProductName"
              placeholder="e.g. Looking for bulk fresh kangkong supplier"
              required
            />
          </div>

          <div className="space-y-[6px]">
            <InputLabel htmlFor="categoryId" required>
              Category
            </InputLabel>
            <div className="relative">
              <select
                id="categoryId"
                name="categoryId"
                defaultValue=""
                required
                className="h-[40px] w-full appearance-none rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] pr-[34px] text-[12px] text-[#223654] outline-none transition focus:border-[#223654]"
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

          <div className="space-y-[6px]">
            <InputLabel htmlFor="quantity" required>
              Quantity
            </InputLabel>
            <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-[8px]">
              <TextField
                id="quantity"
                name="quantity"
                type="number"
                placeholder="e.g. 200"
                required
                inputMode="numeric"
              />

              <div className="relative">
                <select
                  id="unit"
                  name="unit"
                  defaultValue={units[0] ?? "kg"}
                  required
                  className="h-[40px] w-full appearance-none rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] pr-[28px] text-[12px] text-[#223654] outline-none transition focus:border-[#223654]"
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <SelectCaret />
              </div>
            </div>
          </div>

          <div className="space-y-[6px]">
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
              placeholder={"e.g. \u20B110"}
              required
              inputMode="decimal"
              className="h-[40px] w-full rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] text-[12px] text-[#223654] outline-none transition placeholder:text-[#b5bdc8] focus:border-[#223654] [color-scheme:light]"
            />

            <div className="flex flex-wrap items-center gap-[6px] pt-[2px]">
              <span className="text-[10px] text-[#b6bec9]">Quick pick:</span>
              {QUICK_PRICE_OPTIONS.map((price) => {
                const isActive = targetPricePerUnit === String(price);

                return (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setTargetPricePerUnit(String(price))}
                    className={`inline-flex h-[18px] items-center rounded-[4px] border px-[7px] text-[10px] font-medium transition ${
                      isActive
                        ? "border-[#294773] bg-[#294773] text-white"
                        : "border-[#cfd7e1] bg-[#f8fafc] text-[#5d6a7c] hover:border-[#b8c3d2]"
                    }`}
                  >
                    {"\u20B1"}
                    {price}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="DELIVERY DETAILS">
        <div className="grid gap-[10px] md:grid-cols-2">
          <div className="space-y-[6px]">
            <InputLabel htmlFor="needBy" required>
              Needed by
            </InputLabel>
            <DatePickerInput
              id="needBy"
              name="needBy"
              required
              placeholder="dd/mm/yyyy"
              className="h-[40px] w-full rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] pr-[40px] text-[12px] text-[#223654] outline-none transition placeholder:text-[#b5bdc8] focus:border-[#223654]"
            />
          </div>

          <div className="space-y-[6px]">
            <InputLabel htmlFor="deliveryLocation" required>
              Location
            </InputLabel>
            <TextField
              id="deliveryLocation"
              name="deliveryLocation"
              placeholder="Enter location"
              defaultValue={defaultDeliveryLocation ?? ""}
              required
            />
          </div>
        </div>
      </FormCard>

      <FormCard title="ADDITIONAL INFO">
        <div className="space-y-[6px]">
          <InputLabel htmlFor="specifications">Notes / Specifications</InputLabel>
          <textarea
            id="specifications"
            name="specifications"
            rows={6}
            placeholder="Packaging preferences, quality requirements, special conditions....."
            className="min-h-[116px] w-full rounded-[8px] border border-[#ccd5e1] bg-white px-[12px] py-[11px] text-[12px] text-[#223654] outline-none transition placeholder:text-[#b5bdc8] focus:border-[#223654]"
          />
          <p className="text-[10px] text-[#b5bdc8]">
            Optional - helps the supplier prepare a more accurate quote
          </p>
        </div>
      </FormCard>

      <div className="flex items-center gap-[6px] pt-[2px] text-[11px] text-[#a9b2be]">
        <span className="inline-flex h-[10px] w-[10px] rounded-full border border-[#c7d0db]" />
        <p>Verified Supplier in your area will be notified</p>
      </div>

      <div className="flex items-center justify-end gap-[18px] pt-[2px]">
        <Link
          href="/buyer/sourcing-board"
          className="inline-flex h-[40px] items-center text-[13px] font-medium text-[#8f99a8] transition hover:text-[#223654]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-[40px] min-w-[96px] items-center justify-center rounded-[8px] bg-[#223f68] px-[18px] text-[13px] font-semibold text-white transition hover:bg-[#1d3558]"
        >
          Post Request
        </button>
      </div>
    </form>
  );
}
