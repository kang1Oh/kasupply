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

      <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col items-center px-[22px] py-[25px] text-center">
          <h2 className="text-[17px] font-semibold leading-none text-[#223654]">
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
          <p className="mt-[12px] text-[14px] font-medium leading-none text-[#A4AFBF]">
            Tap to rate
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="px-[22px] py-[25px]">
          <h2 className="text-[17px] font-semibold leading-none text-[#223654]">
            Rate by category
          </h2>

          <div className="mt-[18px] space-y-[18px]">
            {categories.map((category) => (
              <div key={category.key} className="flex items-center justify-between gap-6">
                <p className="text-[15px] font-medium leading-none text-[rgba(55,65,81,0.7)]">
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

      <section className="overflow-hidden rounded-[18px] border border-[#E4ECF5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="px-[22px] py-[25px]">
          <div className="flex items-center gap-[4px]">
            <h2 className="text-[17px] font-semibold leading-none text-[#223654]">
              Write a review
            </h2>
            <span className="text-[14px] leading-none text-[#A4AFBF]">(optional)</span>
          </div>

          <textarea
            name="reviewText"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Share your experience, anything that would help other buyers"
            className="mt-[14px] h-[96px] w-full resize-none rounded-[10px] border border-[#dbe2ec] px-[14px] py-[12px] text-[14px] text-[#223654] outline-none transition placeholder:text-[#c4cad4] focus:border-[#b9c4d5]"
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-[14px] pt-[4px]">
        <Link
          href={cancelHref}
          className="inline-flex h-[44px] items-center justify-center px-[20px] text-[14px] font-medium text-[#FE1601] transition hover:text-[#df1300]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={overallRating < 1}
          className="inline-flex h-[44px] min-w-[148px] items-center justify-center rounded-[8px] bg-[#cfd5de] px-[20px] text-[14px] font-medium text-white transition enabled:bg-[#9EABC0] enabled:hover:bg-[#8e9cb2] disabled:cursor-not-allowed disabled:opacity-100"
        >
          Submit Review
        </button>
      </div>
    </form>
  );
}
