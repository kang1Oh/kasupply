"use client";

import Link from "next/link";
import { ModalShell } from "./modal-shell";

type AccountActivatedModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function AccountActivatedModal({
  isOpen,
  title = "Account activated!",
  description = "Your buyer account is verified and ready. You can now browse suppliers, send RFQs, and post on the sourcing board.",
  ctaHref = "/buyer",
  ctaLabel = "Go To Dashboard",
}: AccountActivatedModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      maxWidthClassName="max-w-md"
      panelClassName="rounded-[20px] bg-white px-10 py-8 shadow-2xl"
      overlayClassName="bg-slate-950/70 p-4"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-[#243f68] text-[#243f68]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>

        <h2 className="mt-5 text-[24px] font-semibold tracking-tight text-[#243f68]">
          {title}
        </h2>

        <p className="mt-2 text-[17px] font-light leading-6 text-slate-400">
          {description}
        </p>

        <Link
          href={ctaHref}
          className="mt-6 inline-flex min-w-[160px] items-center justify-center rounded-xl bg-[#243f68] px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#1e3658]"
        >
          {ctaLabel}
        </Link>
      </div>
    </ModalShell>
  );
}