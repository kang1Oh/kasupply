"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createPortal } from "react-dom";
import { submitSupplierProfileReportAction } from "@/app/buyer/search/[supplierId]/actions";

type BuyerSupplierProfileActionsProps = {
  supplierId: number;
};

type BuyerSupplierReportActionProps = {
  supplierName: string;
  reportedUserId: string | null;
  className?: string;
};

type ReportSupplierModalProps = {
  open: boolean;
  supplierName: string;
  formRef: RefObject<HTMLFormElement | null>;
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
};

function ReportSupplierModal({
  open,
  supplierName,
  formRef,
  isSubmitting,
  errorMessage,
  successMessage,
  onClose,
  onSubmit,
}: ReportSupplierModalProps) {
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
        className="w-full max-w-[520px] rounded-[24px] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-supplier-modal-title"
        aria-describedby="report-supplier-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="report-supplier-modal-title"
              className="text-[24px] font-semibold tracking-[-0.03em] text-[#243F68]"
            >
              Report supplier
            </h2>
            <p
              id="report-supplier-modal-description"
              className="mt-2 text-[14px] leading-6 text-[#7C8798]"
            >
              Tell our admin team what happened with {supplierName}. Your message will be sent for review.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E9F1] text-[#8A95A6] transition hover:border-[#CFD8E6] hover:text-[#223654] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close report modal"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form ref={formRef} action={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="supplier-report-description"
              className="text-[13px] font-medium text-[#223654]"
            >
              Report message
            </label>
            <textarea
              id="supplier-report-description"
              name="description"
              rows={6}
              required
              minLength={10}
              placeholder="Please describe the issue you want to report."
              className="w-full rounded-[18px] border border-[#D8E0EB] bg-white px-4 py-3 text-[14px] text-[#334155] outline-none transition placeholder:text-[#A7B0BF] focus:border-[#8FA6C7]"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-[14px] border border-[#F4C7C7] bg-[#FFF5F5] px-4 py-3 text-[13px] text-[#C24141]">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-[14px] border border-[#BFE3CB] bg-[#F2FBF5] px-4 py-3 text-[13px] text-[#23724A]">
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#D8E0EB] px-5 text-[14px] font-medium text-[#516074] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#C95B30] px-5 text-[14px] font-semibold text-white transition hover:bg-[#B85028] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export function BuyerSupplierReportAction({
  supplierName,
  reportedUserId,
  className = "",
}: BuyerSupplierReportActionProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeModal = () => {
    if (isPending) {
      return;
    }

    setIsReportModalOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    formRef.current?.reset();
  };

  const openModal = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsReportModalOpen(true);
  };

  const submitReport = (formData: FormData) => {
    if (!reportedUserId) {
      setErrorMessage("This supplier account cannot be reported right now.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      formData.set("reported_user_id", reportedUserId);

      try {
        await submitSupplierProfileReportAction(formData);
        setSuccessMessage("Your report has been submitted to the admin review queue.");
        formRef.current?.reset();

        window.setTimeout(() => {
          setIsReportModalOpen(false);
          setSuccessMessage(null);
        }, 1200);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "We couldn't submit your report."
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-2 rounded-xl border border-[#F2D4CA] bg-[#FFF7F3] px-4 py-3 text-[14px] font-medium text-[#B85028] transition hover:border-[#E7B9A8] hover:bg-[#FFF2EB] ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 9.25v4.5M12 17.5h.01M10.32 4.8 3.95 16.07a1.5 1.5 0 0 0 1.3 2.23h12.74a1.5 1.5 0 0 0 1.3-2.23L13.68 4.8a1.5 1.5 0 0 0-2.62 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Report supplier
      </button>

      <ReportSupplierModal
        open={isReportModalOpen}
        supplierName={supplierName}
        formRef={formRef}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClose={closeModal}
        onSubmit={submitReport}
      />
    </>
  );
}

export function BuyerSupplierProfileActions({
  supplierId,
}: BuyerSupplierProfileActionsProps) {
  return (
    <div className="flex shrink-0 items-start gap-3 pt-6 lg:pt-8">
      <Link
        href={`/buyer/messages?supplierId=${supplierId}`}
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#e4e9f1] bg-white px-6 text-[14px] font-medium text-[#8c97a7] transition hover:border-[#cfd8e6] hover:text-[#223654]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M7 17.25 3.75 20V6.75a2 2 0 0 1 2-2h12.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Message
      </Link>

      <button
        type="button"
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#e4e9f1] bg-white text-[#a2acbb] transition hover:border-[#cfd8e6] hover:text-[#223654]"
        aria-label="Save supplier"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M7.5 4.5h9a1.5 1.5 0 0 1 1.5 1.5v13.5L12 16.5l-6 3V6A1.5 1.5 0 0 1 7.5 4.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
