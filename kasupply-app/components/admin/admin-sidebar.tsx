"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  FileCog,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AdminSidebarProps = {
  name: string;
  email: string;
  role: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarPanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center">
      <span
        className={`absolute h-[2px] w-3 rounded-full bg-current transition-all ${
          collapsed ? "rotate-45" : "-translate-y-[3px]"
        }`}
      />
      <span
        className={`absolute h-[2px] w-3 rounded-full bg-current transition-all ${
          collapsed ? "-rotate-45" : "translate-y-[3px]"
        }`}
      />
    </div>
  );
}

export function AdminSidebar({ name, email, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navItems: NavItem[] = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.9} />,
    },
    {
      href: "/admin/accounts",
      label: "Accounts",
      icon: <Users className="h-[18px] w-[18px]" strokeWidth={1.9} />,
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: <Flag className="h-[18px] w-[18px]" strokeWidth={1.9} />,
    },
    {
      href: "/admin/moderation",
      label: "Moderation",
      icon: <Shield className="h-[18px] w-[18px]" strokeWidth={1.9} />,
    },
    {
      href: "/admin/requirements",
      label: "Requirements",
      icon: <FileCog className="h-[18px] w-[18px]" strokeWidth={1.9} />,
    },
  ];

  async function handleLogout() {
    const supabase = createClient();
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      setMobileOpen(false);
      router.push("/auth/login");
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
        aria-label="Open admin sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0F172A]/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close admin sidebar overlay"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[#1E3A5F] text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[76px]" : "w-[248px]"}`}
      >
        <div
          className={`border-b border-white/10 transition-all duration-300 ${
            collapsed ? "px-3 py-3" : "px-4 py-5"
          }`}
        >
          <div className={`flex items-start ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-white shadow-sm">
                  <span className="text-[18px] font-semibold tracking-[-0.03em] text-[#1E3A5F]">
                    K
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[20px] font-semibold leading-none tracking-[-0.02em]">
                    KaSupply
                  </p>
                  <p className="mt-1 text-[11px] text-white/88">Admin Portal</p>
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
                <SidebarPanelIcon collapsed={collapsed} />
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-white/18 bg-white/6 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Close admin sidebar"
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
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
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
                    {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={`border-t border-white/10 transition-all duration-300 ${
            collapsed ? "px-2 py-3" : "pl-3 pr-2 py-3"
          }`}
        >
          <div
            className={`rounded-xl bg-white/4 transition-all duration-300 ${
              collapsed
                ? "flex flex-col items-center gap-3 px-2 py-3"
                : "flex items-center gap-2.5 pl-3 pr-2 py-3"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF2E5] text-[11px] font-semibold text-[#2B6C4A]">
              {getInitials(name)}
            </div>

            {!collapsed ? (
              <div className="min-w-0 flex-1 pr-1">
                <p className="truncate text-[11px] font-semibold text-white" title={name}>
                  {name}
                </p>
                <p className="truncate text-[10px] text-white/70" title={email}>
                  {email}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.14em] text-white/88">
                  <BadgeCheck className="h-3 w-3" strokeWidth={1.9} />
                  {role}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
