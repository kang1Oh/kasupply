"use client";

import { ModalShell } from "./modal-shell";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  tone?: "default" | "danger" | "dark";
};

const toneClassNameMap = {
  default: "bg-slate-900 hover:bg-slate-800",
  danger: "bg-red-600 hover:bg-red-500",
  dark: "bg-white text-black hover:bg-gray-200",
} as const;

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isSubmitting = false,
  tone = "default",
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      title={title}
      description={description}
      maxWidthClassName="max-w-md"
      panelClassName="rounded-2xl bg-white p-6 shadow-2xl"
      overlayClassName="bg-black/50 p-4"
    >
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className={`rounded px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassNameMap[tone]}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
