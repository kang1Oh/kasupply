"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type BuyerHomepageSupplier = {
  supplierId: number;
  profileId: number;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  supplierType: string;
  categoryTags: string[];
  shortDescription: string;
  location: string;
  verified: boolean;
  recommendationScore?: number;
  matchLabel?: string | null;
  reviewLabel?: string | null;
};

type BuyerSupplierCardProps = {
  supplier: BuyerHomepageSupplier;
  compact?: boolean;
};

const SUPPLIER_NAME_MAX_LENGTH = 25;

const avatarColorStyles = [
  "bg-[#edf6ee] text-[#4f8f56]",
  "bg-[#eef4ff] text-[#3f6fb5]",
  "bg-[#fff4e8] text-[#c97826]",
  "bg-[#f3efff] text-[#7a5ac8]",
  "bg-[#eef8f7] text-[#3b8f86]",
  "bg-[#fff0f3] text-[#c05772]",
];

function getAvatarColorClass(supplierId: number) {
  return avatarColorStyles[supplierId % avatarColorStyles.length];
}

function getDisplaySupplierName(name: string) {
  const trimmedName = name.trim();

  if (trimmedName.length <= SUPPLIER_NAME_MAX_LENGTH) {
    return trimmedName;
  }

  return `${trimmedName.slice(0, SUPPLIER_NAME_MAX_LENGTH).trimEnd()}...`;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 20.25s6-4.73 6-10.12a6 6 0 1 0-12 0c0 5.39 6 10.12 6 10.12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10.13"
        r="2.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="m5.75 12.25 4.25 4.25 8.25-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BuyerSupplierCard({
  supplier,
  compact = false,
}: BuyerSupplierCardProps) {
  const displaySupplierName = getDisplaySupplierName(supplier.name);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkPopping, setIsBookmarkPopping] = useState(false);
  const bookmarkPopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (bookmarkPopTimeoutRef.current !== null) {
        window.clearTimeout(bookmarkPopTimeoutRef.current);
      }
    };
  }, []);

  function handleBookmarkClick() {
    setIsBookmarked((current) => !current);
    setIsBookmarkPopping(true);

    if (bookmarkPopTimeoutRef.current !== null) {
      window.clearTimeout(bookmarkPopTimeoutRef.current);
    }

    bookmarkPopTimeoutRef.current = window.setTimeout(() => {
      setIsBookmarkPopping(false);
      bookmarkPopTimeoutRef.current = null;
    }, 180);
  }

  return (
    <article
      className={`flex h-full transform-gpu flex-col rounded-[20px] border border-[#e2e8f0] bg-white shadow-none transition duration-[220ms] ease-out hover:-translate-y-0.5 hover:border-[#294773] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${
        compact ? "px-4 pt-3.5 pb-3.5" : "px-4 pt-3.5 pb-3.5"
      }`}
    >
      <div className="flex min-h-[42px] shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {supplier.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplier.avatarUrl}
              alt={`${supplier.name} avatar`}
              className="h-[42px] w-[42px] shrink-0 rounded-[11px] border border-[#e6edf6] object-cover"
            />
          ) : (
            <div
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] text-[16px] font-semibold ${getAvatarColorClass(
                supplier.supplierId
              )}`}
            >
              {supplier.initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[16px] font-semibold leading-[1.25] text-[#223654]"
              title={supplier.name}
              aria-label={supplier.name}
            >
              {displaySupplierName}
            </h3>
            <p className="mt-0.5 text-[14px] font-normal capitalize leading-[1.25] text-[#8b97aa]">
              {supplier.supplierType}
            </p>
          </div>
        </div>

        <div className="flex w-[104px] shrink-0 flex-col items-end gap-1 text-right">
          {supplier.verified ? (
            <span className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-[#1f7a45] bg-[#f4f8ff] px-2.5 py-[0.15rem] text-[13px] font-medium text-[#1f7a45]">
              <BadgeIcon />
              Verified
            </span>
          ) : null}

          {supplier.matchLabel ? (
            <span className="text-[13px] font-semibold leading-tight text-[#2f6df6]">
              {supplier.matchLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {supplier.categoryTags.length > 0 ? (
          supplier.categoryTags.map((tag) => (
            <span
              key={tag}
              className="rounded-[8px] border border-[#dfe6ef] bg-white px-2.5 py-1.5 text-[12px] leading-none text-[#6f7c90] shadow-[0_1px_0_rgba(15,23,42,0.03)]"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="rounded-[8px] border border-[#dfe6ef] bg-white px-2.5 py-1.5 text-[12px] leading-none text-[#94a3b8] shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            No listed categories yet
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-[14px] font-normal leading-[1.6] text-[#56657a]">
        {supplier.shortDescription}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-[#edf2f7] pt-3 text-[12.5px] text-[#8f9bae]">
        <span className="inline-flex items-center gap-1">
          <PinIcon />
          {supplier.location}
        </span>
        <span className="font-normal text-[#8f9bae]">
          {supplier.reviewLabel ?? "No reviews yet"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_40px] gap-2">
        <Link
          href={`/buyer/search/${supplier.supplierId}`}
          className="inline-flex min-h-[38px] items-center justify-center rounded-[7px] bg-[#223f68] px-4 py-2 text-[12.5px] font-medium text-white transition duration-200 ease-out hover:bg-[#2c527f]"
        >
          View Details
        </Link>

        <Link
          href={`/buyer/messages?supplierId=${supplier.supplierId}`}
          className="inline-flex min-h-[38px] items-center justify-center rounded-[7px] border border-[#d9e2ee] px-4 py-2 text-[12.5px] font-normal text-[#7f8da3] transition duration-200 ease-out hover:bg-[#f8fafc] hover:text-[#223654]"
        >
          Send Message
        </Link>

        <button
          type="button"
          onClick={handleBookmarkClick}
          aria-pressed={isBookmarked}
          aria-label={`${isBookmarked ? "Unsave" : "Save"} ${supplier.name}`}
          className={`group inline-flex min-h-[38px] transform-gpu items-center justify-center rounded-[7px] border transition duration-200 ease-out ${
            isBookmarkPopping ? "scale-[1.15]" : "scale-100"
          } ${
            isBookmarked
              ? "border-[#f39a44] bg-[#fff7ed] text-[#d97706]"
              : "border-[#d9e2ee] text-[#b0bac8] hover:border-[#f3c28f] hover:bg-[#fff7ed] hover:text-[#d97706]"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
            <path
              d="M7.75 4.75h8.5a1 1 0 0 1 1 1v13.5L12 15.75l-5.25 3.5V5.75a1 1 0 0 1 1-1Z"
              className={`transition duration-200 ease-out ${
                isBookmarked
                  ? "fill-[#f39a44]"
                  : "fill-transparent group-hover:fill-[#f39a44]/20"
              }`}
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}