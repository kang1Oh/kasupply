"use client";

import { useMemo, useRef, useState } from "react";

type PermitRow = {
  documentId: number;
  title: string;
  statusLabel: string;
  isVerified: boolean;
  expiryLabel: string;
  viewUrl: string | null;
};

type PermitsLicensesFormProps = {
  documents: PermitRow[];
  saveAction: (formData: FormData) => Promise<void>;
};

export function PermitsLicensesForm({
  documents,
  saveAction,
}: PermitsLicensesFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<number, string>>({});

  const hasPendingChanges = useMemo(
    () => Object.keys(selectedFiles).length > 0,
    [selectedFiles],
  );

  function handleFileChange(documentId: number, fileList: FileList | null) {
    const file = fileList?.[0];

    setSelectedFiles((current) => {
      if (!file) {
        const next = { ...current };
        delete next[documentId];
        return next;
      }

      return {
        ...current,
        [documentId]: file.name,
      };
    });
  }

  function handleDiscardChanges() {
    formRef.current?.reset();
    setSelectedFiles({});
  }

  return (
    <form ref={formRef} action={saveAction}>
      <section className="overflow-hidden rounded-[18px] border border-[#E8EDF5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <div className="border-b border-[#EEF2F7] px-[20px] pb-[10px] pt-[18px]">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em] text-[#23416A]">
            BUSINESS PERMITS &amp; LICENSES
          </h2>
          <p className="mt-[4px] text-[14px] text-[#9CA8B9]">
            Keep your permits up to date. Re-upload when renewed.
          </p>
        </div>

        <div className="px-[14px] py-[14px]">
          {documents.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#DCE4EF] bg-[#FBFCFE] px-[16px] py-[18px] text-[12px] text-[#98A3B4]">
              No uploaded permits or license documents found for this supplier account yet.
            </div>
          ) : (
            <div className="space-y-[10px]">
              {documents.map((document) => {
                const hasNewFile = Boolean(selectedFiles[document.documentId]);

                return (
                  <div
                    key={document.documentId}
                    className={`flex items-center justify-between gap-[14px] rounded-[14px] px-[14px] py-[12px] transition ${
                      hasNewFile
                        ? "bg-[#F5F8FF] ring-1 ring-inset ring-[#D5E1FF]"
                        : "bg-[#FAFBFD]"
                    }`}
                  >
                    <input type="hidden" name="document_ids" value={document.documentId} />
                    <input
                      ref={(node) => {
                        inputRefs.current[document.documentId] = node;
                      }}
                      type="file"
                      name={`document_file_${document.documentId}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(event) =>
                        handleFileChange(document.documentId, event.target.files)
                      }
                    />

                    <div className="flex min-w-0 items-center gap-[12px]">
                      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#E5F5E8] text-[#7DBA8D]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[16px] w-[16px]"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M8 4.75h5.5l3.75 3.75v10.75A1.75 1.75 0 0 1 15.5 21H8.5A1.75 1.75 0 0 1 6.75 19.25V6.5A1.75 1.75 0 0 1 8.5 4.75Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13.5 4.75V8.5h3.75M9.5 12h5M9.5 15.25h5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-[8px]">
                          <p className="truncate text-[14px] font-semibold text-[#3A4A64]">
                            {document.title}
                          </p>
                          {document.isVerified ? (
                            <span className="inline-flex h-[18px] items-center rounded-[6px] border border-[#A9C7FF] bg-white px-[6px] text-[9px] font-semibold text-[#4E86FF]">
                              {document.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-[2px] text-[13px] text-[#A0AABA]">
                          {hasNewFile
                            ? `Selected: ${selectedFiles[document.documentId]}`
                            : document.expiryLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-[6px]">
                      {document.viewUrl ? (
                        <a
                          href={document.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-[31px] min-w-[68px] items-center justify-center rounded-[8px] border border-[#D8E1EC] bg-white px-[12px] text-[14px] font-medium text-[#58697F] transition hover:bg-[#F6F8FB]"
                        >
                          View File
                        </a>
                      ) : (
                        <span className="inline-flex h-[31px] min-w-[68px] items-center justify-center rounded-[8px] border border-[#E4EAF2] bg-white px-[12px] text-[14px] font-medium text-[#BCC6D4]">
                          View File
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => inputRefs.current[document.documentId]?.click()}
                        className="inline-flex h-[31px] min-w-[82px] items-center justify-center rounded-[8px] bg-[#243F69] px-[12px] text-[14px] font-medium text-white transition hover:bg-[#1C3558]"
                      >
                        Update File
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between px-[2px] pt-[210px]">
        <p className="text-[13px] text-[#98A3B4]">Changes are not saved automatically.</p>

        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={handleDiscardChanges}
            className="inline-flex h-[33px] items-center justify-center rounded-[8px] border border-[#DDE5EF] bg-white px-[14px] text-[13px] font-medium text-[#6E7E93] transition hover:bg-[#FAFBFD]"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={!hasPendingChanges}
            className="inline-flex h-[33px] items-center justify-center rounded-[8px] bg-[#3C78F6] px-[16px] text-[13px] font-semibold text-white transition hover:bg-[#3169DF] disabled:cursor-not-allowed disabled:bg-[#AFC4FA]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}
