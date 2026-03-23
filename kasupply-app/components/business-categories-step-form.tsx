"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type ProductCategory = {
  category_id: number;
  category_name: string;
};

type BusinessCategoriesStepFormProps = {
  categories: ProductCategory[];
  initialSelectedCategoryIds?: number[];
  initialOtherCategories?: string[];
  backHref: string;
  sectionTitle?: string;
  sectionDescription?: string;
  nextPath?: string | null;
  requiredFlow?: string | null;
  action: (formData: FormData) => Promise<void>;
};

function StepIndicator({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          active ? "bg-[#1f3d67] text-white" : "bg-[#e5e7eb] text-[#b8bec8]"
        }`}
      >
        {number}
      </div>
      <span
        className={`truncate text-sm font-medium ${
          active ? "text-[#1f3d67]" : "text-[#c7ccd5]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function BusinessCategoriesStepForm({
  categories,
  initialSelectedCategoryIds = [],
  initialOtherCategories = [],
  backHref,
  sectionTitle = "What do you supply?",
  sectionDescription = "Select the product categories that best match your business.",
  nextPath,
  requiredFlow,
  action,
}: BusinessCategoriesStepFormProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialSelectedCategoryIds,
  );
  const [otherCategories, setOtherCategories] = useState(
    initialOtherCategories.join(", "),
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleCategory(categoryId: number) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await action(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
      {selectedCategoryIds.map((categoryId) => (
        <input
          key={categoryId}
          type="hidden"
          name="category_ids"
          value={categoryId}
        />
      ))}

      <input type="hidden" name="next_path" value={nextPath ?? ""} />
      <input type="hidden" name="required_flow" value={requiredFlow ?? ""} />

      <section className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-[#223654]">
                Basic Profile Information
              </h1>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Share a few details so we can tailor KaSupply to your needs
              </p>
            </div>
            <p className="text-sm font-semibold text-[#223654]">Step 1 of 3</p>
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator number={1} label="Profile Setup" active />
            <div className="h-px flex-1 bg-[#1f3d67]" />
            <StepIndicator number={2} label="Verification" />
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <StepIndicator number={3} label="User Verified" />
          </div>

          <div className="rounded-[14px] border border-[#e4e9f1] bg-white p-5">
            <div>
              <h2 className="text-[24px] font-semibold text-[#223654]">
                {sectionTitle}
              </h2>
              <p className="mt-1 text-sm text-[#8b95a5]">
                {sectionDescription}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {categories.map((category) => {
                const selected = selectedCategoryIds.includes(category.category_id);

                return (
                  <button
                    key={category.category_id}
                    type="button"
                    onClick={() => toggleCategory(category.category_id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-[#1f3d67] bg-[#1f3d67] text-white"
                        : "border-[#35557f] bg-white text-[#223654] hover:bg-[#f8fafc]"
                    }`}
                  >
                    {category.category_name}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block space-y-2">
                <span className="text-[20px] font-semibold text-[#223654]">Others</span>
                <input
                  name="other_categories"
                  type="text"
                  value={otherCategories}
                  onChange={(event) => setOtherCategories(event.target.value)}
                  placeholder="Enter Category"
                  className="h-11 w-full rounded-md border border-[#d7dee8] bg-white px-3 text-sm text-[#334155] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#1f3d67]"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-4">
        <Link href={backHref} className="text-sm font-medium text-[#aab3c2]">
          Back
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Proceed"}
        </button>
      </div>
    </form>
  );
}
