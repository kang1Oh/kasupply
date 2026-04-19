"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/modals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AdminSidebarAccountMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);

  const logout = async () => {
    const supabase = createClient();
    setIsSubmitting(true);

    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-[#e6edf6] bg-[#fbfcfe] p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#223654] text-sm font-semibold text-white">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#223654]">{name}</p>
            <p className="truncate text-xs text-[#6b7280]">{email}</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#dbe2ea] bg-white px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#64748b]">
              <Shield className="h-3.5 w-3.5" />
              {role}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open account menu"
                className="rounded-lg border border-[#dbe2ea] bg-white p-2 text-[#64748b] transition hover:bg-[#f4f7fb]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Admin account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setIsOpen(true);
                }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmModal
        isOpen={isOpen}
        title="Log out?"
        description="You will be signed out of the admin workspace and returned to the login page."
        confirmLabel={isSubmitting ? "Logging out..." : "Confirm Logout"}
        onConfirm={logout}
        onCancel={() => setIsOpen(false)}
        isSubmitting={isSubmitting}
        tone="danger"
      />
    </>
  );
}
