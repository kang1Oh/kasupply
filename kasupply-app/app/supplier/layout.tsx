import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { LogoutButton } from "@/components/logout-button";

function getSupplierNavItems() {
  return {
    top: [
      { href: "/supplier/dashboard", label: "Dashboard" },
      { href: "/supplier/inventory", label: "Inventory" },
      { href: "/supplier/rfq", label: "RFQ" },
      { href: "/supplier/purchase-orders", label: "Purchase Orders" },
      { href: "/supplier/messages", label: "Messages" },
    ],
    bottom: [
      { href: "/supplier/account-settings", label: "Account Settings" },
    ],
  };
}

function SupplierLayoutFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-white p-4">
          <h2 className="text-xl font-bold">KaSupply</h2>
          <p className="text-sm text-gray-500">Loading...</p>
        </aside>
        <main className="p-6">Loading supplier panel...</main>
      </div>
    </div>
  );
}

async function SupplierLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.role !== "supplier") {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (!status.hasSubmittedRequiredSupplierDocuments) {
    redirect("/onboarding/supplier-documents");
  }

  if (!status.hasSubmittedSiteVideo) {
    redirect("/onboarding/supplier-site-video");
  }

  const navItems = getSupplierNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="flex h-screen flex-col border-r bg-white p-4">
          <div>
            <h2 className="text-xl font-bold">KaSupply</h2>
            <p className="text-sm text-gray-500 capitalize">supplier panel</p>
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

            <div className="mt-3 px-3">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SupplierLayoutFallback />}>
      <SupplierLayoutContent>{children}</SupplierLayoutContent>
    </Suspense>
  );
}
