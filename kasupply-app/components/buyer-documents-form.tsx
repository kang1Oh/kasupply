"use client";

import { AccountActivatedModal } from "@/components/modals";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  processBuyerDocumentVerification,
  uploadBuyerDocument,
} from "@/app/onboarding/buyer-documents/actions";

type DocumentStatus = null | "pending" | "processing" | "approved" | "rejected";

function normalizeDocumentStatus(value: string | null | undefined): DocumentStatus {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "approved" ||
    normalized === "rejected"
  ) {
    return normalized;
  }

  return null;
}

function getStoredFileName(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return "";
  }

  const segments = fileUrl.split("/");
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

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
          active ? "bg-[#1f3d67] text-white" : "bg-[#e8ecf2] text-[#9aa5b4]"
        }`}
      >
        {number}
      </div>
      <span
        className={`truncate text-[15px] font-medium ${
          active ? "text-[#1f3d67]" : "text-[#9aa5b4]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-10 w-10 text-[#b1b8c4]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V8" />
      <path d="M9 11l3-3 3 3" />
      <path d="M20 16.5a4.5 4.5 0 0 0-1.3-8.8A6 6 0 0 0 6 9a4 4 0 0 0 0 8h14z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-[#223654]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5 animate-spin text-[#1f3d67]"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-[#16a34a]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="mt-0.5 h-6 w-6 shrink-0 text-[#ea580c]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function DashCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className=" h-6 w-6 shrink-0 text-[#ffc700]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15 12-6 0" />
    </svg>
  );
}

function DocumentStatusMessage({
  status,
  message,
}: {
  status: DocumentStatus;
  message: string;
}) {
  if (!status || !message) {
    return null;
  }

  if (status === "processing") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#c7d3e8] bg-[#eef2f9] px-4 py-3">
        <SpinnerIcon />
        <p className="text-[14px] text-[#1f3d67]">{message}</p>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
        <CheckCircleIcon />
        <p className="text-[14px] text-[#15803d]">{message}</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-4 py-3">
        <XCircleIcon />
        <p className="text-[14px] text-[#c2410c]">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#ffc700] bg-[#fff9e9] px-4 py-3">
      <DashCircleIcon />
      <p className="text-[14px] text-[#ce8900]">{message}</p>
    </div>
  );
}

