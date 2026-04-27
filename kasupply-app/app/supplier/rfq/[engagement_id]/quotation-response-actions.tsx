"use client";

import { useRef, useState } from "react";
import { CheckMarkModalIcon, ConfirmationModal } from "@/components/modals";

type QuotationResponseActionsProps = {
  engagementId: number;
  returnTo: string;
  declineAction: (formData: FormData) => Promise<void>;
};

function DeclineQuotationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[42px] w-[42px] text-[#243F68]" fill="none" aria-hidden="true">
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
    </svg>
  );
}

export function QuotationResponseActions({
  engagementId,
  returnTo,
  declineAction,
}: QuotationResponseActionsProps) {
  const declineFormRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"submit" | "decline" | null>(null);

  const handleSubmitOpen = () => {
    const quotationForm = document.getElementById("quotation-form");

    if (!(quotationForm instanceof HTMLFormElement)) {
      return;
    }

    if (!quotationForm.reportValidity()) {
      return;
    }

    setIsSubmitModalOpen(true);
  };

  const handleSubmitConfirm = () => {
    const quotationForm = document.getElementById("quotation-form");

    if (!(quotationForm instanceof HTMLFormElement)) {
      return;
    }

    if (!quotationForm.reportValidity()) {
      setIsSubmitModalOpen(false);
      return;
    }

    setPendingAction("submit");
    quotationForm.requestSubmit();
  };

  const handleDeclineConfirm = () => {
    if (!declineFormRef.current) {
      return;
    }

    setPendingAction("decline");
    declineFormRef.current.requestSubmit();
  };

  const isSubmitPending = pendingAction === "submit";
  const isDeclinePending = pendingAction === "decline";

  return (
    <>
      <div className="mt-[18px] flex flex-wrap items-center gap-[10px]">
        <button
          type="button"
          onClick={handleSubmitOpen}
          className="inline-flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#1E3A5F] px-[20px] text-[13px] font-medium text-white sm:min-w-[260px]"
        >
          Submit Quotation
        </button>

        <button
          type="button"
          onClick={() => setIsDeclineModalOpen(true)}
          className="inline-flex h-[44px] min-w-[122px] items-center justify-center rounded-[10px] border border-[#FE1601] bg-white px-[18px] text-[13px] font-medium text-[#FE1601]"
        >
          Decline
        </button>
      </div>

      <form ref={declineFormRef} action={declineAction} className="hidden">
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="return_to" value={returnTo} />
      </form>

      <ConfirmationModal
        open={isSubmitModalOpen}
        onClose={() => {
          if (!isSubmitPending) {
            setIsSubmitModalOpen(false);
          }
        }}
        onConfirm={handleSubmitConfirm}
        title="Submit Quotation"
        description="Are you sure you want to submit this quotation to the buyer?"
        confirmText={isSubmitPending ? "Submitting..." : "Submit Quotation"}
        confirmVariant="primary"
        icon={<CheckMarkModalIcon size={42} />}
        isSubmitting={isSubmitPending}
      />

      <ConfirmationModal
        open={isDeclineModalOpen}
        onClose={() => {
          if (!isDeclinePending) {
            setIsDeclineModalOpen(false);
          }
        }}
        onConfirm={handleDeclineConfirm}
        title="Decline Quotation"
        description="Are you sure you want to decline this quotation request?"
        confirmText={isDeclinePending ? "Declining..." : "Decline Quotation"}
        confirmVariant="destructive"
        icon={<DeclineQuotationIcon />}
        isSubmitting={isDeclinePending}
      />
    </>
  );
}
