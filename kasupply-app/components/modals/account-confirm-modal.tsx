"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[430px] rounded-[22px] bg-white px-8 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#f1f5fb] text-[#243f68] shadow-[inset_0_0_0_1px_rgba(36,63,104,0.06)]">
            {icon}
          </div>

          <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.02em] text-[#243f68]">
            {title}
          </h2>

          <div className="mt-3 text-[14px] leading-6 text-[#9ca3af]">{description}</div>

          <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-[42px] items-center justify-center rounded-[9px] bg-[#243f68] px-4 text-[14px] font-medium text-white transition hover:bg-[#20365a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`inline-flex h-[42px] items-center justify-center rounded-[9px] px-4 text-[14px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
                confirmTone === "danger"
                  ? "bg-[#a5b3c8] hover:bg-[#98a7bd]"
                  : "bg-[#a5b3c8] hover:bg-[#98a7bd]"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
