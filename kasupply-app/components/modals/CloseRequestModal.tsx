"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

type CloseRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  requestTitle?: string | null;
  isSubmitting?: boolean;
};

export function CloseRequestModal({
  open,
  onClose,
  onConfirm,
  requestTitle,
  isSubmitting = false,
}: CloseRequestModalProps) {
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
        aria-labelledby="close-request-modal-title"
        aria-describedby="close-request-modal-description"
        aria-label={requestTitle ? `Close request ${requestTitle}` : "Close Request"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6]">
            <Image
              src="/icons/cancel_icon.svg"
              alt=""
              width={42}
              height={42}
              aria-hidden="true"
            />
          </div>

          <h2
            id="close-request-modal-title"
            className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            Close this request?
          </h2>

          <div
            id="close-request-modal-description"
            className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            <p>Suppliers can no longer view or respond to</p>
            <p>this sourcing request.</p>
          </div>

          <div className="mt-[28px] flex w-full max-w-[320px] items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#233F68] px-5 text-[14px] font-medium text-white transition hover:bg-[#1D3557] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#A9B7C9] px-5 text-[14px] font-medium text-white transition hover:bg-[#95A6BC] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Closing..." : "Close Request"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
