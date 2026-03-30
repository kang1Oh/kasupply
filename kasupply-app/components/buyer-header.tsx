"use client";

import { ModalShell } from "@/components/modals";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const publicNavItems = [
  { href: "/buyer", label: "Home" },
  { href: "/buyer/search", label: "Search" },
];

const protectedNavItems = [
  { href: "/buyer/rfqs", label: "RFQ" },
  { href: "/buyer/sourcing-board", label: "Sourcing Board" },
  { href: "/buyer/purchase-orders", label: "Purchase Orders" },
];

type BuyerAccessLinks = {
  rfqs?: string;
  sourcingBoard?: string;
  purchaseOrders?: string;
  messages?: string;
  notifications?: string;
  account?: string;
};

type BuyerHeaderProps = {
  isLoggedIn: boolean;
  userName?: string | null;
  accessLinks?: BuyerAccessLinks;
  unreadNotificationCount?: number;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 4.25a4.75 4.75 0 0 0-4.75 4.75v2.55c0 .9-.25 1.78-.72 2.54l-1.14 1.83a1.5 1.5 0 0 0 1.27 2.28h10.68a1.5 1.5 0 0 0 1.27-2.28l-1.14-1.83a4.86 4.86 0 0 1-.72-2.54V9A4.75 4.75 0 0 0 12 4.25Zm0 15.5a2.5 2.5 0 0 0 2.33-1.6H9.67A2.5 2.5 0 0 0 12 19.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7.5 5.25h9A2.25 2.25 0 0 1 18.75 7.5v6A2.25 2.25 0 0 1 16.5 15.75h-5.36l-3.55 2.83a.75.75 0 0 1-1.22-.59v-2.24A2.25 2.25 0 0 1 4.5 13.5v-6A2.25 2.25 0 0 1 6.75 5.25Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitials(name: string | null | undefined) {
  const safeName = String(name || "").trim();
  if (!safeName) {
    return "BU";
  }

  const parts = safeName.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "BU";
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/buyer") {
    return pathname === "/buyer";
  }

  if (href === "/buyer/search") {
    return pathname === "/buyer/search";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BuyerHeader({
  isLoggedIn,
  userName,
  accessLinks,
  unreadNotificationCount = 0,
}: BuyerHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const initials = getInitials(userName);
  const protectedNavHrefs: Record<string, string> = {
    "/buyer/rfqs": accessLinks?.rfqs ?? "/buyer/rfqs",
    "/buyer/sourcing-board":
      accessLinks?.sourcingBoard ?? "/buyer/sourcing-board",
    "/buyer/purchase-orders":
      accessLinks?.purchaseOrders ?? "/buyer/purchase-orders",
  };
  const messagesHref = accessLinks?.messages ?? "/buyer/messages";
  const notificationsHref = accessLinks?.notifications ?? "/buyer/notifications";
  const accountHref = accessLinks?.account ?? "/buyer/account";
  const isNotificationsActive = pathname === "/buyer/notifications";
  const showUnreadDot = unreadNotificationCount > 0;

  return (
    <>
      <header className="border-b border-[#3a557f] bg-[#243f68] text-white">
        <div className="flex h-14 w-full items-center px-6 sm:px-7 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <Link href="/buyer" className="flex items-center gap-2.5">
              <Image
                src="/images/kasupply-logo.svg"
                alt="KaSupply logo"
                width={26}
                height={26}
                className="h-[26px] w-[26px] rounded-[5px] bg-white p-[3px]"
                priority
              />
              <span className="text-[15px] font-semibold leading-none">KaSupply</span>
            </Link>
          </div>

          <nav className="hidden flex-none items-center justify-center gap-1.5 lg:flex">
            {publicNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition ${
                    isActive
                      ? "rounded-lg bg-[#4e678c] px-4 py-2 text-[13px] font-medium text-white"
                      : "rounded-lg px-4 py-2 text-[13px] font-medium text-[#dbe4f2] hover:bg-[#2d4a76] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {protectedNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              if (isLoggedIn) {
                return (
                  <Link
                    key={item.href}
                    href={protectedNavHrefs[item.href] ?? item.href}
                    className={`transition ${
                      isActive
                        ? "rounded-lg bg-[#4e678c] px-4 py-2 text-[13px] font-medium text-white"
                        : "rounded-lg px-4 py-2 text-[13px] font-medium text-[#dbe4f2] hover:bg-[#2d4a76] hover:text-white"
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
                  className={`transition ${
                    isActive
                      ? "rounded-lg bg-[#4e678c] px-4 py-2 text-[13px] font-medium text-white"
                      : "rounded-lg px-4 py-2 text-[13px] font-medium text-[#dbe4f2] hover:bg-[#2d4a76] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <Link
                  href={notificationsHref}
                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    isNotificationsActive
                      ? "border-[#8da8d2] bg-[#2d4a76] text-white"
                      : "border-[#5f789d] text-[#dbe4f2] hover:bg-[#2d4a76] hover:text-white"
                  }`}
                  aria-label={
                    showUnreadDot
                      ? `Notifications (${unreadNotificationCount} unread)`
                      : "Notifications"
                  }
                >
                  <BellIcon />
                  {showUnreadDot ? (
                    <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-[#ff5331]" />
                  ) : null}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#5f789d] text-[#dbe4f2] transition hover:bg-[#2d4a76] hover:text-white"
                  aria-label="Notifications"
                >
                  <BellIcon />
                </button>
              )}

              {isLoggedIn ? (
                <Link
                  href={messagesHref}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#5f789d] text-[#dbe4f2] transition hover:bg-[#2d4a76] hover:text-white"
                  aria-label="Messages"
                >
                  <MessageIcon />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#5f789d] text-[#dbe4f2] transition hover:bg-[#2d4a76] hover:text-white"
                  aria-label="Messages"
                >
                  <MessageIcon />
                </button>
              )}
            </div>

            <div className="h-9 w-px bg-[#6f84a5]" />

            {isLoggedIn ? (
              <Link
                href={accountHref}
                aria-label="Open buyer account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3f73e0] text-[10px] font-semibold text-white transition hover:scale-[1.03]"
              >
                {initials}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label="Open buyer account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3f73e0] text-[10px] font-semibold text-white transition hover:scale-[1.03]"
              >
                {initials}
              </button>
            )}
          </div>
        </div>
      </header>

      {!isLoggedIn && showModal ? (
        <ModalShell
          title="Login required"
          description="Please log in or create a buyer account to access RFQs, purchase orders, messaging, and account features."
          maxWidthClassName="max-w-md"
          panelClassName="rounded-2xl border border-[#d7dee8] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
          overlayClassName="bg-[#0f172a]/45 px-4"
        >
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-md border border-[#d7dee8] px-4 py-2 text-sm text-[#223654] transition hover:bg-[#f8fafc]"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="rounded-md border border-[#d7dee8] px-4 py-2 text-sm text-[#223654] transition hover:bg-[#f8fafc]"
            >
              Sign Up
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-md bg-[#243f68] px-4 py-2 text-sm text-white transition hover:bg-[#1f3658]"
            >
              Log In
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
