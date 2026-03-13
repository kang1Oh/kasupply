"use client";

import { useState, useTransition } from "react";
import { uploadBuyerDocument } from "@/app/onboarding/buyer-documents/actions";

export function BuyerDocumentsForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await uploadBuyerDocument(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">
          Upload DTI Certificate
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