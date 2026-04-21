"use client";

import { useRouter } from "next/navigation";
import { ReviewSubmittedModal } from "@/components/modals";
import { ReviewForm } from "./review-form";

type ReviewPageClientProps = {
  poId: number;
  cancelHref: string;
  supplierProfileHref: string;
  ordersHref: string;
  reviewPageHref: string;
  showSubmittedModal: boolean;
  submitAction: (formData: FormData) => Promise<void>;
  defaultValues?: {
    overallRating?: number | null;
    productQualityRating?: number | null;
    deliveryRating?: number | null;
    communicationRating?: number | null;
    valueForMoneyRating?: number | null;
    reviewText?: string | null;
  };
};

export function ReviewPageClient({
  poId,
  cancelHref,
  supplierProfileHref,
  ordersHref,
  reviewPageHref,
  showSubmittedModal,
  submitAction,
  defaultValues,
}: ReviewPageClientProps) {
  const router = useRouter();

  return (
    <>
      <ReviewForm
        poId={poId}
        cancelHref={cancelHref}
        submitAction={submitAction}
        defaultValues={defaultValues}
      />

      <ReviewSubmittedModal
        open={showSubmittedModal}
        onClose={() => router.replace(reviewPageHref)}
        onViewSupplierProfile={() => router.push(supplierProfileHref)}
        onBackToOrders={() => router.push(ordersHref)}
      />
    </>
  );
}
