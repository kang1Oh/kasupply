"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderCompletedModal } from "@/components/modals";

type CompletedOrderActionsProps = {
  disputeHref: string;
  reviewHref: string;
};

export function CompletedOrderActions({
  disputeHref,
  reviewHref,
}: CompletedOrderActionsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-[12px] pt-[2px]">
        <Link
          href={disputeHref}
          className="inline-flex h-[38px] items-center justify-center px-[6px] text-[13px] font-semibold text-[#ff5a47] transition hover:text-[#ef4638]"
        >
          Raise Dispute
        </Link>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-[38px] min-w-[132px] items-center justify-center rounded-[8px] bg-[#27466f] px-[18px] text-[13px] font-semibold text-white transition hover:bg-[#1f3958]"
        >
          Mark as Completed
        </button>
      </div>

      <OrderCompletedModal
        open={isModalOpen}
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
