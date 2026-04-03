"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AccountConfirmModal, TrashCanModalIcon } from "@/components/modals";

type BuyerAccountActionsProps = {
  logoutLabel?: string;
  deleteLabel?: string;
};

function LogoutModalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[30px] w-[30px]" aria-hidden="true">
      <path
        d="M10 6H7.5A2.5 2.5 0 0 0 5 8.5v7A2.5 2.5 0 0 0 7.5 18H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 8.5 17 12l-4 3.5M9.5 12H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6h4a2.5 2.5 0 0 1 2.5 2.5V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutRowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M10 6H7.5A2.5 2.5 0 0 0 5 8.5v7A2.5 2.5 0 0 0 7.5 18H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 8.5 17 12l-4 3.5M9.5 12H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6h4a2.5 2.5 0 0 1 2.5 2.5V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteAccountRowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M5.5 7.5h13M9 7.5V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7.5m-7.75 0 .7 10.2A2 2 0 0 0 9.95 19.5h4.1a2 2 0 0 0 2-1.8l.7-10.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10.5v5m4-5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#b7c2d3]" aria-hidden="true">
      <path
        d="m7 4 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionRow({
  label,
  tone = "default",
  icon,
  onClick,
}: {
  label: string;
  tone?: "default" | "danger";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const iconClassName =
    tone === "danger"
      ? "bg-[#fff2f2] text-[#ef6b6b]"
      : "bg-[#f7f9fc] text-[#9aa6b8]";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 border-b border-[#edf2f7] px-5 py-4 text-left transition hover:bg-[#fafbfd] last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}>
          {icon}
        </div>
        <p className={`text-[14px] ${tone === "danger" ? "text-[#d74747]" : "text-[#223654]"}`}>
          {label}
        </p>
      </div>
      <ChevronIcon />
    </button>
  );
}

export function BuyerAccountActions({
  logoutLabel = "Log Out",
  deleteLabel = "Delete Account",
}: BuyerAccountActionsProps) {
  const router = useRouter();
  const [isLoggingOutOpen, setIsLoggingOutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  const handleDeleteAccount = () => {
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div>
        <ActionRow
          label={logoutLabel}
          icon={<LogoutRowIcon />}
          onClick={() => setIsLoggingOutOpen(true)}
        />
        <ActionRow
          label={deleteLabel}
          tone="danger"
          icon={<DeleteAccountRowIcon />}
          onClick={() => setIsDeleteOpen(true)}
        />
      </div>

      <AccountConfirmModal
        isOpen={isLoggingOutOpen}
        icon={<LogoutModalIcon />}
        title="Log out?"
        description="Are you sure you want to log out of your account?"
        cancelLabel="Stay"
        confirmLabel={isPending ? "Discarding..." : "Discard"}
        onCancel={() => setIsLoggingOutOpen(false)}
        onConfirm={handleLogout}
        isSubmitting={isPending}
      />

      <AccountConfirmModal
        isOpen={isDeleteOpen}
        icon={<TrashCanModalIcon size={50} />}
        title="Delete account?"
        description="This action is permanent and cannot be undone. All your data will be removed."
        cancelLabel="Cancel"
        confirmLabel="Delete Account"
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        confirmTone="danger"
      />
    </>
  );
}
