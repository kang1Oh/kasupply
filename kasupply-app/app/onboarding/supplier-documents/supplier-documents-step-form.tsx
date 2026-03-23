"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { uploadSupplierDocument } from "./actions";

type DocumentType = {
  doc_type_id: number;
  document_type_name: string;
};

type UploadedDocument = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
};

type SupplierDocumentsStepFormProps = {
  requiredDocumentTypes: DocumentType[];
  optionalDocumentTypes: DocumentType[];
  uploadedDocuments: UploadedDocument[];
  canProceed: boolean;
};

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

function DocumentIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#edf1f7] bg-[#f8fafc] text-[#b7beca]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3.75A1.75 1.75 0 0 0 5.25 5.5v13A1.75 1.75 0 0 0 7 20.25h10A1.75 1.75 0 0 0 18.75 18.5V9.56a1.75 1.75 0 0 0-.5-1.22l-3.03-3.1a1.75 1.75 0 0 0-1.25-.54H7Zm0 1.5h6.25v3.5c0 .97.78 1.75 1.75 1.75h2.25v8a.25.25 0 0 1-.25.25H7a.25.25 0 0 1-.25-.25v-13A.25.25 0 0 1 7 5.25Z"
        />
      </svg>
    </div>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 min-w-[88px] rounded-md bg-[#294773] px-5 text-sm font-medium text-white transition hover:bg-[#20395d] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Uploading..." : "Upload"}
    </button>
  );
}

function DocumentCard({
  docType,
  uploaded,
  optional,
}: {
  docType: DocumentType;
  uploaded?: UploadedDocument;
  optional?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[#e4e9f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <div className="flex items-start gap-3">
        <DocumentIcon />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#294773]">
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
            {uploaded ? (
              <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[10px] font-medium text-[#15803d]">
                {uploaded.status ?? "uploaded"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[#b0b8c5]">PDF, JPG or PNG</p>
        </div>
      </div>

      <form action={uploadSupplierDocument} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <input type="hidden" name="doc_type_id" value={docType.doc_type_id} />
        <input
          name="document"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          className="h-10 flex-1 rounded-md border border-[#d9e1ec] bg-white px-0 py-0 text-[13px] text-[#8b95a5] outline-none file:mr-3 file:h-full file:border-0 file:border-r file:border-[#d9e1ec] file:bg-[#f5f7fb] file:px-4 file:text-[12px] file:font-normal file:text-[#7f8a9b]"
        />
        <UploadButton />
      </form>
    </div>
  );
}

export function SupplierDocumentsStepForm({
  requiredDocumentTypes,
  optionalDocumentTypes,
  uploadedDocuments,
  canProceed,
}: SupplierDocumentsStepFormProps) {
  const [visibleOptionalCount, setVisibleOptionalCount] = useState(
    Math.min(1, optionalDocumentTypes.length)
  );

  const uploadedMap = new Map<number, UploadedDocument>();
  for (const uploaded of uploadedDocuments) {
    uploadedMap.set(uploaded.doc_type_id, uploaded);
  }

  const visibleOptionalDocuments = optionalDocumentTypes.slice(0, visibleOptionalCount);
  const hasMoreOptional = visibleOptionalCount < optionalDocumentTypes.length;

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold leading-tight text-[#223654]">
                Verification Requirement
              </h1>
              <p className="mt-1 text-sm text-[#8b95a5]">
                KaSupply requires verification to maintain a trusted supplier network
              </p>
            </div>
            <p className="text-sm font-semibold text-[#223654]">Step 2 of 3</p>
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator number={1} label="Profile Setup" />
            <div className="h-px flex-1 bg-[#1f3d67]" />
            <StepIndicator number={2} label="Verification" active />
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <StepIndicator number={3} label="User Verified" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d8595]">
              Required documents
            </p>
            <div className="mt-3 space-y-3">
              {requiredDocumentTypes.map((docType) => (
                <DocumentCard
                  key={docType.doc_type_id}
                  docType={docType}
                  uploaded={uploadedMap.get(docType.doc_type_id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d8595]">
              Optional documents
            </p>
            <p className="mt-1 text-sm text-[#c0c5cf]">
              Additional certifications like Halal, ISO, GAP, Organic, or Fair Trade help boost your visibility to buyers
            </p>

            <div className="mt-3 space-y-3">
              {visibleOptionalDocuments.map((docType) => (
                <DocumentCard
                  key={docType.doc_type_id}
                  docType={docType}
                  uploaded={uploadedMap.get(docType.doc_type_id)}
                  optional
                />
              ))}
            </div>

            {hasMoreOptional ? (
              <button
                type="button"
                onClick={() => setVisibleOptionalCount((current) => current + 1)}
                className="mt-3 flex h-10 w-full items-center gap-2 rounded-[14px] border border-[#e4e9f1] bg-white px-4 text-sm text-[#8a94a6] transition hover:border-[#cfd8e3]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#c7d0dc] text-xs">
                  +
                </span>
                Add Certification
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-4">
        <Link href="/onboarding/categories" className="text-sm font-medium text-[#aab3c2]">
          Back
        </Link>
        {canProceed ? (
          <Link
            href="/onboarding/supplier-site-images"
            className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1]"
          >
            Proceed
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md bg-[#c5cedb] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Proceed
          </button>
        )}
      </div>
    </div>
  );
}