export function BuyerDocumentsForm({
  nextPath,
  requiredFlow,
  currentDocument,
  mode = "onboarding",
  backHref,
}: {
  nextPath?: string | null;
  requiredFlow?: string | null;
  currentDocument?: {
    fileUrl: string | null;
    status: string | null;
    reviewNotes: string | null;
  } | null;
  mode?: "onboarding" | "edit";
  backHref?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadedPreviewFileName, setUploadedPreviewFileName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [statusOverride, setStatusOverride] = useState<DocumentStatus>(
    normalizeDocumentStatus(currentDocument?.status)
  );
  const [showActivatedModal, setShowActivatedModal] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStatusOverride(normalizeDocumentStatus(currentDocument?.status));
  }, [currentDocument?.status]);

  const status = statusOverride;
  const reviewNotes = currentDocument?.reviewNotes ?? "";
  const storedFileName = getStoredFileName(currentDocument?.fileUrl);
  const previewFileName = selectedFileName || uploadedPreviewFileName || storedFileName;
  const hasUploadedDocument = Boolean(status || currentDocument?.fileUrl || previewFileName);
  const canVerify = hasUploadedDocument && status !== "approved" && !isPending;
  const isStep3Active = status === "approved";
  const isEditMode = mode === "edit";

  const resolvedBackHref =
    backHref === undefined
      ? nextPath
        ? `/onboarding/buyer/categories?next=${encodeURIComponent(nextPath)}${
            requiredFlow ? `&required=${encodeURIComponent(requiredFlow)}` : ""
          }`
        : "/onboarding/buyer/categories"
      : backHref;

  const finishHref = useMemo(() => {
    if (nextPath) {
      return nextPath;
    }

    return "/buyer";
  }, [nextPath]);

  const headingTitle = isEditMode
    ? ""
    : "Verification Requirement";
  const headingDescription = isEditMode
    ? ""
    : "KaSupply requires verification to maintain a trusted buyer network";

  const filePickerButtonLabel = previewFileName ? "Change File" : "Browse File";
  const fileHelperText =
    selectedFileName
      ? "Ready to upload"
      : status === "approved"
      ? "Approved"
      : hasUploadedDocument
        ? "Uploaded and ready for verification"
        : "Choose a file to upload";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setSelectedFileName(file?.name ?? "");
    setError("");
    setFeedbackMessage("");
  };

  const handleUploadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please choose a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("next_path", nextPath ?? "");
    formData.append("required_flow", requiredFlow ?? "");

    setError("");
    setFeedbackMessage("");

    startTransition(async () => {
      try {
        const result = await uploadBuyerDocument(formData);

        setStatusOverride(normalizeDocumentStatus(result.status));
        setUploadedPreviewFileName(selectedFile.name);
        setFeedbackMessage(result.message);
        setSelectedFile(null);
        setSelectedFileName("");

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  };

  const handleVerifyClick = () => {
    setError("");
    setFeedbackMessage("");
    setStatusOverride("processing");

    startTransition(async () => {
      try {
        const result = await processBuyerDocumentVerification();
        const normalized = normalizeDocumentStatus(result.status);

        setStatusOverride(normalized);
        setFeedbackMessage(result.message);
        router.refresh();
      } catch (err) {
        setStatusOverride(normalizeDocumentStatus(currentDocument?.status));
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
              {headingTitle}
            </h1>
            <p className="mt-0.5 text-[18px] leading-6 text-[#8b95a5]">
              {headingDescription}
            </p>
          </div>
          {isEditMode ? null : (
            <p className="text-[16px] font-semibold text-[#223654]">
              {isStep3Active ? "Step 3 of 3" : "Step 2 of 3"}
            </p>
          )}
        </div>

        {isEditMode ? null : (
          <div className="mb-5 mt-5 flex items-center gap-3">
            <StepIndicator number={1} label="Profile Setup" active />
            <div className="h-px flex-1 bg-[#d7dee8]" />
            <StepIndicator number={2} label="Verification" active />
            <div className="h-px flex-1 bg-[#d7dee8]" />
            <StepIndicator number={3} label="User Verified" active={isStep3Active} />
          </div>
        )}

        <div className="rounded-[12px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="m-0 text-[18px] font-semibold leading-[21px] text-[#1f3d67]">
              Upload DTI Business Registration Certificate
            </h2>
            <p className="m-0 text-[16px] leading-[25px] text-[#8b95a5]">
              Ensure your document is clear, fully readable, and ready before clicking
              Verify Document.
            </p>
            {status ? (
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    status === "approved"
                      ? "bg-[#ecfdf3] text-[#15803d]"
                      : status === "rejected"
                        ? "bg-[#fef2f2] text-[#dc2626]"
                        : status === "processing"
                          ? "bg-[#eef2f9] text-[#1f3d67]"
                          : "bg-[#fff7ed] text-[#c2410c]"
                  }`}
                >
                  {status}
                </span>
              </p>
            ) : null}
            {reviewNotes ? (
              isEditMode ? (
                <p className="mt-2 text-sm text-[#475569]"></p>
              ) : (
                <p className="mt-2 text-sm text-[#475569]">
                  {reviewNotes}
                </p>
              )
            ) : null}
          </div>

          <form
            className="rounded-[12px] border border-dashed border-[#d7dee8] px-5 py-10 text-center"
            onSubmit={handleUploadSubmit}
          >
            <div className="flex flex-col items-center">
              <UploadCloudIcon />
              <p className="mt-4 text-[16px] font-semibold text-[#223654]">
                Choose a file or drag &amp; drop it here
              </p>
              <p className="mt-2 text-sm text-[#9aa5b4]">
                JPG, JPEG, or PNG formats, up to 10MB
              </p>
              <p className="mt-1 text-xs text-[#7f8897]">
                Upload first. You can replace the file any time before you click Verify
                Document.
              </p>

              {previewFileName ? (
                <div className="mt-4 flex w-full max-w-md items-center justify-between rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-4 py-3 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileIcon />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#223654]">
                        {previewFileName}
                      </p>
                      <p className="text-xs text-[#8b95a5]">{fileHelperText}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <input
                ref={inputRef}
                id="buyer-document"
                name="document"
                type="file"
                accept=".jpg,.jpeg,.png"
                className="sr-only"
                onChange={handleFileChange}
              />

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isPending}
                  className={`rounded-lg border border-[#d7dee8] px-4 py-2 text-[14px] font-medium text-[#223654] transition ${
                    isPending ? "cursor-not-allowed opacity-50" : "hover:bg-[#f8fafc]"
                  }`}
                >
                  {filePickerButtonLabel}
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isPending}
                  className="rounded-lg bg-[#294773] px-5 py-2 text-[14px] font-medium text-white transition hover:bg-[#20395d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <DocumentStatusMessage
        status={status}
        message={
          feedbackMessage ||
          (status === "approved"
            ? "Your DTI Business Registration Certificate has been validated." + (isEditMode ? "" : "You can proceed to finish onboarding.")
            : "")
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3">
        {resolvedBackHref ? (
          <Link
            href={resolvedBackHref}
            className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
          >
            {isEditMode ? "Back to Account" : "Back"}
          </Link>
        ) : null}

        {status === "approved" && !isEditMode ? (
          <button
            type="button"
            onClick={() => setShowActivatedModal(true)}
            className="rounded-md bg-[#1f3d67] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193354]"
          >
            Finish
          </button>
        ) : status !== "approved" ? (
          <button
            type="button"
            onClick={handleVerifyClick}
            disabled={!canVerify}
            className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
              canVerify ? "bg-[#1f3d67] hover:bg-[#193354]" : "bg-[#c3ccd9]"
            }`}
          >
            {isPending && status === "processing" ? "Verifying..." : "Verify Document"}
          </button>
        ) : null}
      </div>

      <AccountActivatedModal
        isOpen={showActivatedModal}
        ctaHref={finishHref}
      />
    </div>
  );
}
