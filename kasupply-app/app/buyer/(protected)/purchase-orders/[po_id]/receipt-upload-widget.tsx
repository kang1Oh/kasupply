"use client";

import { useState } from "react";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  formatReceiptFileSizeLimit,
} from "@/lib/purchase-orders/constants";

type ReceiptUploadWidgetProps = {
  poId: number;
  mode: "first_upload" | "resubmit";
  existingReceiptFilePath: string | null;
  currentFileName?: string | null;
  reviewNotes?: string | null;
  submitAction: (formData: FormData) => Promise<void>;
};

const ACCEPTED_TYPES_TEXT = "PNG, JPG, JPEG, or PDF";

export function ReceiptUploadWidget({
  poId,
  mode,
  existingReceiptFilePath,
  currentFileName,
  reviewNotes,
  submitAction,
}: ReceiptUploadWidgetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileLabel = file?.name || currentFileName || "Choose receipt file";
  const submitLabel = mode === "resubmit" ? "Upload New Receipt" : "Upload Receipt";

  function validateFile(selectedFile: File): string | null {
    if (!ACCEPTED_RECEIPT_TYPES.includes(selectedFile.type)) {
      return `Upload a valid receipt file (${ACCEPTED_TYPES_TEXT}).`;
    }

    if (selectedFile.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      return `Receipt file must be ${formatReceiptFileSizeLimit()} or smaller.`;
    }

    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      setErrorMessage(null);
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setFile(null);
      setErrorMessage(validationError);
      event.currentTarget.value = "";
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
  }

  return (
    <form className="space-y-3" action={submitAction}>
      <input type="hidden" name="poId" value={poId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-[#D5DFF0] bg-white px-4 py-3 text-sm font-medium text-[#24446A] transition hover:border-[#9FB4D9]">
          <span>{fileLabel}</span>
          <input
            name="receiptFile"
            accept={ACCEPTED_RECEIPT_TYPES.join(",")}
            className="sr-only"
            onChange={handleFileChange}
            type="file"
            required
          />
        </label>
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#27466F] px-5 text-sm font-semibold text-white transition hover:bg-[#1f3958] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
      <p className="text-xs text-[#8FA0B8]">
        Accepted files: {ACCEPTED_TYPES_TEXT}. Max size {formatReceiptFileSizeLimit()}.
      </p>
      {reviewNotes ? (
        <p className="rounded-xl border border-[#FDE6B3] bg-[#FFF8E5] px-3 py-2 text-sm text-[#A06A00]">
          {reviewNotes}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-xl border border-[#F3B3B1] bg-[#FFF1F0] px-3 py-2 text-sm text-[#C94842]">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
