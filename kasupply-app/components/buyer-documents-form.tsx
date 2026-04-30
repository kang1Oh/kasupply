"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { uploadBuyerDocument } from "@/app/onboarding/buyer-documents/actions";

type DocumentStatus = null | "validating" | "success" | "review_required";

const BUYER_DOCUMENT_STATUS_STORAGE_KEY = "buyerDocumentStatus";
const BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY = "buyerDocumentFileName";

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

function getRedirectUrlFromError(err: unknown) {
  const digest =
    err && typeof err === "object" && "digest" in err
      ? String((err as { digest?: unknown }).digest ?? "")
      : "";

  if (!digest.startsWith("NEXT_REDIRECT")) {
    return "";
  }

  const parts = digest.split(";");
  const redirectUrl = parts.slice(2, -2).join(";");

  if (redirectUrl) {
    return redirectUrl;
  }

  return (
    parts.find((part) => part.startsWith("/") || part.startsWith("http")) ?? ""
  );
}

function getRedirectResult(err: unknown) {
  const redirectUrl = getRedirectUrlFromError(err);

  if (!redirectUrl) {
    return "";
  }

  try {
    const url = redirectUrl.startsWith("http")
      ? new URL(redirectUrl)
      : new URL(redirectUrl, window.location.origin);

    const result = url.searchParams.get("result");

    if (result) {
      return result;
    }

    return url.searchParams.get("activated") === "1" ? "approved" : "";
  } catch {
    return "";
  }
}

function isNextRedirectError(err: unknown) {
  const digest =
    err && typeof err === "object" && "digest" in err
      ? String((err as { digest?: unknown }).digest ?? "")
      : "";

  return (
    (err instanceof Error && err.message === "NEXT_REDIRECT") ||
    digest.startsWith("NEXT_REDIRECT")
  );
}

function DocumentStatusMessage({ status }: { status: DocumentStatus }) {
  if (!status) {
    return null;
  }

  if (status === "validating") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#c7d3e8] bg-[#eef2f9] px-4 py-3">
        <SpinnerIcon />
        <p className="text-[14px] text-[#1f3d67]">
          Validating your document...
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
        <CheckCircleIcon />
        <p className="text-[14px] text-[#15803d]">
          Your DTI Business Registration Certificate has been validated. You can
          proceed to review your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-4 py-3">
      <XCircleIcon />
      <p className="text-[14px] text-[#c2410c]">
        Your document was flagged by our system. Ensure it&apos;s captured
        clearly, legibly, and free of obstructions. If it still fails, make sure
        your sign-up details match your document.
      </p>
    </div>
  );
}

