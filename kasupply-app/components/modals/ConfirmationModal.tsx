"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  confirmVariant: "primary" | "destructive";
  icon: ReactNode;
  isSubmitting?: boolean;
  cancelText?: string;
  ariaLabel?: string;
};

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmVariant,
  icon,
  isSubmitting = false,
  cancelText = "Cancel",
  ariaLabel,
}: ConfirmationModalProps) {
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

  const confirmClassName =
    confirmVariant === "destructive"
      ? "border border-[#FF4A3D] bg-white text-[#FF3B30] hover:bg-[#FFF6F5]"
      : "bg-[#233F68] text-white hover:bg-[#1D3557]";

  const cancelClassName =
    confirmVariant === "destructive"
      ? "bg-[#233F68] text-white hover:bg-[#1D3557]"
      : "border border-[#D5DDEA] bg-white text-[#66748B] hover:bg-[#F8FAFC]";

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
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
        aria-label={ariaLabel ?? title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6]">
            {icon}
          </div>

          <h2
            id="confirmation-modal-title"
            className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            {title}
          </h2>

          <p
            id="confirmation-modal-description"
            className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            {description}
          </p>

          <div className="mt-[28px] flex w-full max-w-[320px] items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] px-5 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${cancelClassName}`}
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] px-5 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmClassName}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
