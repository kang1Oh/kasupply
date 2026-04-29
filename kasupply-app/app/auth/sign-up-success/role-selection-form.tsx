"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { chooseAccountRole } from "./actions";
import { ShoppingCart, Store } from "lucide-react";

type RoleOption = "buyer" | "supplier";

function BuyerIcon({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-xl bg-[#ccefe7] transition-all duration-200 ${
        selected ? "ring-2 ring-[#294773]/20" : ""
      }`}
    >
      <ShoppingCart className="h-7 w-7 stroke-[2] text-[#008C95]" />
    </div>
  );
}

function SupplierIcon({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-xl bg-[#ffe4d1] transition-all duration-200 ${
        selected ? "ring-2 ring-[#294773]/20" : ""
      }`}
    >
      <Store className="h-7 w-7 stroke-[2] text-[#ff8a00]" />
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
      className={`flex min-h-[194px] w-full cursor-pointer flex-col items-center rounded-2xl px-6 py-8 text-center transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294773] focus-visible:ring-offset-2 lg:min-h-[228px] lg:px-8 lg:py-10 ${
        selected
          ? "border-2 border-[#294773] bg-[#f6f9fc] shadow-md"
          : "border border-[#e7ecf2] bg-white hover:-translate-y-1 hover:border-[#294773] hover:bg-[#f7faff] hover:shadow-md"
      }`}
    >
      {icon}

      <h2 className="mt-6 text-[19px] font-semibold leading-none text-[#294773] lg:text-[24px]">
        {title}
      </h2>

<p className="mt-4 max-w-[250px] text-[15px] font-normal leading-6 text-[#7d838d] lg:max-w-[310px] lg:text-[18px] lg:leading-7">
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
      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:mt-10 lg:gap-6">
        <RoleCard
          title="I'm a Buyer"
          description="I source products and ingredients for my food or retail business. I want to find verified local suppliers."
          selected={selectedRole === "buyer"}
          onClick={() => setSelectedRole("buyer")}
          icon={<BuyerIcon selected={selectedRole === "buyer"} />}
        />

        <RoleCard
          title="I'm a Supplier"
          description="I sell products to businesses. I want to get discovered by buyers and manage orders in one place."
          selected={selectedRole === "supplier"}
          onClick={() => setSelectedRole("supplier")}
          icon={<SupplierIcon selected={selectedRole === "supplier"} />}
        />
      </div>

      {error ? (
        <div className="mx-auto mt-8 max-w-[460px] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-[14px] text-red-600 lg:text-[15px]">
          {error}
        </div>
      ) : null}

      <div className="mt-8 text-center lg:mt-12">
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

                const message =
                  selectionError instanceof Error
                    ? selectionError.message
                    : "Failed to save the selected role.";

                if (message.includes("NEXT_REDIRECT")) {
                  return;
                }

                setError(message);
              }
            });
          }}
       className="inline-flex h-[52px] min-w-[330px] items-center justify-center rounded-full bg-[#294773] px-12 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-60 lg:h-[58px] lg:min-w-[390px] lg:text-[17px]"
        >
          {isPending ? "Saving..." : continueLabel}
        </button>

        <p className="mt-2 text-[13px] font-normal text-[#989fa9] lg:text-[16px]">
          {disabled
            ? "Confirm your email and sign in to continue."
            : "Tap Continue to proceed"}
        </p>
      </div>
    </>
  );
}