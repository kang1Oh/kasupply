"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/buyer", label: "Home" },
  { href: "/buyer/search", label: "Search" },
  { href: "/buyer/rfqs", label: "RFQs" },
  { href: "/buyer/transactions", label: "Transactions" },
  { href: "/buyer/messages", label: "Messaging" },
  { href: "/buyer/account", label: "Account" },
];

export function BuyerHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-gray-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/buyer" className="text-lg font-bold">
            KaSupply Buyer
          </Link>

          <nav className="flex items-center gap-5">
            {navItems.map((item) => {
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
          </nav>
        </div>
      </div>
    </header>
  );
}