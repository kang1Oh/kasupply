"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const publicNavItems = [
  { href: "/buyer", label: "Home" },
  { href: "/buyer/search", label: "Search" },
];

const protectedNavItems = [
  { href: "/buyer/rfqs", label: "RFQs" },
  { href: "/buyer/sourcing-board", label: "Sourcing Board" },
  { href: "/buyer/purchase-orders", label: "Purchase Orders" },
  { href: "/buyer/messages", label: "Messaging" },
  { href: "/buyer/account", label: "Account" },
];

type BuyerHeaderProps = {
  isLoggedIn: boolean;
  role: string | null;
};

export function BuyerHeader({ isLoggedIn, role }: BuyerHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const canAccessProtectedBuyerTabs = isLoggedIn && role === "buyer";

  return (
    <>
      <header className="border-b bg-gray-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/buyer" className="text-lg font-bold">
              KaSupply
            </Link>

            <nav className="flex items-center gap-5">
              {publicNavItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm transition ${
                      isActive
                        ? "font-semibold text-white"
                        : "text-white hover:text-black"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {protectedNavItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                if (canAccessProtectedBuyerTabs) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-sm transition ${
                        isActive
                          ? "font-semibold text-white"
                          : "text-white hover:text-black"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => setShowModal(true)}
                    className={`text-sm transition ${
                      isActive
                        ? "font-semibold text-white"
                        : "text-white hover:text-black"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border bg-black p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white">Login required</h2>
            <p className="mt-2 text-sm text-gray-300">
              Please log in or create a buyer account to access RFQs, purchase
              orders, messaging, and account features.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border px-4 py-2 text-sm text-white hover:bg-gray-900"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => router.push("/auth/sign-up")}
                className="rounded-md border px-4 py-2 text-sm text-white hover:bg-gray-900"
              >
                Sign Up
              </button>

              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="rounded-md bg-white px-4 py-2 text-sm text-black hover:bg-gray-200"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}