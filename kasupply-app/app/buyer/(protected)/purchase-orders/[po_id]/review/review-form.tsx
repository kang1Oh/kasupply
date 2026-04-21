"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReviewFormProps = {
  poId: number;
  cancelHref: string;
  submitAction: (formData: FormData) => Promise<void>;
  defaultValues?: {
    overallRating?: number | null;
    productQualityRating?: number | null;
    deliveryRating?: number | null;
    communicationRating?: number | null;
    valueForMoneyRating?: number | null;
    reviewText?: string | null;
  };
};

type CategoryKey =
  | "productQualityRating"
  | "deliveryRating"
  | "communicationRating"
  | "valueForMoneyRating";

function StarButton({
  filled,
  onClick,
  size = "md",
}: {
  filled: boolean;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const dimension = size === "lg" ? "h-[34px] w-[34px]" : "h-[24px] w-[24px]";
  const color = filled ? "#F4B53F" : "#E1E5EB";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center ${dimension} transition hover:scale-[1.03]`}
      aria-pressed={filled}
    >
      <svg viewBox="0 0 24 24" className={dimension} aria-hidden="true">
        <path
          d="m12 2.6 2.88 5.84 6.45.94-4.66 4.54 1.1 6.41L12 17.28l-5.77 3.05 1.1-6.41L2.67 9.38l6.45-.94L12 2.6Z"
          fill={color}
        />
      </svg>
    </button>
  );
}

export function ReviewForm({
  poId,
  cancelHref,
  submitAction,
  defaultValues,
}: ReviewFormProps) {
  const [overallRating, setOverallRating] = useState(defaultValues?.overallRating ?? 0);
  const [categoryRatings, setCategoryRatings] = useState<Record<CategoryKey, number>>({
    productQualityRating: defaultValues?.productQualityRating ?? 0,
    deliveryRating: defaultValues?.deliveryRating ?? 0,
    communicationRating: defaultValues?.communicationRating ?? 0,
    valueForMoneyRating: defaultValues?.valueForMoneyRating ?? 0,
  });
  const [reviewText, setReviewText] = useState(defaultValues?.reviewText ?? "");

  const categories = useMemo(
    () =>
      [
        { key: "productQualityRating", label: "Product quality" },
        { key: "deliveryRating", label: "Delivery" },
        { key: "communicationRating", label: "Communication" },
        { key: "valueForMoneyRating", label: "Value for money" },
      ] satisfies { key: CategoryKey; label: string }[],
    [],
  );

  return (
    <form action={submitAction} className="space-y-[10px]">
      <input type="hidden" name="poId" value={poId} />
      <input type="hidden" name="overallRating" value={overallRating || ""} />
      <input
        type="hidden"
        name="productQualityRating"
        value={categoryRatings.productQualityRating || ""}
      />
      <input type="hidden" name="deliveryRating" value={categoryRatings.deliveryRating || ""} />
      <input
        type="hidden"
        name="communicationRating"
        value={categoryRatings.communicationRating || ""}
      />
      <input
        type="hidden"
        name="valueForMoneyRating"
        value={categoryRatings.valueForMoneyRating || ""}
      />

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className="flex flex-col items-center px-[16px] py-[20px] text-center">
          <h2 className="text-[16px] font-semibold leading-none text-[#27456f]">
            Overall Rating
          </h2>
          <div className="mt-[18px] flex items-center justify-center gap-[2px]">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;

              return (
                <StarButton
                  key={value}
                  size="lg"
                  filled={value <= overallRating}
                  onClick={() => setOverallRating(value)}
                />
              );
            })}
          </div>
          <p className="mt-[12px] text-[12px] font-medium leading-none text-[#c0c7d1]">
            Tap to rate
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className="px-[18px] py-[16px]">
          <h2 className="text-[15px] font-semibold leading-none text-[#27456f]">
            Rate by category
          </h2>

          <div className="mt-[18px] space-y-[18px]">
            {categories.map((category) => (
              <div key={category.key} className="flex items-center justify-between gap-6">
                <p className="text-[14px] font-medium leading-none text-[#6d7889]">
                  {category.label}
                </p>
                <div className="flex items-center gap-[1px]">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;

                    return (
                      <StarButton
                        key={value}
                        filled={value <= categoryRatings[category.key]}
                        onClick={() =>
                          setCategoryRatings((current) => ({
                            ...current,
                            [category.key]: value,
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)]">
        <div className="px-[16px] py-[14px]">
          <div className="flex items-center gap-[4px]">
            <h2 className="text-[14px] font-semibold leading-none text-[#27456f]">
              Write a review
            </h2>
            <span className="text-[13px] leading-none text-[#b8c0ca]">(optional)</span>
          </div>

          <textarea
            name="reviewText"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Share your experience, anything that would help other buyers"
            className="mt-[14px] h-[72px] w-full resize-none rounded-[8px] border border-[#dbe2ec] px-[12px] py-[11px] text-[13px] text-[#223654] outline-none transition placeholder:text-[#c4cad4] focus:border-[#b9c4d5]"
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-[14px] pt-[4px]">
        <Link
          href={cancelHref}
          className="inline-flex h-[38px] items-center justify-center px-[6px] text-[13px] font-semibold text-[#ff5a47] transition hover:text-[#ef4638]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={overallRating < 1}
          className="inline-flex h-[38px] min-w-[128px] items-center justify-center rounded-[8px] bg-[#cfd5de] px-[18px] text-[13px] font-semibold text-white transition enabled:bg-[#9EABC0] enabled:hover:bg-[#8e9cb2] disabled:cursor-not-allowed disabled:opacity-100"
        >
          Submit Review
        </button>
      </div>
    </form>
  );
}
