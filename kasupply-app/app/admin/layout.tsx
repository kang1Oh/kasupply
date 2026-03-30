import Link from "next/link";
import { Suspense } from "react";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [{ href: "/admin/dashboard", label: "Dashboard" }];

function AdminLayoutFallback() {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <div className="grid min-h-screen md:grid-cols-[270px_1fr]">
        <aside className="border-r border-[#e6edf6] bg-white p-5">
          <div className="h-7 w-28 rounded-md bg-[#eef3f9]" />
          <div className="mt-2 h-4 w-20 rounded-md bg-[#f3f6fb]" />
        </aside>
        <main className="p-6">Loading admin workspace...</main>
      </div>
    </div>
  );
}

async function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <div className="grid min-h-screen md:grid-cols-[270px_1fr]">
        <aside className="flex h-screen flex-col border-r border-[#e6edf6] bg-white p-5">
          <div>
            <h2 className="text-xl font-bold text-[#223654]">KaSupply</h2>
            <p className="text-sm text-[#8b95a5]">admin panel</p>
          </div>

          <nav className="mt-8 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-[#334155] transition hover:bg-[#f4f7fb]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#eef2f7] pt-4">
            <div className="px-3">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
