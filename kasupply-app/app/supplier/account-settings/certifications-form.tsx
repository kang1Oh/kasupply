"use client";

import { useMemo, useRef, useState } from "react";

type CertificationRow = {
  certificationId: number;
  title: string;
  statusLabel: string;
  isVerified: boolean;
  expiryLabel: string;
  viewUrl: string | null;
};

type CertificationTypeOption = {
  certTypeId: number;
  label: string;
};

type CertificationsFormProps = {
  certifications: CertificationRow[];
  certificationTypes: CertificationTypeOption[];
  saveAction: (formData: FormData) => Promise<void>;
  addAction: (formData: FormData) => Promise<void>;
};

function AddCertificationModal({
  certificationTypes,
  addAction,
}: {
  certificationTypes: CertificationTypeOption[];
  addAction: (formData: FormData) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-[34px] items-center justify-center gap-[6px] rounded-[9px] bg-[#3C78F6] px-[14px] text-[13px] font-semibold text-white transition hover:bg-[#3169DF]"
      >
        <span className="text-[14px] leading-none">+</span>
        <span>Add Certification</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233F]/30 px-4">
          <div className="w-full max-w-[460px] rounded-[18px] border border-[#E5EBF4] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-[#223654]">
                  Add Certification
                </h3>
                <p className="mt-1 text-[12px] text-[#94A1B5]">
                  Upload a new supplier certification document.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#A1ADBF] transition hover:bg-[#F5F8FC] hover:text-[#6E8098]"
              >
                x
              </button>
            </div>

            <form action={addAction} className="px-5 py-5">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.03em] text-[#8F9DB1]">
                    Certification Type
                  </span>
                  <select
                    name="cert_type_id"
                    required
                    defaultValue=""
                    className="h-[42px] w-full rounded-[10px] border border-[#DCE4EF] bg-white px-3 text-[12px] text-[#324862] outline-none transition focus:border-[#7DA2FF]"
                  >
                    <option value="" disabled>
                      Select certification
                    </option>
                    {certificationTypes.map((type) => (
                      <option key={type.certTypeId} value={type.certTypeId}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.03em] text-[#8F9DB1]">
                      Issued Date
                    </span>
                    <input
                      type="date"
                      name="issued_at"
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE4EF] bg-white px-3 text-[12px] text-[#324862] outline-none transition focus:border-[#7DA2FF]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.03em] text-[#8F9DB1]">
                      Expiry Date
                    </span>
                    <input
                      type="date"
                      name="expires_at"
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE4EF] bg-white px-3 text-[12px] text-[#324862] outline-none transition focus:border-[#7DA2FF]"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.03em] text-[#8F9DB1]">
                    Certification File
                  </span>
                  <input
                    type="file"
                    name="certification_file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                    className="block w-full rounded-[10px] border border-[#DCE4EF] bg-white px-3 py-[10px] text-[12px] text-[#324862] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#EDF3FF] file:px-3 file:py-2 file:text-[11px] file:font-medium file:text-[#365EA8]"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#EEF2F7] pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-[34px] items-center justify-center rounded-[8px] border border-[#DDE5EF] bg-white px-[14px] text-[11px] font-medium text-[#6E7E93] transition hover:bg-[#FAFBFD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-[34px] items-center justify-center rounded-[8px] bg-[#3C78F6] px-[16px] text-[11px] font-semibold text-white transition hover:bg-[#3169DF]"
                >
                  Upload Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CertificationsForm({
  certifications,
  certificationTypes,
  saveAction,
  addAction,
}: CertificationsFormProps) {
  const formId = "supplier-certifications-update-form";
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<number, string>>({});

  const hasPendingChanges = useMemo(
    () => Object.keys(selectedFiles).length > 0,
    [selectedFiles],
  );

  function handleFileChange(certificationId: number, fileList: FileList | null) {
    const file = fileList?.[0];

    setSelectedFiles((current) => {
      if (!file) {
        const next = { ...current };
        delete next[certificationId];
        return next;
      }

      return {
        ...current,
        [certificationId]: file.name,
      };
    });
  }

  function handleDiscardChanges() {
    formRef.current?.reset();
    setSelectedFiles({});
  }

  return (
    <div>
      <section className="overflow-hidden rounded-[18px] border border-[#E8EDF5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EEF2F7] px-[20px] pb-[10px] pt-[18px]">
          <div>
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em] text-[#23416A]">
              CERTIFICATIONS
            </h2>
            <p className="mt-[4px] text-[14px] text-[#9CA8B9]">
              Add or update your quality and compliance certifications.
            </p>
          </div>

          <AddCertificationModal
            certificationTypes={certificationTypes}
            addAction={addAction}
          />
        </div>

        <form
          id={formId}
          ref={formRef}
          action={saveAction}
          className="px-[14px] py-[14px]"
        >
          {certifications.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#DCE4EF] bg-[#FBFCFE] px-[16px] py-[18px] text-[12px] text-[#98A3B4]">
              No certifications uploaded for this supplier account yet.
            </div>
          ) : (
            <div className="space-y-[10px]">
              {certifications.map((certification) => {
                const hasNewFile = Boolean(
                  selectedFiles[certification.certificationId],
                );

                return (
                  <div
                    key={certification.certificationId}
                    className={`flex items-center justify-between gap-[14px] rounded-[14px] px-[14px] py-[12px] transition ${
                      hasNewFile
                        ? "bg-[#F5F8FF] ring-1 ring-inset ring-[#D5E1FF]"
                        : "bg-[#FAFBFD]"
                    }`}
                  >
                    <input
                      type="hidden"
                      name="certification_ids"
                      value={certification.certificationId}
                    />
                    <input
                      ref={(node) => {
                        inputRefs.current[certification.certificationId] = node;
                      }}
                      type="file"
                      name={`certification_file_${certification.certificationId}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(event) =>
                        handleFileChange(
                          certification.certificationId,
                          event.target.files,
                        )
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
                            {certification.title}
                          </p>
                          {certification.isVerified ? (
                            <span className="inline-flex h-[18px] items-center rounded-[6px] border border-[#A9C7FF] bg-white px-[6px] text-[9px] font-semibold text-[#4E86FF]">
                              {certification.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-[2px] text-[13px] text-[#A0AABA]">
                          {hasNewFile
                            ? `Selected: ${selectedFiles[certification.certificationId]}`
                            : certification.expiryLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-[6px]">
                      {certification.viewUrl ? (
                        <a
                          href={certification.viewUrl}
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
                        onClick={() =>
                          inputRefs.current[certification.certificationId]?.click()
                        }
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
        </form>
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
            form={formId}
            disabled={!hasPendingChanges}
            className="inline-flex h-[33px] items-center justify-center rounded-[8px] bg-[#3C78F6] px-[16px] text-[13px] font-semibold text-white transition hover:bg-[#3169DF] disabled:cursor-not-allowed disabled:bg-[#AFC4FA]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
