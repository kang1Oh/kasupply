import { Suspense } from "react";
import type { ReactNode } from "react";
import { BuyerHeader } from "@/components/buyer-header";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

function BuyerLayoutFallback() {
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b bg-gray-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="text-lg font-bold">KaSupply</div>
            <nav className="flex items-center gap-5 text-sm text-white">
              <span>Home</span>
              <span>Search</span>
            </nav>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-6">Loading buyer area...</div>
    </div>
  );
}

async function BuyerLayoutContent({ children }: { children: ReactNode }) {
  const { user } = await getCurrentAppUser();

  return (
    <div className="min-h-screen bg-black">
      <BuyerHeader
        isLoggedIn={!!user}
        role={user?.roles?.role_name?.toLowerCase() ?? null}
      />
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </div>
  );
}

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<BuyerLayoutFallback />}>
      <BuyerLayoutContent>{children}</BuyerLayoutContent>
    </Suspense>
  );
}
