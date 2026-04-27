"use client";

import { useRef, useState } from "react";
import { DeclineQuoteModal } from "@/components/modals";

type BuyerRfqDeclineQuoteActionProps = {
  rfqId: number;
  engagementId: number;
  quoteId: number;
  supplierName: string;
  declineAction: (formData: FormData) => Promise<void>;
};

export function BuyerRfqDeclineQuoteAction({
  rfqId,
  engagementId,
  quoteId,
  supplierName,
  declineAction,
}: BuyerRfqDeclineQuoteActionProps) {
  const declineFormRef = useRef<HTMLFormElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!declineFormRef.current) {
      return;
    }

    setIsSubmitting(true);
    declineFormRef.current.requestSubmit();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex h-[44px] w-full items-center justify-center rounded-[6px] border border-[#ff6a5f] bg-white text-[14px] font-medium text-[#ff5549] transition hover:bg-[#fff8f7]"
      >
        Decline
      </button>

      <form ref={declineFormRef} action={declineAction} className="hidden">
        <input type="hidden" name="rfqId" value={rfqId} />
        <input type="hidden" name="engagementId" value={engagementId} />
        <input type="hidden" name="quoteId" value={quoteId} />
      </form>

      <DeclineQuoteModal
        open={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
          }
        }}
        onConfirm={handleConfirm}
        supplierName={supplierName}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
