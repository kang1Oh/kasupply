"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type SupplierSidebarProps = {
  businessName: string;
  businessType: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <rect x="4.25" y="4.25" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.75" y="4.25" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4.25" y="13.75" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.75" y="13.75" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d="M12 3.75 19.25 7.5v9L12 20.25 4.75 16.5v-9L12 3.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4.75 7.5 12 11.25 19.25 7.5M12 11.25v9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function RfqIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d="M7.5 3.75h6l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-8A2.25 2.25 0 0 1 5.75 19V5.5A1.75 1.75 0 0 1 7.5 3.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 3.75V8h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PurchaseOrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d="M6.75 4.25h10.5A1.75 1.75 0 0 1 19 6v12a1.75 1.75 0 0 1-1.75 1.75H6.75A1.75 1.75 0 0 1 5 18V6a1.75 1.75 0 0 1 1.75-1.75Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 2.75v3M17 2.75v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d="M5.5 6.25A2.25 2.25 0 0 1 7.75 4h8.5a2.25 2.25 0 0 1 2.25 2.25v7A2.25 2.25 0 0 1 16.25 15.5H9.5L5.75 18v-2.5A2.25 2.25 0 0 1 3.5 13.25v-7A2.25 2.25 0 0 1 5.75 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d="M12 12.25a3.75 3.75 0 1 0-3.75-3.75A3.75 3.75 0 0 0 12 12.25Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19.25a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SidebarHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" aria-hidden="true">
      <rect x="4.5" y="2.75" width="15" height="18.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="7.25" y="5.75" width="4.5" height="12.5" rx="1.1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronPanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px]"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="2.75"
        width="15"
        height="18.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="7.25"
        y="5.75"
        width="4.5"
        height="12.5"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d={collapsed ? "M15.5 12h-2.5m0 0 1.3-1.3M13 12l1.3 1.3" : "M14 12h2.5m0 0-1.3-1.3M16.5 12l-1.3 1.3"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function normalizeBusinessType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/supplier/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SupplierSidebar({
  businessName,
  businessType,
}: SupplierSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navItems: NavItem[] = [
    { href: "/supplier/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { href: "/supplier/inventory", label: "Inventory", icon: <InventoryIcon /> },
    { href: "/supplier/rfq", label: "RFQs", icon: <RfqIcon /> },
    { href: "/supplier/purchase-orders", label: "Purchase Orders", icon: <PurchaseOrdersIcon /> },
    { href: "/supplier/messages", label: "Messages", icon: <MessageIcon /> },
    { href: "/supplier/account-settings", label: "Account Setting", icon: <UserIcon /> },
  ];

  async function handleLogout() {
    const supabase = createClient();
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col bg-[#1E3A5F] text-white transition-[width] duration-300 ease-out ${
        collapsed ? "w-[72px]" : "w-[230px]"
      }`}
    >
      <div
        className={`border-b border-white/10 transition-all duration-300 ${
          collapsed ? "px-3 py-3" : "px-4 py-5"
        }`}
      >
        <div
          className={`flex items-start ${
            collapsed ? "justify-center" : "justify-between gap-3"
          }`}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-white shadow-sm">
                <Image
                  src="/images/kasupply-logo.svg"
                  alt="KaSupply logo"
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px]"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[22px] font-semibold leading-none tracking-[-0.02em]">
                  KaSupply
                </p>
                <p className="mt-1 text-[11px] text-white/88">Supplier Portal</p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className={`inline-flex items-center justify-center rounded-[9px] border border-white/18 bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white ${
              collapsed ? "h-10 w-10" : "mt-0.5 h-9 w-9"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronPanelIcon collapsed={collapsed} />
          </button>
        </div>
      </div>

      <nav className={`flex-1 px-0 transition-all duration-300 ${collapsed ? "py-3" : "py-2.5"}`}>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`relative flex items-center text-[13px] font-medium transition ${
                    isActive
                      ? "bg-white/12 text-white"
                      : "text-white/88 hover:bg-white/8 hover:text-white"
                  } ${collapsed ? "justify-center px-0 py-3.5" : "gap-3 px-4 py-[12px]"}`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive ? (
                    <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[#FF7A00]" />
                  ) : null}
                  <span className="shrink-0 text-white/90">{item.icon}</span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`border-t border-white/10 transition-all duration-300 ${collapsed ? "px-2 py-3" : "pl-3 pr-2 py-3"}`}>
        <div
          className={`rounded-xl bg-white/4 transition-all duration-300 ${
            collapsed
              ? "flex flex-col items-center gap-3 px-2 py-3"
              : "flex items-center gap-2.5 pl-3 pr-2 py-3"
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF2E5] text-[11px] font-semibold text-[#2B6C4A]">
            {getInitials(businessName)}
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1 pr-1">
              <p
                className="truncate text-[11px] font-semibold text-white"
                title={businessName}
              >
                {businessName}
              </p>
              <p
                className="truncate text-[10px] text-white/70"
                title={normalizeBusinessType(businessType)}
              >
                {normalizeBusinessType(businessType)}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className={`inline-flex items-center justify-center rounded-[9px] border border-white/14 bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              collapsed ? "h-8 w-8" : "h-8 w-8"
            }`}
            aria-label="Log out"
            title="Log out"
          >
            <SidebarHeaderIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