export function BuyerDocumentsForm({
  nextPath,
  requiredFlow,
}: {
  nextPath?: string | null;
  requiredFlow?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [status, setStatus] = useState<DocumentStatus>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const backHref = nextPath
    ? `/onboarding/buyer/categories?next=${encodeURIComponent(nextPath)}${
        requiredFlow ? `&required=${encodeURIComponent(requiredFlow)}` : ""
      }`
    : "/onboarding/buyer/categories";

  const buildActivatedHref = () => {
    const query = new URLSearchParams();

    query.set("activated", "1");
    query.set("result", "approved");

    if (nextPath) {
      query.set("next", nextPath);
    }

    if (requiredFlow) {
      query.set("required", requiredFlow);
    }

    return `/onboarding/buyer-documents?${query.toString()}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activated = params.get("activated");
    const result = params.get("result");
    const storedStatus = window.sessionStorage.getItem(
      BUYER_DOCUMENT_STATUS_STORAGE_KEY,
    );
    const storedFileName =
      window.sessionStorage.getItem(BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY) ?? "";

    setSelectedFile(null);

    if (activated === "1" && result === "approved") {
      setStatus("success");
      setIsFinalized(true);
      setSelectedFileName(storedFileName);
      return;
    }

    if (result === "approved" || storedStatus === "approved") {
      setStatus("success");
      setIsFinalized(false);
      setSelectedFileName(storedFileName);
      return;
    }

    if (result === "review_required" || storedStatus === "review_required") {
      setStatus("review_required");
      setIsFinalized(false);
      setSelectedFileName(storedFileName);
      return;
    }

    setStatus(null);
    setIsFinalized(false);
    setSelectedFileName("");
    window.sessionStorage.removeItem(BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY);
    window.sessionStorage.removeItem(BUYER_DOCUMENT_STATUS_STORAGE_KEY);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const runDocumentVerification = (formData: FormData) => {
    startTransition(async () => {
      try {
        await uploadBuyerDocument(formData);
      } catch (err) {
        if (isNextRedirectError(err)) {
          const result = getRedirectResult(err);

          if (result === "approved") {
            window.sessionStorage.setItem(
              BUYER_DOCUMENT_STATUS_STORAGE_KEY,
              "approved",
            );
            setStatus("success");
            setIsFinalized(false);
            setError("");
            return;
          }

          window.sessionStorage.setItem(
            BUYER_DOCUMENT_STATUS_STORAGE_KEY,
            "review_required",
          );
          setStatus("review_required");
          setIsFinalized(false);
          setError("");
          return;
        }

        setStatus(null);
        setIsFinalized(false);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setSelectedFileName(file?.name ?? "");
    setError("");
    setStatus(null);
    setIsFinalized(false);

    if (file) {
      window.sessionStorage.setItem(
        BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY,
        file.name,
      );
      window.sessionStorage.removeItem(BUYER_DOCUMENT_STATUS_STORAGE_KEY);
    } else {
      window.sessionStorage.removeItem(BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY);
      window.sessionStorage.removeItem(BUYER_DOCUMENT_STATUS_STORAGE_KEY);
    }
  };

  const handleUploadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === "success") {
      return;
    }

    if (!selectedFile) {
      setError("Please choose a file before uploading.");
      return;
    }

    setError("");

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("next_path", nextPath ?? "");
    formData.append("required_flow", requiredFlow ?? "");

    flushSync(() => {
      setStatus("validating");
    });

    runDocumentVerification(formData);
  };

  const handleResubmit = () => {
    setStatus(null);
    setIsFinalized(false);
    setSelectedFile(null);
    setSelectedFileName("");
    setError("");
    window.sessionStorage.removeItem(BUYER_DOCUMENT_FILE_NAME_STORAGE_KEY);
    window.sessionStorage.removeItem(BUYER_DOCUMENT_STATUS_STORAGE_KEY);

    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleFinish = () => {
    setIsFinalized(true);
    router.push(buildActivatedHref());
  };

  const isStep3Active = isFinalized;
  const filePickerButtonLabel =
    status === "review_required"
      ? "Upload New File"
      : selectedFileName
        ? "Change File"
        : "Browse File";
  const filePickerButtonDisabled =
    status === "validating" || status === "success";
  const mainActionDisabled =
    status !== "success" &&
    (!selectedFile || status === "validating" || status === "review_required");
  const fileHelperText =
    status === "success"
      ? "Validated"
      : status === "review_required"
        ? "Upload a clearer file"
        : "Ready to upload";

  return (
    <form className="space-y-4" onSubmit={handleUploadSubmit}>
      <input type="hidden" name="next_path" value={nextPath ?? ""} />
      <input type="hidden" name="required_flow" value={requiredFlow ?? ""} />

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
              Verification Requirement
            </h1>
            <p className="mt-0.5 text-[18px] leading-6 text-[#8b95a5]">
              KaSupply requires verification to maintain a trusted buyer network
            </p>
          </div>
          <p className="text-[16px] font-semibold text-[#223654]">
            {isStep3Active ? "Step 3 of 3" : "Step 2 of 3"}
          </p>
        </div>

        <div className="mb-5 mt-5 flex items-center gap-3">
          <StepIndicator number={1} label="Profile Setup" active />
          <div className="h-px flex-1 bg-[#d7dee8]" />
          <StepIndicator number={2} label="Verification" active />
          <div className="h-px flex-1 bg-[#d7dee8]" />
          <StepIndicator
            number={3}
            label="User Verified"
            active={isStep3Active}
          />
        </div>

        <div className="rounded-[12px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="m-0 text-[18px] font-semibold leading-[21px] text-[#1f3d67]">
              Upload DTI Business Registration Certificate
            </h2>
            <p className="m-0 text-[16px] leading-[25px] text-[#8b95a5]">
              Ensure your document is clear and fully readable
            </p>
          </div>

          <div className="rounded-[12px] border border-dashed border-[#d7dee8] px-5 py-10 text-center">
            <div className="flex flex-col items-center">
              <UploadCloudIcon />

              <p className="mt-0.2 text-[17px] font-medium text-[#223654]">
                Choose a file or drag &amp; drop it here
              </p>
              <p className="mt-0.5 text-[15px] text-[#8b95a5]">
                PDF, JPG, JPEG, PNG, DOC, DOCX formats, up to 10MB
              </p>
              <p className="mt-0.4 text-[15px] text-[#8b95a5]">
                JPG or PNG is recommended for the fastest automated QR-based
                review.
              </p>

              {selectedFileName ? (
                <div className="mt-4 flex w-full max-w-md items-center justify-between rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-4 py-3 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileIcon />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#223654]">
                        {selectedFileName}
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
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
                className="sr-only"
                onChange={handleFileChange}
              />

              {status === "review_required" ? (
                <button
                  type="button"
                  onClick={handleResubmit}
                  className="mt-6 rounded-lg border border-[#d7dee8] px-4 py-2 text-[14px] font-medium text-[#223654] transition hover:bg-[#f8fafc]"
                >
                  Upload New File
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={filePickerButtonDisabled}
                  className={`mt-6 rounded-lg border border-[#d7dee8] px-4 py-2 text-[14px] font-medium text-[#223654] transition ${
                    filePickerButtonDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-[#f8fafc]"
                  }`}
                >
                  {status === "success" ? "File Verified" : filePickerButtonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <DocumentStatusMessage status={status} />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={backHref}
          className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
        >
          Back
        </Link>

        <button
          type={status === "success" ? "button" : "submit"}
          onClick={status === "success" ? handleFinish : undefined}
          disabled={mainActionDisabled}
          className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
            mainActionDisabled
              ? "bg-[#c3ccd9]"
              : "bg-[#1f3d67] hover:bg-[#193354]"
          }`}
        >
          {status === "success"
            ? "Finish"
            : isPending || status === "validating"
              ? "Uploading..."
              : "Upload"}
        </button>
      </div>
    </form>
  );
}