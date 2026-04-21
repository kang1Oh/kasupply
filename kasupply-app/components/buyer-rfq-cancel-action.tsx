"use client";

import { useRef, useState, useTransition } from "react";
import { cancelRFQ } from "@/app/buyer/(protected)/rfqs/[rfqId]/actions";
import { CancelRfqModal } from "@/components/modals";

type BuyerRfqCancelActionProps = {
  rfqId: number;
  label?: string;
  className?: string;
};

export function BuyerRfqCancelAction({
  rfqId,
  label = "Cancel RFQ",
  className = "",
}: BuyerRfqCancelActionProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    if (!isPending) {
      setIsCancelModalOpen(false);
    }
  };

  const handleConfirm = () => {
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  };

  return (
    <>
      <form ref={formRef} action={cancelRFQ} className="hidden">
        <input type="hidden" name="rfqId" value={rfqId} />
      </form>

      <button
        type="button"
        onClick={() => setIsCancelModalOpen(true)}
        disabled={isPending}
        className={className}
      >
        {label}
      </button>

      <CancelRfqModal
        open={isCancelModalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isSubmitting={isPending}
      />
    </>
  );
}
