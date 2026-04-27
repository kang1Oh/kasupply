"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
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
      width={18}
      height={18}
      className="h-[18px] w-[18px]"
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
  const [isSigningOut, setIsSigningOut] = useState(false);

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
      badge: "2 low",
      badgeClassName: "bg-[#FFEEE2] text-[#E9781B]",
    },
    {
      href: "/supplier/rfq",
      label: "RFQs",
      icon: <SidebarNavIcon src="/icons/rfq-icon.svg" alt="RFQs" />,
      badge: "3",
      badgeClassName: "bg-[#FFE8EC] text-[#F25F88]",
    },
    {
      href: "/supplier/purchase-orders",
      label: "Purchase Orders",
      icon: <SidebarNavIcon src="/icons/po-icon.svg" alt="Purchase Orders" />,
      badge: "2",
      badgeClassName: "bg-[#E8F8EE] text-[#2E8B57]",
    },
    {
      href: "/supplier/messages",
      label: "Messages",
      icon: <SidebarNavIcon src="/icons/messages-icon.svg" alt="Messages" />,
      badge: "2",
      badgeClassName: "bg-[#FFE8EC] text-[#F25F88]",
    },
    {
      href: "/supplier/account-settings",
      label: "Account Setting",
      icon: <SidebarNavIcon src="/icons/user-icon.svg" alt="Account Setting" />,
    },
  ];

  async function handleLogout() {
    const supabase = createClient();
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      setMobileOpen(false);
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
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
        className={`hidden shrink-0 lg:block ${collapsed ? "lg:w-[76px]" : "lg:w-[248px]"}`}
      />

      <aside
        data-app-sidebar="true"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[#1E3A5F] text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] transition-[transform,opacity,filter,width] duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[76px]" : "w-[248px]"}`}
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
                <p className="truncate text-[20px] font-semibold leading-none tracking-[-0.02em]">
                  KaSupply
                </p>
                <p className="mt-1 text-[11px] text-white/88">Supplier Portal</p>
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

      <nav className={`flex-1 px-0 transition-all duration-300 ${collapsed ? "py-3" : "py-2.5"}`}>
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
                  } ${collapsed ? "justify-center px-0 py-3.5" : "gap-3 px-4 py-[12px]"}`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive ? (
                    <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[#FF7A00]" />
                  ) : null}
                  <span className="shrink-0 text-white/90">{item.icon}</span>
                  {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                  {!collapsed && item.badge ? (
                    <span
                      className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold ${item.badgeClassName ?? "bg-white/15 text-white"}`}
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

      <div className={`border-t border-white/10 transition-all duration-300 ${collapsed ? "px-2 py-3" : "pl-3 pr-2 py-3"}`}>
        <div
          className={`rounded-xl bg-white/4 transition-all duration-300 ${
            collapsed
              ? "flex flex-col items-center gap-3 px-2 py-3"
              : "flex items-center gap-2.5 pl-3 pr-2 py-3"
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF2E5] text-[11px] font-semibold text-[#2B6C4A]">
            {collapsed ? getInitials(businessName) : getInitials(businessName)}
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1 pr-1">
              <p
                className="truncate text-[14px] font-semibold text-white"
                title={businessName}
              >
                {businessName}
              </p>
              <p
                className="truncate text-[13px] text-white/70"
                title={formatBusinessType(businessType)}
              >
                {formatBusinessType(businessType)}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className={`inline-flex items-center justify-center rounded-[9px] bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              collapsed ? "h-8 w-8" : "h-8 w-8"
            }`}
            aria-label="Log out"
            title="Log out"
          >
            <SidebarPanelIcon
              src="/icons/sidebar-panel.svg"
              alt="Sidebar panel"
            />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
