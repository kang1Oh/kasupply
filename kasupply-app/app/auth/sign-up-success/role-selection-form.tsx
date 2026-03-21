"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { chooseAccountRole } from "./actions";

type RoleOption = "buyer" | "supplier";

function BuyerIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#caeadf] lg:h-14 lg:w-14">
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#0c8a88] lg:h-8 lg:w-8" aria-hidden="true">
        <path
          d="M7 5a1 1 0 0 0 0 2h1.1l1.22 5.47A2 2 0 0 0 11.27 14H18a2 2 0 0 0 1.94-1.5l1.03-4A1 1 0 0 0 20 7H10.67l-.24-1.05A2 2 0 0 0 8.48 4.5H7Zm4.27 7L10.9 9h7.82l-.77 3ZM12 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function SupplierIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#ffe7d7] lg:h-14 lg:w-14">
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#ff9f1c] lg:h-8 lg:w-8" aria-hidden="true">
        <path
          d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V7h1a1 1 0 0 1 1 1v2a3 3 0 0 1-2 2.82V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5.18A3 3 0 0 1 3 10V8a1 1 0 0 1 1-1h1V4.5Zm2 2.5h3V5H7v2Zm5 0h5V5h-5v2Zm-5 5v6h10v-6h-2v2a1 1 0 1 1-2 0v-2h-2v2a1 1 0 1 1-2 0v-2H7Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function RoleCard({
  title,
  description,
  selected,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[194px] w-full flex-col items-center rounded-2xl border px-6 py-8 text-center transition lg:min-h-[228px] lg:px-8 lg:py-10 ${
        selected
          ? "border-[#d8e0ec] bg-white shadow-[0_6px_18px_rgba(40,71,115,0.06)]"
          : "border-[#e7ecf2] bg-white hover:border-[#d8e0ec]"
      }`}
    >
      {icon}
      <h2 className="mt-6 text-[19px] font-semibold leading-none text-[#294773] lg:text-[24px]">
        {title}
      </h2>
      <p className="mt-4 max-w-[250px] text-[15px] leading-7 text-[#7d838d] lg:max-w-[310px] lg:text-[18px] lg:leading-8">
        {description}
      </p>
    </button>
  );
}

export function RoleSelectionForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleOption>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedRole = window.localStorage.getItem("kasupply_selected_role");

    if (storedRole === "buyer" || storedRole === "supplier") {
      setSelectedRole(storedRole);
      return;
    }

    window.localStorage.setItem("kasupply_pending_role_selection", "true");
    window.localStorage.setItem("kasupply_selected_role", "buyer");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("kasupply_pending_role_selection", "true");
    window.localStorage.setItem("kasupply_selected_role", selectedRole);
  }, [selectedRole]);

  const continueLabel =
    selectedRole === "supplier" ? "Continue as Supplier" : "Continue as Buyer";

  return (
    <>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-12 lg:gap-6">
        <RoleCard
          title="I'm a Buyer"
          description="I source products and ingredients for my food or retail business. I want to find verified local suppliers."
          selected={selectedRole === "buyer"}
          onClick={() => setSelectedRole("buyer")}
          icon={<BuyerIcon />}
        />
        <RoleCard
          title="I'm a Supplier"
          description="I sell products to businesses. I want to get discovered by buyers and manage orders in one place."
          selected={selectedRole === "supplier"}
          onClick={() => setSelectedRole("supplier")}
          icon={<SupplierIcon />}
        />
      </div>

      {error ? (
        <div className="mx-auto mt-8 max-w-[460px] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-[14px] text-red-600 lg:text-[15px]">
          {error}
        </div>
      ) : null}

      <div className="mt-8 text-center lg:mt-10">
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem("kasupply_pending_role_selection");
                  window.localStorage.removeItem("kasupply_selected_role");
                }
                await chooseAccountRole(selectedRole);
                router.refresh();
              } catch (selectionError) {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("kasupply_pending_role_selection", "true");
                  window.localStorage.setItem("kasupply_selected_role", selectedRole);
                }
                setError(
                  selectionError instanceof Error
                    ? selectionError.message
                    : "Failed to save the selected role.",
                );
              }
            });
          }}
          className="inline-flex h-[52px] min-w-[266px] items-center justify-center rounded-full bg-[#294773] px-10 text-[15px] font-semibold text-white transition hover:bg-[#233d63] disabled:cursor-not-allowed disabled:opacity-60 lg:h-[58px] lg:min-w-[320px] lg:text-[17px]"
        >
          {isPending ? "Saving..." : continueLabel}
        </button>

        <p className="mt-3 text-[13px] text-[#989fa9] lg:text-[15px]">
          {disabled
            ? "Confirm your email and sign in to continue."
            : "Tap Continue To Proceed"}
        </p>
      </div>
    </>
  );
}
