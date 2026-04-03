"use client";

import { useRef, useTransition } from "react";

type DocumentUpdateButtonProps = {
  documentId: number;
  action: (formData: FormData) => Promise<void>;
};

export function DocumentUpdateButton({
  documentId,
  action,
}: DocumentUpdateButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await action(formData);
        });
      }}
    >
      <input type="hidden" name="document_id" value={documentId} />
      <input
        ref={inputRef}
        type="file"
        name="document"
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-[31px] min-w-[82px] items-center justify-center rounded-[8px] bg-[#243F69] px-[12px] text-[11px] font-medium text-white transition hover:bg-[#1C3558] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Updating..." : "Update File"}
      </button>
    </form>
  );
}
