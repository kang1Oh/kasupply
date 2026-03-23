"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { uploadBuyerDocument } from "@/app/onboarding/buyer-documents/actions";

function StepIndicator({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          active ? "bg-[#1f3d67] text-white" : "bg-[#e5e7eb] text-[#b8bec8]"
        }`}
      >
        {number}
      </div>
      <span
        className={`truncate text-sm font-medium ${
          active ? "text-[#1f3d67]" : "text-[#c7ccd5]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12 text-[#b1b8c4]" aria-hidden="true">
      <path
        d="M8 18a4 4 0 0 1-.35-7.98A5.5 5.5 0 0 1 18.2 8.8 3.7 3.7 0 1 1 18 18H8Zm4-8v6m0-6-2.5 2.5M12 10l2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BuyerDocumentsForm({
  nextPath,
  requiredFlow,
}: {
  nextPath?: string | null;
  requiredFlow?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const backHref = nextPath
    ? `/onboarding/buyer/categories?next=${encodeURIComponent(nextPath)}${
        requiredFlow ? `&required=${encodeURIComponent(requiredFlow)}` : ""
      }`
    : "/onboarding/buyer/categories";

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await uploadBuyerDocument(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
      <input type="hidden" name="next_path" value={nextPath ?? ""} />
      <input type="hidden" name="required_flow" value={requiredFlow ?? ""} />

      <section className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-[#223654]">
                Verification Requirement
              </h1>
              <p className="mt-1 text-sm text-[#8b95a5]">
                KaSupply requires verification to maintain a trusted buyer network
              </p>
            </div>
            <p className="text-sm font-semibold text-[#223654]">Step 2 of 3</p>
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator number={1} label="Profile Setup" active />
            <div className="h-px flex-1 bg-[#1f3d67]" />
            <StepIndicator number={2} label="Verification" active />
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <StepIndicator number={3} label="User Verified" />
          </div>

          <div className="rounded-[14px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-[18px] font-semibold text-[#223654]">
                Upload DTI Business Registration Certificate
              </h2>
              <p className="text-sm text-[#9aa5b4]">
                Ensure your document is clear and fully readable
              </p>
            </div>

            <div className="rounded-[14px] border border-dashed border-[#35557f] px-5 py-10 text-center">
              <div className="flex flex-col items-center">
                <UploadCloudIcon />
                <p className="mt-4 text-[16px] font-semibold text-[#223654]">
                  Choose a file or drag &amp; drop it here
                </p>
                <p className="mt-2 text-sm text-[#9aa5b4]">
                  PDF, JPG, JPEG, PNG, DOC, DOCX formats, up to 10MB
                </p>

                {selectedFileName ? (
                  <p className="mt-3 text-sm font-medium text-[#223654]">
                    Selected: {selectedFileName}
                  </p>
                ) : null}

                <input
                  ref={inputRef}
                  id="buyer-document"
                  name="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFileName(file?.name ?? "");
                  }}
                />

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-5 rounded-md border border-[#35557f] px-5 py-2 text-sm font-medium text-[#223654] transition hover:bg-[#f8fafc]"
                >
                  Browse File
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-4">
        <Link href={backHref} className="text-sm font-medium text-[#aab3c2]">
          Back
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Uploading..." : "Finish"}
        </button>
      </div>
    </form>
  );
}
