"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderCompletedModal } from "@/components/modals";

type CompletedOrderActionsProps = {
  disputeHref: string;
  reviewHref: string;
  reviewSubmitted?: boolean;
};

export function CompletedOrderActions({
  disputeHref,
  reviewHref,
  reviewSubmitted = false,
}: CompletedOrderActionsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-[12px] pt-[2px]">
        <button
          type="button"
          disabled={reviewSubmitted}
          onClick={() => {
            if (reviewSubmitted) return;
            setIsModalOpen(true);
          }}
          className={
            reviewSubmitted
              ? "inline-flex h-[44px] min-w-[198px] items-center justify-center rounded-[12px] bg-[#b7c2d3] px-[20px] text-[15px] font-medium leading-none text-white"
              : "inline-flex h-[44px] min-w-[198px] items-center justify-center rounded-[12px] bg-[#27466f] px-[20px] text-[15px] font-medium leading-none text-white transition hover:bg-[#1f3958]"
          }
        >
          {reviewSubmitted ? "Review Submitted" : "Leave a Review"}
        </button>
      </div>

      <OrderCompletedModal
        open={isModalOpen && !reviewSubmitted}
        onClose={() => setIsModalOpen(false)}
        onMaybeLater={() => setIsModalOpen(false)}
        onLeaveReview={() => {
          setIsModalOpen(false);
          router.push(reviewHref);
        }}
      />
    </>
  );
}
