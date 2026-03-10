import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function getNavItems(role: string | null) {
  if (role === "supplier") {
    return {
      top: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/supplier/inventory", label: "Inventory" },
        { href: "/dashboard/supplier/rfq", label: "RFQ" },
        { href: "/dashboard/supplier/orders", label: "Orders" },
        { href: "/dashboard/supplier/invoices", label: "Invoices" },
        { href: "/dashboard/supplier/messages", label: "Messages" },
        { href: "/dashboard/supplier/bulletin-board", label: "Bulletin Board" },
      ],
      bottom: [
        {
          href: "/dashboard/supplier/account-settings",
          label: "Account Settings",
        },
      ],
    };
  }

  return {
    top: [{ href: "/dashboard", label: "Dashboard" }],
    bottom: [],
  };
}

function DashboardLayoutFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-white p-4">
          <h2 className="text-xl font-bold">KaSupply</h2>
          <p className="text-sm text-gray-500">Loading...</p>
        </aside>
        <main className="p-6">Loading dashboard...</main>
      </div>
    </div>
  );
}

async function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (
    status.role === "supplier" &&
    !status.hasSubmittedSupplierDocuments
  ) {
    redirect("/onboarding/supplier-documents");
  }

  const navItems = getNavItems(status.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="flex h-screen flex-col border-r bg-white p-4">
          <div>
            <h2 className="text-xl font-bold">KaSupply</h2>
            <p className="text-sm text-gray-500 capitalize">
              {status.role} panel
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.top.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t pt-4">
            {navItems.bottom.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </aside>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}