"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isBuyerDtiDocumentTypeName } from "@/lib/verification/document-rules";
import {
  processAllSupplierDocumentVerifications,
  uploadSupplierDocument,
} from "./actions";

type DocumentType = {
  doc_type_id: number;
  document_type_name: string;
};

type UploadedDocument = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
  review_notes: string | null;
  file_url?: string | null;
};

type SupplierDocumentsStepFormProps = {
  requiredDocumentTypes: DocumentType[];
  optionalDocumentTypes: DocumentType[];
  uploadedDocuments: UploadedDocument[];
  canProceed: boolean;
};

type NormalizedStatus = "verifying" | "verified" | "failed" | null;

function getNormalizedStatus(status?: string | null): NormalizedStatus {
  if (
    status === "queued" ||
    status === "pending" ||
    status === "verifying" ||
    status === "processing"
  ) {
    return "verifying";
  }

  if (status === "completed" || status === "approved") {
    return "verified";
  }

  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "review_required"
  ) {
    return "failed";
  }

  return null;
}

function getCardBackgroundClass(status: NormalizedStatus) {
  if (status === "verifying") return "bg-[#f8faff]";
  if (status === "verified") return "bg-[#f0fdf4]";
  if (status === "failed") return "bg-[#fff1f2]";
  return "bg-white";
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

function DocumentIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edf1f7] bg-[#f8fafc] text-[#b7beca]">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 3.75H13.75L18.75 8.75V18.5A1.75 1.75 0 0 1 17 20.25H7A1.75 1.75 0 0 1 5.25 18.5V5.5A1.75 1.75 0 0 1 7 3.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M13.75 3.75V8.75H18.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.75 13H15.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.75 16H13.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
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

function getDocumentStatusBadge(status: string | null) {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "approved") {
    return {
      label: "approved",
      className: "bg-[#ecfdf3] text-[#15803d]",
    };
  }

  if (normalizedStatus === "rejected") {
    return {
      label: "rejected",
      className: "bg-[#fef2f2] text-[#dc2626]",
    };
  }

  if (normalizedStatus === "processing" || normalizedStatus === "pending") {
    return {
      label: normalizedStatus,
      className: "bg-[#fff7ed] text-[#c2410c]",
    };
  }

  return {
    label: normalizedStatus || "uploaded",
    className: "bg-[#eef2f7] text-[#64748b]",
  };
}

function getStoredFileName(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return "";
  }

  const segments = fileUrl.split("/");
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

function getPreviewHelperText(params: {
  hasSelectedFile: boolean;
  hasUploadedDocument: boolean;
  status: string | null;
}) {
  if (params.hasSelectedFile) {
    return "Ready to upload";
  }

  if (String(params.status ?? "").trim().toLowerCase() === "approved") {
    return "Approved upload";
  }

  if (params.hasUploadedDocument) {
    return "Uploaded and ready for verification";
  }

  return "Choose a file to upload";
}

type DocumentCardProps = {
  docType: DocumentType;
  uploaded?: UploadedDocument;
  optional?: boolean;
  selectedFileName: string;
  previewFileName: string;
  pending: boolean;
  onFileChange: (docTypeId: number, file: File | null) => void;
  onBrowse: (docTypeId: number) => void;
  onUpload: (docType: DocumentType) => void;
  registerInputRef: (docTypeId: number, node: HTMLInputElement | null) => void;
};

