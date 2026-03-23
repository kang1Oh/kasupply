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
  description = "Your supplier account is verified and ready. You can now start managing inventory, responding to RFQs, and growing your presence on KaSupply.",
  ctaHref = "/supplier/dashboard",
  ctaLabel = "Go To Dashboard",
}: AccountActivatedModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      maxWidthClassName="max-w-2xl"
      panelClassName="rounded-[28px] bg-white px-8 py-12 shadow-2xl"
      overlayClassName="bg-slate-950/50 p-4"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#243f68] text-[#243f68]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24" 
              className="h-8 w-8"
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

        <h2 className="mt-8 text-[2.15rem] font-semibold tracking-tight text-[#243f68]">
          {title}
        </h2>

        <p className="mt-4 max-w-xl text-[1.1rem] leading-8 text-slate-400">
          {description}
        </p>

        <Link
          href={ctaHref}
          className="mt-10 inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-[#243f68] px-8 py-4 text-lg font-semibold text-white transition hover:bg-[#1e3658]"
        >
          {ctaLabel}
        </Link>
      </div>
    </ModalShell>
  );
}
