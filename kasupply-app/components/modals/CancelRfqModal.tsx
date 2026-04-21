"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CancelRfqModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

function CancelRfqModalIcon({ size = 42 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className="text-[#2A4B77]"
      fill="none"
    >
      <path
        d="M16.5 8.5h11.7l8.8 8.8v9.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28.2 8.5v8.8H37"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 38.5H16.5a2.5 2.5 0 0 1-2.5-2.5V11a2.5 2.5 0 0 1 2.5-2.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 21.5H27"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M19.5 27.5H24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M34.5 39.5a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m31.6 31.6 5.8 5.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="m37.4 31.6-5.8 5.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CancelRfqModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
}: CancelRfqModalProps) {
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
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[432px] rounded-[24px] bg-white px-[34px] py-[34px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-rfq-modal-title"
        aria-describedby="cancel-rfq-modal-description"
        aria-label="Cancel this RFQ"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6]">
            <CancelRfqModalIcon />
          </div>

          <h2
            id="cancel-rfq-modal-title"
            className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            Cancel this RFQ?
          </h2>

          <p
            id="cancel-rfq-modal-description"
            className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            Are you sure you want to cancel this request?
            <br />
            The supplier will be notified.
          </p>

          <div className="mt-[28px] flex w-full max-w-[320px] items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#233F68] px-5 text-[14px] font-medium text-white transition hover:bg-[#1D3557] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Keep
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#95A5BE] px-5 text-[14px] font-medium text-white transition hover:bg-[#8798B2] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Cancelling..." : "Cancel RFQ"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
