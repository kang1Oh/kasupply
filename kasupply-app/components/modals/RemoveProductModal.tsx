"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TrashCanModalIcon } from "./trash-can-modal-icon";

type RemoveProductModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName?: string | null;
  isSubmitting?: boolean;
};

export function RemoveProductModal({
  open,
  onClose,
  onConfirm,
  productName,
  isSubmitting = false,
}: RemoveProductModalProps) {
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
        aria-labelledby="remove-product-modal-title"
        aria-describedby="remove-product-modal-description"
        aria-label={productName ? `Remove ${productName}` : "Remove Product"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#EEF2F6]">
            <TrashCanModalIcon size={42} />
          </div>

          <h2
            id="remove-product-modal-title"
            className="mt-[22px] text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]"
          >
            Remove Product
          </h2>

          <p
            id="remove-product-modal-description"
            className="mt-[10px] max-w-[320px] text-[17px] font-light leading-[1.42] text-[#A7B0BF]"
          >
            Are you sure you want to remove this product from your catalog?
          </p>

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
              className="inline-flex h-[44px] min-w-[154px] items-center justify-center rounded-[12px] border border-[#FF4A3D] bg-white px-5 text-[14px] font-medium text-[#FF3B30] transition hover:bg-[#FFF6F5] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Removing..." : "Remove Product"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
