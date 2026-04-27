"use client";

import Image from "next/image";
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
      <section className="overflow-hidden rounded-[24px] border border-[#E6ECF3] bg-white shadow-[0_3px_10px_rgba(15,23,42,0.025)]">
        <div className="border-b border-[#EEF2F7] px-[22px] py-[18px]">
          <h2 className="text-[16px] font-semibold uppercase tracking-[0.02em] text-[#23416A]">
            BUSINESS PERMITS &amp; LICENSES
          </h2>
          <p className="text-[15px] font-normal text-[#9CA8B9]">
            Keep your permits up to date. Re-upload when renewed.
          </p>
        </div>

        <div className="px-[22px] py-[22px]">
          {documents.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#DCE4EF] bg-[#FBFCFE] px-[24px] py-[34px] text-[15px] text-[#98A3B4]">
              No uploaded permits or license documents found for this supplier account yet.
            </div>
          ) : (
            <div className="space-y-[18px]">
              {documents.map((document) => {
                const hasNewFile = Boolean(selectedFiles[document.documentId]);

                return (
                  <div
                    key={document.documentId}
                    className={`flex items-center justify-between gap-[20px] rounded-[22px] px-[22px] py-[18px] transition ${
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

                    <div className="flex min-w-0 items-center gap-[14px]">
                      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-[#D6EEE0]">
                        <Image
                          src="/icons/document.svg"
                          alt=""
                          width={24}
                          height={24}
                          className="h-[24px] w-[24px]"
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-[8px]">
                          <p className="truncate text-[18px] font-medium text-[#1E3A5F]">
                            {document.title}
                          </p>
                          {document.isVerified ? (
                            <span className="inline-flex h-[18px] items-center rounded-[11px] border border-[#2563EB] bg-white px-[8px] text-[11px] font-semibold text-[#2563EB]">
                              {document.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[16px] font-normal text-[#A0AABA]">
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
                          className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-[10px] border border-[#D8E1EC] bg-white px-[14px] text-[15px] font-medium text-[#58697F] transition hover:bg-[#F6F8FB]"
                        >
                          View File
                        </a>
                      ) : (
                        <span className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-[10px] border border-[#E4EAF2] bg-white px-[14px] text-[15px] font-medium text-[#BCC6D4]">
                          View File
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => inputRefs.current[document.documentId]?.click()}
                        className="inline-flex h-[40px] min-w-[120px] items-center justify-center rounded-[10px] bg-[#243F69] px-[16px] text-[15px] font-medium text-white transition hover:bg-[#1C3558]"
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

      <div className="mt-[20px] flex items-center justify-between px-[2px]">
        <p className="text-[14px] text-[#98A3B4]">Changes are not saved automatically.</p>

        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={handleDiscardChanges}
            className="inline-flex h-[50px] items-center justify-center rounded-[10px] border border-[#D7DFEB] bg-white px-[18px] text-[15px] font-medium text-[#5C6A7E] transition hover:bg-[#F8FAFC]"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={!hasPendingChanges}
            className="inline-flex h-[50px] items-center justify-center rounded-[10px] bg-[#2F6CF6] px-[18px] text-[15px] font-medium text-white transition hover:bg-[#245CE0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}
