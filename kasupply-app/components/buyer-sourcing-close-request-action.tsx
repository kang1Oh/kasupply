"use client";

import { useRef, useState } from "react";
import { CloseRequestModal } from "@/components/modals";

type BuyerSourcingCloseRequestActionProps = {
  rfqId: number;
  requestTitle?: string | null;
  closeAction: (formData: FormData) => Promise<void>;
};

export function BuyerSourcingCloseRequestAction({
  rfqId,
  requestTitle,
  closeAction,
}: BuyerSourcingCloseRequestActionProps) {
  const closeFormRef = useRef<HTMLFormElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!closeFormRef.current) {
      return;
    }

    setIsSubmitting(true);
    closeFormRef.current.requestSubmit();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex h-[44px] w-full items-center justify-center rounded-[8px] border border-[#ff8f87] bg-white text-[15px] font-[500] text-[#ff5b4d] transition hover:bg-[#fff7f6]"
      >
        Close Request
      </button>

      <form ref={closeFormRef} action={closeAction} className="hidden">
        <input type="hidden" name="rfqId" value={rfqId} />
      </form>

      <CloseRequestModal
        open={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
          }
        }}
        onConfirm={handleConfirm}
        requestTitle={requestTitle}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
