"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  uploadSupplierCertification,
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
};

type CertificationType = {
  cert_type_id: number;
  certification_type_name: string;
};

type UploadedCertification = {
  certification_id: number;
  cert_type_id: number;
  status: string | null;
  file_url?: string | null;
};

type SelectedCertification = {
  cert_type_id: number;
  certification_type_name: string;
};

type SupplierDocumentsStepFormProps = {
  requiredDocumentTypes: DocumentType[];
  optionalDocumentTypes: DocumentType[];
  uploadedDocuments: UploadedDocument[];
  certificationTypes: CertificationType[];
  uploadedCertifications: UploadedCertification[];
  canProceed: boolean;
};

type NormalizedStatus = "verifying" | "verified" | "failed" | null;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FILE_SIZE_ERROR_MESSAGE =
  "File is too large. Maximum allowed size is 10MB.";

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

function getStatusLabel(status: NormalizedStatus) {
  if (status === "verifying") return "Verifying";
  if (status === "verified") return "Verified";
  if (status === "failed") return "Failed";
  return "";
}

function getStatusBadgeClass(status: NormalizedStatus) {
  if (status === "verifying") {
    return "border border-[#bfdbfe] bg-[#eff6ff] text-[#3b82f6]";
  }

  if (status === "verified") {
    return "border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]";
  }

  if (status === "failed") {
    return "border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]";
  }

  return "";
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

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3A9 9 0 1 1 3 12"
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
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12A9 9 0 1 1 3 12A9 9 0 0 1 21 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 12.25L10.75 14.5L15.75 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12A9 9 0 1 1 3 12A9 9 0 0 1 21 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 9L15 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 9L9 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusMessage({ status }: { status: NormalizedStatus }) {
  if (status === "verifying") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#3b82f6]">
        <SpinnerIcon />
        Verifying your document, please wait...
      </p>
    );
  }

  if (status === "verified") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#15803d]">
        <CheckCircleIcon />
        Document verified successfully
      </p>
    );
  }

  if (status === "failed") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#e11d48]">
        <XCircleIcon />
        We couldn&apos;t verify this document. Ensure it&apos;s clear and
        legible, and that your details match your document.
      </p>
    );
  }

  return null;
}

function FileInput({
  fileName,
  setFileName,
  onFileChange,
  disabled = false,
}: {
  fileName: string;
  setFileName: (fileName: string) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDisabled = pending || disabled;

  return (
    <div className="flex h-11 flex-1 overflow-hidden rounded-lg border border-[#d9e1ec] bg-white text-[14px] text-[#8b95a5]">
      <input
        ref={inputRef}
        name="document"
        type="file"
        required
        disabled={isDisabled}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;

          setFileName(file?.name ?? "");
          onFileChange?.(file);
        }}
        className="sr-only"
      />

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        className="h-full border-r border-[#d9e1ec] bg-[#f5f7fb] px-5 text-[13px] font-normal text-[#7f8a9b] transition hover:bg-[#eef2f7] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {fileName ? "Change File" : "Choose File"}
      </button>

      <div className="flex min-w-0 flex-1 items-center px-3">
        <span className="truncate text-[14px] text-[#8b95a5]">
          {fileName || "No file chosen"}
        </span>
      </div>
    </div>
  );
}

function UploadButton({
  hasUploaded,
  isFailed,
  isVerifying,
}: {
  hasUploaded: boolean;
  isFailed: boolean;
  isVerifying: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || isVerifying}
      className={`h-11 min-w-[96px] rounded-lg px-5 text-[15px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
        isFailed
          ? "bg-[#e11d48] hover:bg-[#be1037]"
          : "bg-[#1f3d67] hover:bg-[#193354]"
      }`}
    >
      {pending
        ? "Uploading..."
        : isVerifying
          ? "Verifying..."
          : hasUploaded
            ? "Resubmit"
            : "Upload"}
    </button>
  );
}

function CertificationUploadButton({
  hasUploaded,
  hasSelectedNewFile,
}: {
  hasUploaded: boolean;
  hasSelectedNewFile: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || (hasUploaded && !hasSelectedNewFile);

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="h-11 min-w-[96px] rounded-lg bg-[#1f3d67] px-5 text-[15px] font-medium text-white transition hover:bg-[#193354] disabled:cursor-not-allowed disabled:bg-[#c3ccd9]"
    >
      {pending
        ? "Uploading..."
        : hasUploaded && !hasSelectedNewFile
          ? "Uploaded"
          : hasUploaded
            ? "Resubmit"
            : "Upload"}
    </button>
  );
}

