"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ReviewSubmittedModalProps = {
  open: boolean;
  onClose: () => void;
  onViewSupplierProfile: () => void;
  onBackToOrders: () => void;
};

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
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6] pt-[4px]">
            <Image
              src="/icons/confetti.svg"
              alt=""
              width={34}
              height={34}
              aria-hidden="true"
            />
          </div>

          <h2
            id="review-submitted-modal-title"
            className="mt-[18px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            Review submitted!
          </h2>

          <p
            id="review-submitted-modal-description"
            className="mt-[10px] max-w-[360px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            Thank you for your feedback.
            <br />
            Your feedback helps other buyers
          </p>

          <div className="mt-[28px] flex w-full max-w-[360px] items-center justify-center gap-3">
            <button
              type="button"
              onClick={onViewSupplierProfile}
              className="inline-flex h-[44px] min-w-[186px] items-center justify-center rounded-[12px] bg-[#233F68] px-[24px] text-[14px] font-medium whitespace-nowrap text-white transition hover:bg-[#1D3557]"
            >
              View supplier profile
            </button>

            <button
              type="button"
              onClick={onBackToOrders}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#9EABC0] px-[24px] text-[14px] font-medium whitespace-nowrap text-white transition hover:bg-[#8d9ab0]"
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
