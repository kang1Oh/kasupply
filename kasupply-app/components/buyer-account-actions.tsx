"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AccountConfirmModal, TrashCanModalIcon } from "@/components/modals";

type BuyerAccountActionsProps = {
  premiumLabel?: string;
  logoutLabel?: string;
  deleteLabel?: string;
};

type ActionTone = "default" | "danger" | "premium";

const toneStyles: Record<
  ActionTone,
  {
    icon: string;
    label: string;
  }
> = {
  default: {
    icon: "bg-[#f7f9fc] text-[#9aa6b8]",
    label: "text-[#223654]",
  },
  danger: {
    icon: "bg-[#fff2f2] text-[#ef6b6b]",
    label: "text-[#d74747]",
  },
  premium: {
    icon: "bg-[#fff8e8] text-[#d49a19]",
    label: "text-[#223654]",
  },
};

function PremiumRowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M12 4.75 14.15 9.1l4.8.7-3.47 3.38.82 4.77L12 15.7l-4.3 2.25.82-4.77L5.05 9.8l4.8-.7L12 4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
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
  description,
  tone = "default",
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  description?: string;
  tone?: ActionTone;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles = toneStyles[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-4 border-b border-[#edf2f7] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#fafbfd] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={`truncate text-[14px] font-medium ${styles.label}`}>
              {label}
            </p>

            {tone === "premium" && (
              <span className="rounded-full bg-[#fff3d1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b77900]">
                Premium
              </span>
            )}
          </div>

          {description && (
            <p className="mt-0.5 text-[12px] leading-[1.35] text-[#7b8798]">
              {description}
            </p>
          )}
        </div>
      </div>

      <ChevronIcon />
    </button>
  );
}

export function BuyerAccountActions({
  premiumLabel = "Upgrade Account",
  logoutLabel = "Log Out",
  deleteLabel = "Delete Account",
}: BuyerAccountActionsProps) {
  const router = useRouter();

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    if (isPending) return;

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("We couldn't log you out. Please try again.");
        return;
      }

      setIsLogoutOpen(false);
      router.replace("/login");
      router.refresh();
    });
  };

  const handleDeleteAccount = () => {
    // TODO: call your delete-account API/server action here.
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div className="overflow-hidden border border-[#edf2f7] bg-white">
        <ActionRow
          label={premiumLabel}
          description="Access better deals and exclusive buyer tools."
          tone="premium"
          icon={<PremiumRowIcon />}
          onClick={() => router.push("/buyer/premium-page")}
        />

        <ActionRow
          label={logoutLabel}
          icon={<LogoutRowIcon />}
          onClick={() => setIsLogoutOpen(true)}
          disabled={isPending}
        />

        <ActionRow
          label={deleteLabel}
          tone="danger"
          icon={<DeleteAccountRowIcon />}
          onClick={() => setIsDeleteOpen(true)}
        />
      </div>

      <AccountConfirmModal
        isOpen={isLogoutOpen}
        icon={
          <Image
            src="/icons/logout_icon.svg"
            alt=""
            width={36}
            height={36}
            aria-hidden="true"
          />
        }
        title="Log out?"
        description={
          <>
            <p>Are you sure you want to log out of your account?</p>

            {errorMessage && (
              <p className="mt-2 text-sm text-[#d74747]">{errorMessage}</p>
            )}
          </>
        }
        cancelLabel="Stay"
        confirmLabel={isPending ? "Logging out..." : "Log Out"}
        onCancel={() => {
          if (!isPending) {
            setErrorMessage(null);
            setIsLogoutOpen(false);
          }
        }}
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