function SmallBadge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "required" | "optional";
}) {
  return (
    <span
      className={`inline-flex h-[20px] w-fit shrink-0 items-center rounded-full border px-2 text-[11px] font-medium leading-none ${
        variant === "optional"
          ? "border-[#b8c0cc] text-[#8c97a8]"
          : "border-[#ff8d8d] text-[#ef4444]"
      }`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[15px] font-medium uppercase tracking-wide text-[#7d8595]">
        {title}
      </p>

      {description ? (
        <p className="text-[15px] font-light leading-5 text-[#b5bdc9]">
          {description}
        </p>
      ) : null}
    </div>
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
  const normalizedStatus = getNormalizedStatus(uploaded?.status);
  const isFailed = normalizedStatus === "failed";
  const isVerifying = normalizedStatus === "verifying";
  const [fileName, setFileName] = useState("");
  const [fileSizeError, setFileSizeError] = useState("");

  function validateFileSize(file: File | null) {
    const isTooLarge = Boolean(file && file.size > MAX_FILE_SIZE_BYTES);

    setFileSizeError(isTooLarge ? FILE_SIZE_ERROR_MESSAGE : "");

    return !isTooLarge;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem(
      "document",
    ) as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!validateFileSize(file)) {
      event.preventDefault();
    }
  }

  return (
    <div
      className={`rounded-[12px] border border-[#edf2f7] p-5 ${getCardBackgroundClass(
        normalizedStatus,
      )}`}
    >
      <div className="flex items-start gap-3">
        <DocumentIcon />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1f3d67]">
              {docType.document_type_name}
            </p>

            {normalizedStatus ? (
              <span
                className={`inline-flex min-h-[22px] shrink-0 items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium leading-none ${getStatusBadgeClass(
                  normalizedStatus,
                )}`}
              >
                {getStatusLabel(normalizedStatus)}
              </span>
            ) : (
              <SmallBadge variant={optional ? "optional" : "required"}>
                {optional ? "Optional" : "Required"}
              </SmallBadge>
            )}
          </div>

          <p className="text-[13px] text-[#b0b8c5]">
            PDF, JPG or PNG · Max 10MB
          </p>
        </div>
      </div>

      <form
        action={uploadSupplierDocument}
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 md:flex-row md:items-center"
      >
        <input type="hidden" name="doc_type_id" value={docType.doc_type_id} />

        <div className="min-w-0 flex-1">
          <FileInput
            fileName={fileName}
            setFileName={setFileName}
            onFileChange={validateFileSize}
            disabled={isVerifying}
          />

          {fileSizeError ? (
            <p className="text-[13px] text-[#e11d48]">{fileSizeError}</p>
          ) : null}
        </div>

        <UploadButton
          hasUploaded={Boolean(uploaded)}
          isFailed={isFailed}
          isVerifying={isVerifying}
        />
      </form>

      <StatusMessage status={normalizedStatus} />
    </div>
  );
}

function CertificationCard({
  certification,
  uploaded,
}: {
  certification: SelectedCertification;
  uploaded?: UploadedCertification;
}) {
  const uploadedFileName = uploaded?.file_url
    ? uploaded.file_url.split("/").pop() ?? "Uploaded file"
    : uploaded
      ? "Uploaded file"
      : "";

  const [fileName, setFileName] = useState(uploadedFileName);
  const [hasSelectedNewFile, setHasSelectedNewFile] = useState(false);

  return (
    <div className="rounded-[12px] border border-[#edf2f7] bg-white p-5">
      <div className="flex items-start gap-3">
        <DocumentIcon />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1f3d67]">
              {certification.certification_type_name}
            </p>

            {uploaded ? (
              <span className="inline-flex min-h-[22px] shrink-0 items-center rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-[3px] text-[11px] font-medium leading-none text-[#15803d]">
                Uploaded
              </span>
            ) : (
              <SmallBadge variant="optional">Optional</SmallBadge>
            )}
          </div>

          <p className="text-[13px] text-[#b0b8c5]">PDF, JPG or PNG</p>
        </div>
      </div>

      <form
        action={uploadSupplierCertification}
        className="mt-4 flex flex-col gap-3 md:flex-row md:items-center"
      >
        <input
          type="hidden"
          name="cert_type_id"
          value={certification.cert_type_id}
        />

        <FileInput
          fileName={fileName}
          setFileName={setFileName}
          onFileChange={(file) => {
            setHasSelectedNewFile(Boolean(file));
          }}
        />

        <CertificationUploadButton
          hasUploaded={Boolean(uploaded)}
          hasSelectedNewFile={hasSelectedNewFile}
        />
      </form>
    </div>
  );
}

function AddCertificationIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c7d0dc] text-[14px] leading-none text-[#8a94a6]">
      +
    </span>
  );
}

export function SupplierDocumentsStepForm({
  requiredDocumentTypes,
  optionalDocumentTypes,
  uploadedDocuments,
  certificationTypes,
  uploadedCertifications,
  canProceed,
}: SupplierDocumentsStepFormProps) {
  const uploadedMap = new Map<number, UploadedDocument>();

  for (const uploaded of uploadedDocuments) {
    uploadedMap.set(uploaded.doc_type_id, uploaded);
  }

  const uploadedCertificationMap = new Map<number, UploadedCertification>();

  for (const uploaded of uploadedCertifications) {
    uploadedCertificationMap.set(uploaded.cert_type_id, uploaded);
  }

  const initialSelectedCertifications = useMemo<SelectedCertification[]>(() => {
    return uploadedCertifications
      .map((certification) => {
        const certificationType = certificationTypes.find(
          (type) => type.cert_type_id === certification.cert_type_id,
        );

        if (!certificationType) return null;

        return {
          cert_type_id: certificationType.cert_type_id,
          certification_type_name: certificationType.certification_type_name,
        };
      })
      .filter(Boolean) as SelectedCertification[];
  }, [uploadedCertifications, certificationTypes]);

  const [selectedCertifications, setSelectedCertifications] = useState<
    SelectedCertification[]
  >(initialSelectedCertifications);
  const [isChoosingCertification, setIsChoosingCertification] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCertTypeId, setSelectedCertTypeId] = useState("");
  const [otherCertificationName, setOtherCertificationName] = useState("");

  const selectedCertificationIds = selectedCertifications.map(
    (certification) => certification.cert_type_id,
  );

  const availableCertificationTypes = certificationTypes.filter(
    (certificationType) =>
      !selectedCertificationIds.includes(certificationType.cert_type_id),
  );

  const selectedCertificationType =
    certificationTypes.find(
      (certificationType) =>
        String(certificationType.cert_type_id) === selectedCertTypeId,
    ) ?? null;

  const isSelectedOther =
    selectedCertificationType?.certification_type_name.toLowerCase() === "others";

  const selectedDropdownLabel =
    selectedCertificationType?.certification_type_name ?? "Select certification";

  function handleAddCertification() {
    if (!selectedCertificationType) return;

    const customName = otherCertificationName.trim();

    if (isSelectedOther && !customName) return;

    const certificationName = isSelectedOther
      ? customName
      : selectedCertificationType.certification_type_name;

    setSelectedCertifications((current) => {
      if (
        current.some(
          (certification) =>
            certification.cert_type_id === selectedCertificationType.cert_type_id,
        )
      ) {
        return current;
      }

      return [
        ...current,
        {
          cert_type_id: selectedCertificationType.cert_type_id,
          certification_type_name: certificationName,
        },
      ];
    });

    setSelectedCertTypeId("");
    setOtherCertificationName("");
    setIsDropdownOpen(false);
    setIsChoosingCertification(false);
  }

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

      <div className="mb-5 mt-5 flex items-center gap-3">
        <StepIndicator number={1} label="Profile Setup" active />
        <div className="h-px flex-1 bg-[#d7dee8]" />
        <StepIndicator number={2} label="Verification" active />
        <div className="h-px flex-1 bg-[#d7dee8]" />
        <StepIndicator number={3} label="User Verified" />
      </div>

      <div>
        <SectionHeader title="Required documents" />

        <div className="mt-3 space-y-4">
          {requiredDocumentTypes.map((docType) => (
            <DocumentCard
              key={docType.doc_type_id}
              docType={docType}
              uploaded={uploadedMap.get(docType.doc_type_id)}
            />
          ))}
        </div>
      </div>

      {optionalDocumentTypes.length > 0 ? (
        <div>
          <SectionHeader
            title="Optional documents"
            description="Upload any extra supplier documents your current onboarding policy marks as optional."
          />

          <div className="mt-3 space-y-4">
            {optionalDocumentTypes.map((docType) => (
              <DocumentCard
                key={docType.doc_type_id}
                docType={docType}
                uploaded={uploadedMap.get(docType.doc_type_id)}
                optional
              />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionHeader
          title="Optional documents"
          description="Additional certifications like Halal, ISO, GAP, Organic, or Fair Trade help boost your visibility to buyers"
        />

        {selectedCertifications.length > 0 ? (
          <div className="mt-3 space-y-3">
            {selectedCertifications.map((certification) => (
              <CertificationCard
                key={certification.cert_type_id}
                certification={certification}
                uploaded={uploadedCertificationMap.get(
                  certification.cert_type_id,
                )}
              />
            ))}
          </div>
        ) : null}

        {isChoosingCertification ? (
          <div className="mt-3 rounded-[12px] border border-[#edf2f7] bg-white p-4">
            <label className="mb-3 block text-[16px] font-normal text-[#1f3d67]">
              Choose certification type
            </label>

            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((current) => !current)}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d9e1ec] bg-white px-4 text-left text-[14px] font-normal text-[#223654] outline-none transition hover:border-[#b8c5d6] focus:border-[#1f3d67]"
                >
                  <span
                    className={
                      selectedCertTypeId ? "text-[#223654]" : "text-[#8a94a6]"
                    }
                  >
                    {selectedDropdownLabel}
                  </span>

                  <span className="mr-1 text-[#1f3d67]">
                    <ChevronDownIcon />
                  </span>
                </button>

                {isDropdownOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-[12px] border border-[#d9e1ec] bg-white py-2 shadow-[0_12px_30px_rgba(15,23,42,0.10)]">
                    {availableCertificationTypes.length > 0 ? (
                      availableCertificationTypes.map((certificationType) => (
                        <button
                          key={certificationType.cert_type_id}
                          type="button"
                          onClick={() => {
                            setSelectedCertTypeId(
                              String(certificationType.cert_type_id),
                            );
                            setOtherCertificationName("");
                            setIsDropdownOpen(false);
                          }}
                          className="block w-full px-4 py-2.5 text-left text-[14px] font-normal text-[#223654] transition hover:bg-[#f3f7fc]"
                        >
                          {certificationType.certification_type_name}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-2.5 text-[14px] text-[#8a94a6]">
                        No more certifications available
                      </p>
                    )}
                  </div>
                ) : null}

                {isSelectedOther ? (
                  <input
                    type="text"
                    value={otherCertificationName}
                    onChange={(event) =>
                      setOtherCertificationName(event.target.value)
                    }
                    placeholder="Type certification name"
                    className="mt-3 h-11 w-full rounded-lg border border-[#d9e1ec] bg-white px-4 text-[14px] font-normal text-[#223654] outline-none transition placeholder:text-[#a7b0bf] focus:border-[#1f3d67]"
                  />
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddCertification}
                  disabled={
                    !selectedCertTypeId ||
                    (isSelectedOther && !otherCertificationName.trim())
                  }
                  className="h-11 rounded-lg bg-[#1f3d67] px-6 text-[14px] font-medium text-white transition hover:bg-[#193354] disabled:cursor-not-allowed disabled:bg-[#8190a8]"
                >
                  Add
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCertTypeId("");
                    setOtherCertificationName("");
                    setIsDropdownOpen(false);
                    setIsChoosingCertification(false);
                  }}
                  className="h-11 rounded-lg border border-[#d9e1ec] bg-white px-6 text-[14px] font-medium text-[#8a94a6] transition hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsChoosingCertification(true)}
          className="mt-3 flex h-12 w-full items-center gap-2 rounded-[10px] border border-[#e1e7ef] bg-white px-4 text-[13px] font-medium text-[#8a94a6] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
        >
          <AddCertificationIcon />
          Add Certification
        </button>
      </div>

      <div className="mt-2 flex items-center justify-end gap-4">
        <Link
          href="/onboarding/categories"
          className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
        >
          Back
        </Link>

        {canProceed ? (
          <Link
            href="/onboarding/supplier-site-images"
            className="rounded-lg bg-[#1f3d67] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193354]"
          >
            Proceed
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-[#c3ccd9] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Proceed
          </button>
        )}
      </div>
    </div>
  );
}