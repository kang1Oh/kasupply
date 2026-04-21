"use client";

import { useState } from "react";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  formatReceiptFileSizeLimit,
} from "@/lib/purchase-orders/constants";

type ReceiptUploadDetailPanelProps = {
  poId: number;
  mode: "first_upload" | "resubmit";
  currentFileName?: string | null;
  reviewNotes?: string | null;
  submitAction: (formData: FormData) => Promise<void>;
  redirectStep?: string;
};

const ACCEPTED_TYPES_TEXT = "PDF, JPG, JPEG, PNG, or WEBP";

export function ReceiptUploadDetailPanel({
  poId,
  mode,
  currentFileName,
  reviewNotes,
  submitAction,
  redirectStep = "upload-receipt",
}: ReceiptUploadDetailPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRejected = mode === "resubmit";
  const displayedFileName = selectedFile?.name || currentFileName || "No file selected";

  function validateFile(file: File) {
    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      return `Upload a valid receipt file (${ACCEPTED_TYPES_TEXT}).`;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      return `Receipt file must be ${formatReceiptFileSizeLimit()} or smaller.`;
    }

    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setSelectedFile(null);
      setErrorMessage(null);
      return;
    }

    const validationError = validateFile(nextFile);
    if (validationError) {
      setSelectedFile(null);
      setErrorMessage(validationError);
      event.currentTarget.value = "";
      return;
    }

    setSelectedFile(nextFile);
    setErrorMessage(null);
  }

  return (
    <section
      className={`overflow-hidden rounded-[14px] border bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02)] ${
        isRejected ? "border-[#ffb8b1]" : "border-[#eceef2]"
      }`}
    >
      <div className="border-b border-[#f0f2f5] px-[16px] py-[12px]">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-semibold uppercase leading-none text-[#27456f]">
            Upload Receipt
          </h2>
          <span className="inline-flex h-[18px] items-center rounded-full bg-[#ffe6e3] px-[8px] text-[10px] font-semibold leading-none text-[#ff5a47]">
            Required
          </span>
        </div>
        <p className="mt-[10px] text-[15px] font-semibold leading-[1.35] text-[#223654]">
          Upload payment receipt after delivery to confirm completion
        </p>
        <p className="mt-[4px] text-[12px] leading-[1.4] text-[#a3adbc]">
          JPG or PNG, maximum file size: 5MB
        </p>
      </div>

      <div className="px-[16px] py-[16px]">
        {isRejected ? (
          <div className="rounded-[12px] border border-[#ffd1cb] bg-[#fff6f5] px-[12px] py-[10px]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-[10px]">
                <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#ff5a47] text-white">
                  <svg viewBox="0 0 16 16" className="h-[10px] w-[10px]" aria-hidden="true">
                    <path
                      d="M8 4.5v4m0 2.5h.01"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-[1.35] text-[#223654]">
                    Payment receipt was rejected. Please upload a clearer or valid receipt.
                  </p>
                  {reviewNotes ? (
                    <p className="mt-[4px] text-[12px] leading-[1.45] text-[#d55549]">
                      {reviewNotes}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="inline-flex h-[20px] shrink-0 items-center rounded-full border border-[#ffb8b1] bg-white px-[8px] text-[10px] font-semibold leading-none text-[#ff5a47]">
                Failed
              </span>
            </div>
          </div>
        ) : null}

        <form action={submitAction} className="mt-[14px] space-y-[10px]">
          <input type="hidden" name="poId" value={poId} />
          <input type="hidden" name="redirectStep" value={redirectStep} />

          <div className="flex flex-col gap-[10px] md:flex-row md:items-center">
            <label className="inline-flex h-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#dbe3ef] bg-[#f8fafc] px-[14px] text-[12px] font-medium text-[#526176] transition hover:border-[#c7d3e4]">
              Choose file
              <input
                type="file"
                name="receiptFile"
                accept={ACCEPTED_RECEIPT_TYPES.join(",")}
                className="sr-only"
                required
                onChange={handleFileChange}
              />
            </label>

            <div
              className={`flex h-[38px] min-w-0 flex-1 items-center rounded-[8px] border px-[12px] text-[12px] ${
                isRejected
                  ? "border-[#ffb8b1] bg-[#fffafb] text-[#5f6d81]"
                  : "border-[#dbe3ef] bg-white text-[#5f6d81]"
              }`}
            >
              <span className="truncate">{displayedFileName}</span>
            </div>

            <button
              type="submit"
              className={`inline-flex h-[38px] shrink-0 items-center justify-center rounded-[8px] px-[16px] text-[12px] font-semibold text-white transition ${
                isRejected
                  ? "bg-[#ff5a47] hover:bg-[#ef4638]"
                  : "bg-[#27466f] hover:bg-[#1f3958]"
              }`}
            >
              {isRejected ? "Resubmit" : "Upload"}
            </button>
          </div>

          {errorMessage ? (
            <p className="text-[12px] font-medium text-[#ff5a47]">{errorMessage}</p>
          ) : isRejected ? (
            <p className="flex items-center gap-[6px] text-[12px] font-medium text-[#ff5a47]">
              <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full border border-current text-[9px] leading-none">
                !
              </span>
              Receipt was rejected
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
