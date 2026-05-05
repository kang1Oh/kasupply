"use client";

import { useState, useTransition } from "react";

type QrDebugResult = {
  file?: {
    name?: string;
    mimeType?: string;
    sizeBytes?: number;
  };
  decoded?: boolean;
  payloadType?: string;
  payloadText?: string | null;
  parsedLegacyFields?: Record<string, unknown> | null;
  bnrsAuthority?: Record<string, unknown> | null;
  notes?: string[];
  error?: string;
};

export function QrDebugTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<QrDebugResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!selectedFile) {
      setError("Choose a QR image first.");
      return;
    }

    setError("");
    setResult(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/dev/qr-decode", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as QrDebugResult;

        if (!response.ok) {
          throw new Error(data.error || "QR debug request failed.");
        }

        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "QR debug request failed."
        );
      }
    });
  };

  return (
    <div className="space-y-6 rounded-[18px] border border-[#e7ebf2] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div>
        <h1 className="text-[24px] font-semibold text-[#223654]">QR Debug Tool</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Upload a pure QR image or a full document image to see whether the local QR
          decoder can read it before running onboarding verification.
        </p>
      </div>

      <div className="space-y-3 rounded-[14px] border border-dashed border-[#d7dee8] bg-[#fafbfd] p-5">
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.bmp"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
            setError("");
            setResult(null);
          }}
          className="block w-full text-sm text-[#475569] file:mr-4 file:rounded-md file:border-0 file:bg-[#294773] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#20395d]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedFile || isPending}
          className="rounded-md bg-[#1f3d67] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193354] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Checking..." : "Check QR Decode"}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-md border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]">
            <p>
              <strong>Decoded:</strong> {result.decoded ? "Yes" : "No"}
            </p>
            <p>
              <strong>Payload type:</strong> {result.payloadType ?? "unknown"}
            </p>
            <p>
              <strong>File:</strong> {result.file?.name ?? "unknown"}
            </p>
          </div>

          {Array.isArray(result.notes) && result.notes.length > 0 ? (
            <div className="rounded-md border border-[#dbe4f0] bg-white px-4 py-3 text-sm text-[#475569]">
              <p className="font-medium text-[#223654]">Notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-md border border-[#dbe4f0] bg-white px-4 py-3">
            <p className="mb-2 text-sm font-medium text-[#223654]">Raw Result</p>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-[#334155]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