function DocumentCard({
  docType,
  uploaded,
  optional,
  selectedFileName,
  previewFileName,
  pending,
  onFileChange,
  onBrowse,
  onUpload,
  registerInputRef,
}: DocumentCardProps) {
  const isDtiDocument = isBuyerDtiDocumentTypeName(docType.document_type_name);
  const statusBadge = uploaded ? getDocumentStatusBadge(uploaded.status) : null;
  const hasUploadedDocument = Boolean(uploaded?.doc_id || uploaded?.file_url);
  const helperText = getPreviewHelperText({
    hasSelectedFile: Boolean(selectedFileName),
    hasUploadedDocument,
    status: uploaded?.status ?? null,
  });

  return (
    <div
      className={`rounded-[12px] border border-[#edf2f7] p-5 ${getCardBackgroundClass(
        getNormalizedStatus(uploaded?.status ?? null),
      )}`}
    >
      <div className="flex items-start gap-3">
        <DocumentIcon />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1f3d67]">
              {docType.document_type_name}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                optional
                  ? "border-[#b8c0cc] text-[#8c97a8]"
                  : "border-[#ff8d8d] text-[#ef4444]"
              }`}
            >
              {optional ? "Optional" : "Required"}
            </span>
            {statusBadge ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            ) : (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#eef2f7] text-[#64748b]"
              >
                {getNormalizedStatus(uploaded?.status ?? null)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#b0b8c5]">
            {isDtiDocument ? "JPG or PNG only" : "PDF, JPG or PNG"}
          </p>
          {uploaded?.review_notes ? (
            <p className="mt-1 text-xs text-[#475569]">{uploaded.review_notes}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[12px] border border-dashed border-[#d7dee8] bg-[#fbfcfe] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              {previewFileName ? (
                <div className="flex items-center gap-3 rounded-lg border border-[#d7dee8] bg-white px-4 py-3 text-left">
                  <FileIcon />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#223654]">
                      {previewFileName}
                    </p>
                    <p className="text-xs text-[#8b95a5]">{helperText}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#edf1f7] bg-white px-4 py-3 text-sm text-[#8b95a5]">
                  No file selected yet.
                </div>
              )}
            </div>

            <input
              ref={(node) => registerInputRef(docType.doc_type_id, node)}
              type="file"
              accept={isDtiDocument ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onFileChange(docType.doc_type_id, file);
                event.target.value = "";
              }}
            />

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => onBrowse(docType.doc_type_id)}
                disabled={pending}
                className="rounded-lg border border-[#d7dee8] px-4 py-2 text-[14px] font-medium text-[#223654] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewFileName ? "Change File" : "Browse File"}
              </button>
              <button
                type="button"
                onClick={() => onUpload(docType)}
                disabled={!selectedFileName || pending}
                className="rounded-lg bg-[#294773] px-5 py-2 text-[14px] font-medium text-white transition hover:bg-[#20395d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupplierDocumentsStepForm({
  requiredDocumentTypes,
  optionalDocumentTypes,
  uploadedDocuments,
  canProceed,
}: SupplierDocumentsStepFormProps) {
  const router = useRouter();
  const [selectedFilesByDocType, setSelectedFilesByDocType] = useState<
    Record<number, File | null>
  >({});
  const [selectedFileNamesByDocType, setSelectedFileNamesByDocType] = useState<
    Record<number, string>
  >({});
  const [uploadedPreviewNamesByDocType, setUploadedPreviewNamesByDocType] = useState<
    Record<number, string>
  >({});
  const [documentOverrides, setDocumentOverrides] = useState<
    Record<number, UploadedDocument>
  >({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingDocTypeId, setUploadingDocTypeId] = useState<number | null>(null);
  const [isUploadPending, startUploadTransition] = useTransition();
  const [isVerifyPending, startVerifyTransition] = useTransition();
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadedMap = useMemo(() => {
    const mergedMap = new Map<number, UploadedDocument>();

    for (const uploaded of uploadedDocuments) {
      mergedMap.set(uploaded.doc_type_id, uploaded);
    }

    for (const uploaded of Object.values(documentOverrides)) {
      mergedMap.set(uploaded.doc_type_id, uploaded);
    }

    return mergedMap;
  }, [documentOverrides, uploadedDocuments]);

  const allRequiredUploaded = requiredDocumentTypes.every((docType) =>
    Boolean(uploadedMap.get(docType.doc_type_id)?.doc_id)
  );
  const pendingDocumentCount = [...uploadedMap.values()].filter(
    (document) => String(document.status ?? "").trim().toLowerCase() === "pending"
  ).length;
  const canVerifyAll =
    allRequiredUploaded &&
    pendingDocumentCount > 0 &&
    !isUploadPending &&
    !isVerifyPending;
  const verifyButtonLabel =
    pendingDocumentCount > 0
      ? `Verify Pending (${pendingDocumentCount}) Document${
          pendingDocumentCount === 1 ? "" : "s"
        }`
      : "Verify All Documents";

  const registerInputRef = (docTypeId: number, node: HTMLInputElement | null) => {
    inputRefs.current[docTypeId] = node;
  };

  const handleFileChange = (docTypeId: number, file: File | null) => {
    setSelectedFilesByDocType((current) => ({
      ...current,
      [docTypeId]: file,
    }));
    setSelectedFileNamesByDocType((current) => ({
      ...current,
      [docTypeId]: file?.name ?? "",
    }));
    setError("");
    setFeedbackMessage("");
  };

  const handleUpload = (docType: DocumentType) => {
    const selectedFile = selectedFilesByDocType[docType.doc_type_id];
    const selectedFileName = selectedFileNamesByDocType[docType.doc_type_id] ?? "";

    if (!selectedFile || !selectedFileName) {
      setError(`Choose a file for ${docType.document_type_name} before uploading.`);
      return;
    }

    const formData = new FormData();
    formData.append("doc_type_id", String(docType.doc_type_id));
    formData.append("document", selectedFile);

    setError("");
    setFeedbackMessage("");
    setUploadingDocTypeId(docType.doc_type_id);

    startUploadTransition(async () => {
      try {
        const result = await uploadSupplierDocument(formData);

        setDocumentOverrides((current) => ({
          ...current,
          [docType.doc_type_id]: {
            doc_id: result.docId ?? current[docType.doc_type_id]?.doc_id ?? 0,
            doc_type_id: docType.doc_type_id,
            status: result.status,
            review_notes: result.reviewNotes,
            file_url: result.fileUrl,
          },
        }));
        setUploadedPreviewNamesByDocType((current) => ({
          ...current,
          [docType.doc_type_id]: selectedFileName,
        }));
        setSelectedFilesByDocType((current) => ({
          ...current,
          [docType.doc_type_id]: null,
        }));
        setSelectedFileNamesByDocType((current) => ({
          ...current,
          [docType.doc_type_id]: "",
        }));
        setFeedbackMessage(result.message);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploadingDocTypeId(null);
      }
    });
  };

  const handleVerifyAll = () => {
    setError("");
    setFeedbackMessage("");

    startVerifyTransition(async () => {
      try {
        const result = await processAllSupplierDocumentVerifications();

        setDocumentOverrides((current) => {
          const nextState = { ...current };

          for (const document of result.documentResults) {
            const existing = uploadedMap.get(document.docTypeId) ?? current[document.docTypeId];

            if (!existing) {
              continue;
            }

            nextState[document.docTypeId] = {
              ...existing,
              status: document.status,
              review_notes: document.reviewNotes,
            };
          }

          return nextState;
        });
        setFeedbackMessage(result.message);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed.");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
            Verification Requirement
          </h1>
          <p className="mt-0.5 text-[18px] leading-6 text-[#8b95a5]">
            KaSupply requires verification to maintain a trusted supplier network
          </p>
        </div>
        <p className="text-[16px] font-semibold text-[#223654]">Step 2 of 3</p>
      </div>

      <div className="flex items-center gap-3">
        <StepIndicator number={1} label="Profile Setup" active />
        <div className="h-px flex-1 bg-[#1f3d67]" />
        <StepIndicator number={2} label="Verification" active />
        <div className="h-px flex-1 bg-[#d7dee8]" />
        <StepIndicator number={3} label="User Verified" />
      </div>

      <section className="rounded-[14px] border border-[#e4e9f1] bg-white p-6">
        <div className="mx-auto space-y-8">
          <div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#1f3d67]">
                Required documents
              </h2>
              <p className="mt-0.5 text-[14px] text-[#8b95a5]">
                Upload the required documents to complete your supplier verification.
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {requiredDocumentTypes.map((docType) => {
                const uploaded = uploadedMap.get(docType.doc_type_id);
                const previewFileName =
                  selectedFileNamesByDocType[docType.doc_type_id] ||
                  uploadedPreviewNamesByDocType[docType.doc_type_id] ||
                  getStoredFileName(uploaded?.file_url);

                return (
                  <DocumentCard
                    key={docType.doc_type_id}
                    docType={docType}
                    uploaded={uploaded}
                    selectedFileName={selectedFileNamesByDocType[docType.doc_type_id] ?? ""}
                    previewFileName={previewFileName}
                    pending={isUploadPending && uploadingDocTypeId === docType.doc_type_id}
                    onFileChange={handleFileChange}
                    onBrowse={(docTypeId) => inputRefs.current[docTypeId]?.click()}
                    onUpload={handleUpload}
                    registerInputRef={registerInputRef}
                  />
                );
              })}
            </div>
          </div>

          {optionalDocumentTypes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7d8595]">
                Optional documents
              </p>
              <p className="mt-1 text-sm text-[#c0c5cf]">
                Upload any extra supplier documents your current onboarding policy marks as
                optional.
              </p>

              <div className="mt-3 space-y-3">
                {optionalDocumentTypes.map((docType) => {
                  const uploaded = uploadedMap.get(docType.doc_type_id);
                  const previewFileName =
                    selectedFileNamesByDocType[docType.doc_type_id] ||
                    uploadedPreviewNamesByDocType[docType.doc_type_id] ||
                    getStoredFileName(uploaded?.file_url);

                  return (
                    <DocumentCard
                      key={docType.doc_type_id}
                      docType={docType}
                      uploaded={uploaded}
                      optional
                      selectedFileName={
                        selectedFileNamesByDocType[docType.doc_type_id] ?? ""
                      }
                      previewFileName={previewFileName}
                      pending={isUploadPending && uploadingDocTypeId === docType.doc_type_id}
                      onFileChange={handleFileChange}
                      onBrowse={(docTypeId) => inputRefs.current[docTypeId]?.click()}
                      onUpload={handleUpload}
                      registerInputRef={registerInputRef}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-[14px] border border-[#e4e9f1] bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={handleVerifyAll}
                disabled={!canVerifyAll}
                className="rounded-md w-full bg-[#1f3d67] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193354] disabled:cursor-not-allowed disabled:bg-[#c5cedb]"
              >
                {isVerifyPending ? "Verifying pending documents..." : verifyButtonLabel}
              </button>
            </div>
          </div>

          {feedbackMessage ? (
            <p className="rounded-[12px] border border-[#d7dee8] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]">
              {feedbackMessage}
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </section>

      <div className="flex items-center justify-end gap-4">
        <p className="mr-auto text-sm text-[#8a94a6]">
          Finish unlocks once every required document is approved.
        </p>
        <Link href="/onboarding/categories" className="text-sm font-medium text-[#aab3c2]">
          Back
        </Link>

        {canProceed ? (
          <Link
            href="/supplier/notifications"
            className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1]"
          >
            Finish
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-[#c3ccd9] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
