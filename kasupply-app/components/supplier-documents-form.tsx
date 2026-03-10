"use client";

import { useState, useTransition } from "react";
import { uploadSupplierDocument } from "@/app/onboarding/supplier-documents/actions";

export function SupplierDocumentsForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await uploadSupplierDocument(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="doc_type_id" className="text-sm font-medium">
          Document Type
        </label>
        <select
          id="doc_type_id"
          name="doc_type_id"
          required
          className="w-full rounded-md border px-3 py-2"
          defaultValue=""
        >
          <option value="" disabled>
            Select document type
          </option>
          <option value="1">DTI</option>
          <option value="2">SEC</option>
          <option value="3">Mayor&apos;s Permit</option>
          <option value="4">BIR</option>
          <option value="5">FDA Permit</option>

        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">
          Upload Document
        </label>
        <input
          id="document"
          name="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Uploading..." : "Submit Document"}
      </button>
    </form>
  );
}