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
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M12 4.25a4.75 4.75 0 0 0-4.75 4.75v2.55c0 .9-.25 1.78-.72 2.54l-1.14 1.83a1.5 1.5 0 0 0 1.27 2.28h10.68a1.5 1.5 0 0 0 1.27-2.28l-1.14-1.83a4.86 4.86 0 0 1-.72-2.54V9A4.75 4.75 0 0 0 12 4.25Zm0 15.5a2.5 2.5 0 0 0 2.33-1.6H9.67A2.5 2.5 0 0 0 12 19.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M7.5 5.25h9A2.25 2.25 0 0 1 18.75 7.5v6A2.25 2.25 0 0 1 16.5 15.75h-5.36l-3.55 2.83a.75.75 0 0 1-1.22-.59v-2.24A2.25 2.25 0 0 1 4.5 13.5v-6A2.25 2.25 0 0 1 6.75 5.25Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getInitials(name: string | null | undefined) {
  const safeName = String(name || "").trim();
  if (!safeName) return "BU";

  return safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "BU";
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/buyer") return pathname === "/buyer";
  if (href === "/buyer/search") return pathname === "/buyer/search";
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
        <div className="flex h-[64px] w-full items-center px-6 sm:px-7 lg:px-8">
          
          {/* LEFT */}
          <div className="flex flex-1 items-center">
            <Link href="/buyer" className="flex items-center gap-2.5">
              <Image
                src="/images/kasupply-logo.svg"
                alt="KaSupply"
                width={50}
                height={50}
            className="h-[39px] w-[39px] rounded-lg border border-white/70 bg-white p-[3px]"
              />
              <span className="text-[19px] font-semibold">KaSupply</span>
            </Link>
          </div>

          {/* CENTER */}
          <nav className="hidden items-center gap-1.5 lg:flex">
            {[...publicNavItems, ...protectedNavItems].map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={
                    protectedNavHrefs[item.href] ?? item.href
                  }
                  className={`rounded-lg px-4 py-2.5 text-[15px] transition ${
                    isActive
                      ? "bg-[#4e678c] text-white"
                      : "text-[#dbe4f2] hover:bg-[#2d4a76] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT */}
          <div className="flex flex-1 items-center justify-end gap-4">
            
            {/* ICONS */}
            <div className="flex items-center gap-1.5">
              <Link
                href={notificationsHref}
                className="relative flex h-10 w-[43px] items-center justify-center rounded-lg border border-[#5f789d] bg-[#7B7B7C]/20 hover:bg-[#7B7B7C]/30"
              >
                <BellIcon />
                {showUnreadDot && (
                  <span className="absolute right-[9px] top-[7px] h-2.5 w-2.5 rounded-full bg-[#ff5331]" />
                )}
              </Link>

              <Link
                href={messagesHref}
                className="flex h-10 w-[43px] items-center justify-center rounded-lg border border-[#5f789d] bg-[#7B7B7C]/20 hover:bg-[#7B7B7C]/30"
              >
                <MessageIcon />
              </Link>
            </div>

            {/* DIVIDER (FIXED SPACING) */}
            <div className="mx-1 h-7 w-px bg-[#8ba0bd]" />

            {/* PROFILE */}
            <Link
              href={accountHref}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3f73e0] text-[15px] font-medium"
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>

      {/* MODAL */}
      {!isLoggedIn && showModal && (
        <ModalShell title="Login required">
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setShowModal(false)}>Close</button>
            <button onClick={() => router.push("/sign-up")}>Sign Up</button>
            <button onClick={() => router.push("/login")}>Log In</button>
          </div>
        </ModalShell>
      )}
    </>
  );
}