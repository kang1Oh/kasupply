"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PURCHASE_ORDER_RECEIPTS_BUCKET,
  buildPurchaseOrderReceiptPath,
} from "@/lib/purchase-orders/constants";

type ReceiptUploadFormClientProps = {
  poId: number;
  buyerId: number;
  mode: "first_upload" | "resubmit";
  reviewNotes?: string | null;
  currentFileName?: string | null;
  existingReceiptFilePath?: string | null;
};

function NotificationCard({
  tone,
  title,
  description,
  children,
}: {
  tone: "purple" | "red";
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const toneClasses = {
    purple: {
      container: "border-[#d4b6fa] bg-[#fbf7ff]",
      icon: "bg-[#6f35d4] text-white",
      title: "text-[#6f35d4]",
      description: "text-[#8c97a7]",
    },
    red: {
      container: "border-[#ffb8b1] bg-[#fff5f4]",
      icon: "bg-[#ff3b30] text-white",
      title: "text-[#da3b2f]",
      description: "text-[#8c97a7]",
    },
  }[tone];

  return (
    <section className={`rounded-[18px] border px-4 py-4 ${toneClasses.container}`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${toneClasses.icon}`}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path
              d="m5.5 10 2.5 2.5 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold ${toneClasses.title}`}>{title}</p>
          <p className={`mt-1 text-[13px] leading-5 ${toneClasses.description}`}>
            {description}
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function ReceiptUploadFormClient({
  poId,
  buyerId,
  mode,
  reviewNotes,
  currentFileName,
  existingReceiptFilePath,
}: ReceiptUploadFormClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError("Receipt file is required.");
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);

    if (!allowedTypes.has(selectedFile.type)) {
      setError("Please upload a PDF, JPG, JPEG, PNG, or WEBP receipt file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The receipt file must be 10MB or smaller.");
      return;
    }

    startTransition(async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Your session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const nextReceiptPath = buildPurchaseOrderReceiptPath(
        poId,
        selectedFile.name,
        user.id,
      );

      const { error: uploadError } = await supabase.storage
        .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
        .upload(nextReceiptPath, selectedFile, {
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        setError(uploadError.message || "Failed to upload receipt.");
        return;
      }

      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({
          receipt_file_url: nextReceiptPath,
          receipt_status: "pending_review",
          receipt_review_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("po_id", poId)
        .eq("buyer_id", buyerId);

      if (updateError) {
        await supabase.storage
          .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
          .remove([nextReceiptPath]);
        setError(updateError.message || "Failed to attach receipt to this order.");
        return;
      }

      if (existingReceiptFilePath && existingReceiptFilePath !== nextReceiptPath) {
        await supabase.storage
          .from(PURCHASE_ORDER_RECEIPTS_BUCKET)
          .remove([existingReceiptFilePath]);
      }

      router.refresh();
    });
  }

  return (
    <NotificationCard
      tone={mode === "resubmit" ? "red" : "purple"}
      title={
        mode === "resubmit"
          ? "Payment receipt was rejected. Please upload a clearer or valid receipt."
          : "Upload your payment receipt"
      }
      description={
        mode === "resubmit"
          ? "The supplier needs a legible receipt before the order can be completed."
          : "Once the order is delivered and payment is completed, upload the receipt so the supplier can verify the payment."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {reviewNotes ? (
          <div className="rounded-[12px] border border-[#ffd4d0] bg-white px-3 py-3 text-[13px] text-[#da3b2f]">
            Supplier notes: {reviewNotes}
          </div>
        ) : null}

        {currentFileName ? (
          <div className="rounded-[12px] border border-[#f1d7d4] bg-white px-3 py-3 text-[13px] text-[#8c97a7]">
            Previous upload: {currentFileName}
          </div>
        ) : null}

        <input
          type="file"
          name="receiptFile"
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
          required
          disabled={isPending}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-[12px] border border-[#d7dee8] bg-white px-3 py-3 text-sm text-[#223654] disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
        />

        {error ? (
          <p className="text-[13px] font-medium text-[#da3b2f]">{error}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[#9aa5b6]">
            PDF, JPG, PNG, or WEBP up to 10MB.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className={`inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
              mode === "resubmit"
                ? "bg-[#ff4d3d] hover:bg-[#eb3b2b]"
                : "bg-[#6f35d4] hover:bg-[#5f2abd]"
            }`}
          >
            {isPending
              ? "Uploading..."
              : mode === "resubmit"
                ? "Resubmit Receipt"
                : "Upload Receipt"}
          </button>
        </div>
      </form>
    </NotificationCard>
  );
}
