"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Logout
      </Button>

      <ConfirmModal
        isOpen={isOpen}
        title="Log out?"
        description="You will be signed out of your supplier account and returned to the login page."
        confirmLabel={isSubmitting ? "Logging out..." : "Confirm Logout"}
        onConfirm={logout}
        onCancel={() => setIsOpen(false)}
        isSubmitting={isSubmitting}
        tone="danger"
      />
    </>
  );
}
