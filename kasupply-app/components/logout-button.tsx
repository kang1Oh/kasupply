"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Log out?</h2>
            <p className="mt-2 text-sm text-gray-600">
              You will be signed out of your supplier account and returned to the login page.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={logout}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging out..." : "Confirm Logout"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
