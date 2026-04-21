"use client";

import { useRef, useState } from "react";
import { CheckMarkModalIcon, ConfirmationModal } from "@/components/modals";

type DetailActionsProps = {
  poId: number;
  status: "confirmed" | "processing" | "shipped";
  updateStatusAction: (formData: FormData) => Promise<void>;
};

function CancelOrderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[42px] w-[42px] text-[#243F68]"
      fill="none"
      aria-hidden="true"
    >
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

export function PurchaseOrderDetailActions({
  poId,
  status,
  updateStatusAction,
}: DetailActionsProps) {
  const processingFormRef = useRef<HTMLFormElement | null>(null);
  const shippedFormRef = useRef<HTMLFormElement | null>(null);
  const completedFormRef = useRef<HTMLFormElement | null>(null);
  const cancelFormRef = useRef<HTMLFormElement | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [isShippedModalOpen, setIsShippedModalOpen] = useState(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"processing" | "shipped" | "completed" | "cancelled" | null>(null);

  const isProcessingPending = pendingAction === "processing";
  const isShippedPending = pendingAction === "shipped";
  const isCompletedPending = pendingAction === "completed";
  const isCancelPending = pendingAction === "cancelled";
  const isShippedState = status === "shipped";

  return (
    <>
      {isShippedState ? (
        <button
          type="button"
          onClick={() => setIsCompletedModalOpen(true)}
          className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
        >
          Mark as Completed
        </button>
      ) : (
        <div className="grid gap-[12px] md:grid-cols-2">
          {status === "confirmed" ? (
            <button
              type="button"
              onClick={() => setIsProcessingModalOpen(true)}
              className="flex h-[48px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
            >
              Mark as Processing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsShippedModalOpen(true)}
              className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1F436E] text-[14px] font-semibold text-white transition hover:bg-[#19385B]"
            >
              Mark as Shipped
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className={`flex w-full items-center justify-center rounded-[10px] border border-[#FF5B47] bg-white text-[14px] font-semibold text-[#FF5B47] transition hover:bg-[#FFF5F4] ${
              status === "confirmed" ? "h-[48px]" : "h-[44px]"
            }`}
          >
            Cancel Order
          </button>
        </div>
      )}

      {status === "confirmed" ? (
        <form ref={processingFormRef} action={updateStatusAction} className="hidden">
          <input type="hidden" name="po_id" value={poId} />
          <input type="hidden" name="status" value="processing" />
        </form>
      ) : null}

      {status === "processing" ? (
        <form ref={shippedFormRef} action={updateStatusAction} className="hidden">
          <input type="hidden" name="po_id" value={poId} />
          <input type="hidden" name="status" value="shipped" />
        </form>
      ) : null}

      {status === "shipped" ? (
        <form ref={completedFormRef} action={updateStatusAction} className="hidden">
          <input type="hidden" name="po_id" value={poId} />
          <input type="hidden" name="status" value="completed" />
        </form>
      ) : null}

      <form ref={cancelFormRef} action={updateStatusAction} className="hidden">
        <input type="hidden" name="po_id" value={poId} />
        <input type="hidden" name="status" value="cancelled" />
      </form>

      {status === "confirmed" ? (
        <ConfirmationModal
          open={isProcessingModalOpen}
          onClose={() => {
            if (!isProcessingPending) {
              setIsProcessingModalOpen(false);
            }
          }}
          onConfirm={() => {
            if (!processingFormRef.current) {
              return;
            }

            setPendingAction("processing");
            processingFormRef.current.requestSubmit();
          }}
          title="Mark as Processing"
          description="Are you sure you want to mark this purchase order as processing?"
          confirmText={isProcessingPending ? "Updating..." : "Confirm"}
          cancelText="Cancel"
          confirmVariant="primary"
          icon={<CheckMarkModalIcon size={42} />}
          isSubmitting={isProcessingPending}
        />
      ) : null}

      {status === "processing" ? (
        <ConfirmationModal
          open={isShippedModalOpen}
          onClose={() => {
            if (!isShippedPending) {
              setIsShippedModalOpen(false);
            }
          }}
          onConfirm={() => {
            if (!shippedFormRef.current) {
              return;
            }

            setPendingAction("shipped");
            shippedFormRef.current.requestSubmit();
          }}
          title="Mark as Shipped"
          description="Are you sure you want to mark this purchase order as shipped?"
          confirmText={isShippedPending ? "Updating..." : "Confirm"}
          cancelText="Cancel"
          confirmVariant="primary"
          icon={<CheckMarkModalIcon size={42} />}
          isSubmitting={isShippedPending}
        />
      ) : null}

      {status === "shipped" ? (
        <ConfirmationModal
          open={isCompletedModalOpen}
          onClose={() => {
            if (!isCompletedPending) {
              setIsCompletedModalOpen(false);
            }
          }}
          onConfirm={() => {
            if (!completedFormRef.current) {
              return;
            }

            setPendingAction("completed");
            completedFormRef.current.requestSubmit();
          }}
          title="Mark as Completed"
          description="Are you sure you want to mark this purchase order as completed?"
          confirmText={isCompletedPending ? "Updating..." : "Confirm"}
          cancelText="Cancel"
          confirmVariant="primary"
          icon={<CheckMarkModalIcon size={42} />}
          isSubmitting={isCompletedPending}
        />
      ) : null}

      <ConfirmationModal
        open={isCancelModalOpen}
        onClose={() => {
          if (!isCancelPending) {
            setIsCancelModalOpen(false);
          }
        }}
        onConfirm={() => {
          if (!cancelFormRef.current) {
            return;
          }

          setPendingAction("cancelled");
          cancelFormRef.current.requestSubmit();
        }}
        title="Cancel Order"
        description="Are you sure you want to cancel this purchase order? This action cannot be undone."
        confirmText={isCancelPending ? "Cancelling..." : "Cancel Order"}
        cancelText="Keep Order"
        confirmVariant="destructive"
        icon={<CancelOrderIcon />}
        isSubmitting={isCancelPending}
      />
    </>
  );
}
