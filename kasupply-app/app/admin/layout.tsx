import { Suspense } from "react";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

function AdminLayoutFallback() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="flex min-h-screen">
        <aside className="h-screen w-[230px] shrink-0 bg-[#1E3A5F] px-4 py-4 text-white">
          <div className="animate-pulse">
            <div className="h-10 w-32 rounded-xl bg-white/15" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-11 rounded-lg bg-white/10" />
              ))}
            </div>
            <div className="mt-[280px] h-14 rounded-xl bg-white/10" />
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
        </main>
      </div>
    </div>
  );
}

async function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdminUser();

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="flex min-h-screen">
        <AdminSidebar
          name={adminUser.name}
          email={adminUser.email}
          role={adminUser.roles?.role_name ?? "Admin"}
        />

        <main className="min-w-0 flex-1 p-6">{children}</main>
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
