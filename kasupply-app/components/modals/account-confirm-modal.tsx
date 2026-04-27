"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AccountConfirmModalProps = {
  isOpen: boolean;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  confirmTone?: "default" | "danger";
};

export function AccountConfirmModal({
  isOpen,
  icon,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  isSubmitting = false,
  confirmTone = "default",
}: AccountConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4"
      onClick={() => {
        if (!isSubmitting) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-[432px] rounded-[24px] bg-white px-[34px] py-[34px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6] text-[#243F68]">
            {icon}
          </div>

          <h2 className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]">
            {title}
          </h2>

          <div className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]">
            {description}
          </div>

          <div className="mt-[28px] flex w-full max-w-[320px] items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] bg-[#233F68] px-5 text-[14px] font-medium text-white transition hover:bg-[#1D3557] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] px-5 text-[14px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
                confirmTone === "danger"
                  ? "bg-[#A9B7C9] hover:bg-[#95A6BC]"
                  : "bg-[#A9B7C9] hover:bg-[#95A6BC]"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
