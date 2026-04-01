"use client";

import Link from "next/link";

export type BuyerHomepageSupplier = {
  id: number;
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
  return (
    <article
      className={`flex h-full flex-col rounded-[20px] border border-[#e2e8f0] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
        compact ? "px-4 pt-3.5 pb-3.5" : "px-4 pt-3.5 pb-3.5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {supplier.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplier.avatarUrl}
              alt={`${supplier.name} avatar`}
              className="h-[42px] w-[42px] shrink-0 rounded-[11px] border border-[#e6edf6] object-cover"
            />
          ) : (
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] bg-[#edf6ee] text-[16px] font-semibold text-[#4f8f56]">
              {supplier.initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-semibold leading-tight text-[#223654]">
              {supplier.name}
            </h3>
            <p className="mt-0.5 text-[14px] font-normal capitalize leading-tight text-[#8b97aa]">
              {supplier.supplierType}
            </p>
          </div>
        </div>

        <div className="flex w-[104px] shrink-0 flex-col items-end gap-1 text-right">
          {supplier.verified ? (
            <span className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-[#1f7a45] bg-[#f4f8ff] px-2.5 py-[0.15rem] text-[13px] font-medium text-[#1f7a45]">
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

      <div className="mt-3 flex flex-wrap gap-1.5">
        {supplier.categoryTags.length > 0 ? (
          supplier.categoryTags.map((tag) => (
            <span
              key={tag}
              className="rounded-[14px] border border-[#dfe6ef] bg-white px-2.5 py-1 text-[12px] leading-none text-[#6f7c90] shadow-[0_1px_0_rgba(15,23,42,0.03)]"
            >
              {tag}
            </span>
          ))
        ) : (
            <span className="rounded-[14px] border border-[#dfe6ef] bg-white px-2.5 py-1 text-[12px] leading-none text-[#94a3b8] shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            No listed categories yet
          </span>
        )}
      </div>

      <p
        className={`mt-4 flex-1 text-[#6f7c90] ${
          compact
            ? "line-clamp-3 text-[13px] leading-[1.45]"
            : "line-clamp-3 text-[13px] leading-[1.45]"
        }`}
      >
        {supplier.shortDescription}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-[#edf2f7] pt-3 text-[11px] text-[#9aa5b5]">
        <span className="inline-flex items-center gap-1.5">
          <PinIcon />
          {supplier.location}
        </span>
        <span className="font-medium text-[#94a3b8]">
          {supplier.reviewLabel ?? "No reviews yet"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_40px] gap-2">
        <Link
          href={`/buyer/search/${supplier.id}`}
          className="inline-flex min-h-[38px] items-center justify-center rounded-[7px] bg-[#223f68] px-4 py-2 text-[11px] font-medium text-white transition hover:bg-[#1d3454]"
        >
          View Details
        </Link>
        <Link
          href={`/buyer/messages?supplierId=${supplier.id}`}
          className="inline-flex min-h-[38px] items-center justify-center rounded-[7px] border border-[#d9e2ee] px-4 py-2 text-[11px] font-medium text-[#94a3b8] transition hover:bg-[#f8fafc] hover:text-[#223654]"
        >
          Send Message
        </Link>
        <button
          type="button"
          className="inline-flex min-h-[38px] items-center justify-center rounded-[7px] border border-[#d9e2ee] text-[#b0bac8] transition hover:bg-[#f8fafc] hover:text-[#223654]"
          aria-label={`Save ${supplier.name}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M7.75 4.75h8.5a1 1 0 0 1 1 1v13.5L12 15.75l-5.25 3.5V5.75a1 1 0 0 1 1-1Z"
              fill="none"
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
