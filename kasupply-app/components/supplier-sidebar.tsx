"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AccountConfirmModal } from "@/components/modals";
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
  badge?: string | null;
  badgeClassName?: string;
};

function SidebarNavIcon({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={20}
      height={20}
      className="h-[20px] w-[20px]"
    />
  );
}

function SidebarPanelIcon({
  src,
  alt,
  size = 20,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

function ChevronPanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <SidebarPanelIcon
      src={collapsed ? "/icons/collapsed-panel.svg" : "/icons/sidebar-panel.svg"}
      alt={collapsed ? "Collapsed sidebar" : "Expanded sidebar"}
      size={collapsed ? 28 : 20}
    />
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatBusinessType(value: string) {
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems: NavItem[] = [
    {
      href: "/supplier/dashboard",
      label: "Dashboard",
      icon: <SidebarNavIcon src="/icons/dashboard-icon.svg" alt="Dashboard" />,
    },
    {
      href: "/supplier/inventory",
      label: "Inventory",
      icon: <SidebarNavIcon src="/icons/inventory-icon.svg" alt="Inventory" />,
    },
    {
      href: "/supplier/rfq",
      label: "RFQs",
      icon: <SidebarNavIcon src="/icons/rfq-icon.svg" alt="RFQs" />,
    },
    {
      href: "/supplier/purchase-orders",
      label: "Purchase Orders",
      icon: <SidebarNavIcon src="/icons/po-icon.svg" alt="Purchase Orders" />,
    },
    {
      href: "/supplier/messages",
      label: "Messages",
      icon: <SidebarNavIcon src="/icons/messages-icon.svg" alt="Messages" />,
    },
    {
      href: "/supplier/account-settings",
      label: "Account Setting",
      icon: <SidebarNavIcon src="/icons/user-icon.svg" alt="Account Setting" />,
    },
  ];

  async function handleLogout() {
    const supabase = createClient();
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setMobileOpen(false);
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D9E3F0] bg-white text-[#1E3A5F] shadow-[0_10px_30px_rgba(15,23,42,0.12)] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0F172A]/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <div
        aria-hidden="true"
        className={`hidden shrink-0 lg:block ${
          collapsed ? "lg:w-[76px]" : "lg:w-[248px]"
        }`}
      />

      <aside
        data-app-sidebar="true"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[#1E3A5F] text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] transition-[transform,opacity,filter,width] duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[76px]" : "w-[248px]"}`}
      >
        <div
          className={`border-b border-white/10 transition-all duration-300 ${
            collapsed ? "px-3 py-3" : "px-4 py-4"
          }`}
        >
          <div
            className={`flex items-start ${
              collapsed ? "justify-center" : "justify-between gap-3"
            }`}
          >
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-white shadow-sm">
                  <Image
                    src="/images/kasupply-logo.svg"
                    alt="KaSupply logo"
                    width={26}
                    height={26}
                    className="h-[26px] w-[26px]"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[20px] font-semibold leading-none tracking-[-0.02em]">
                    KaSupply
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-white/88">
                    Supplier Portal
                  </p>
                </div>
              </div>
            ) : null}

            <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
              <button
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                className="mt-0.5 hidden h-9 w-9 items-center justify-center rounded-[9px] bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white lg:inline-flex"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronPanelIcon collapsed={collapsed} />
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-white/18 bg-white/6 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <nav
          className={`flex-1 px-0 transition-all duration-300 ${
            collapsed ? "py-3" : "py-2.5"
          }`}
        >
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-center text-[16px] font-medium transition ${
                      isActive
                        ? "bg-white/12 text-white"
                        : "text-white/88 hover:bg-white/8 hover:text-white"
                    } ${
                      collapsed
                        ? "justify-center px-0 py-3.5"
                        : "gap-3 px-4 py-[12px]"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive ? (
                      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[#FF7A00]" />
                    ) : null}
                    <span className="shrink-0 text-white/90">{item.icon}</span>
                    {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                    {!collapsed && item.badge ? (
                      <span
                        className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.badgeClassName ?? "bg-white/15 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={`border-t border-white/10 transition-all duration-300 ${
            collapsed ? "px-2 py-3" : "px-2.5 py-2"
          }`}
        >
          <div
            className={`rounded-xl bg-white/4 transition-all duration-300 ${
              collapsed
                ? "flex items-center justify-center px-1 py-1"
                : "flex items-center gap-2 px-2 py-2"
            }`}
          >
            {!collapsed ? (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF2E5] text-[11px] font-semibold text-[#2B6C4A]">
                  {getInitials(businessName)}
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <p
                    className="truncate text-[14px] font-semibold leading-tight text-white"
                    title={businessName}
                  >
                    {businessName}
                  </p>
                  <p
                    className="mt-0 truncate text-[13px] leading-tight text-white/70"
                    title={formatBusinessType(businessType)}
                  >
                    {formatBusinessType(businessType)}
                  </p>
                </div>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      <AccountConfirmModal
        isOpen={showLogoutModal}
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
        description={<p>Are you sure you want to log out of your account?</p>}
        cancelLabel="Stay"
        confirmLabel={isLoggingOut ? "Logging out..." : "Log Out"}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        isSubmitting={isLoggingOut}
      />
    </>
  );
}