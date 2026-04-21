"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ReviewSubmittedModalProps = {
  open: boolean;
  onClose: () => void;
  onViewSupplierProfile: () => void;
  onBackToOrders: () => void;
};

function ReviewSubmittedModalIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[34px] w-[34px]" aria-hidden="true">
      <path
        d="m13 31 9.5-19 12.5 10.5L13 31Z"
        fill="none"
        stroke="#243F68"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m23.5 14 3-4m6 10 5-1m-8.5 6 4 3m-18.5 3-3.5 2"
        fill="none"
        stroke="#243F68"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32.5" cy="13" r="1.4" fill="#243F68" />
      <circle cx="36.5" cy="25.5" r="1.4" fill="#243F68" />
      <circle cx="28.5" cy="30.5" r="1.4" fill="#243F68" />
    </svg>
  );
}

export function ReviewSubmittedModal({
  open,
  onClose,
  onViewSupplierProfile,
  onBackToOrders,
}: ReviewSubmittedModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[432px] rounded-[24px] bg-white px-[34px] py-[34px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-submitted-modal-title"
        aria-describedby="review-submitted-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6]">
            <ReviewSubmittedModalIcon />
          </div>

          <h2
            id="review-submitted-modal-title"
            className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            Review submitted!
          </h2>

          <p
            id="review-submitted-modal-description"
            className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            Thank you for your feedback. Your feedback
            <br />
            helps other buyers
          </p>

          <div className="mt-[28px] flex w-full max-w-[320px] items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onViewSupplierProfile}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#233F68] px-5 text-[14px] font-medium text-white transition hover:bg-[#1D3557]"
            >
              View supplier profile
            </button>

            <button
              type="button"
              onClick={onBackToOrders}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#9EABC0] px-5 text-[14px] font-medium text-white transition hover:bg-[#8d9ab0]"
            >
              Back to orders
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
