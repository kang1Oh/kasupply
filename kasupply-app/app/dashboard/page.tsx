import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function DashboardPageFallback() {
  return <div className="p-6">Checking your account...</div>;
}

async function DashboardPageContent() {
  await connection();

  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.role === "buyer") {
    redirect("/buyer");
  }

  if (status.role === "supplier") {
    if (!status.hasBusinessProfile || !status.hasSupplierProfile) {
      redirect("/onboarding");
    }

    if (!status.hasSubmittedSupplierDocuments) {
      redirect("/onboarding/supplier-documents");
    }

    redirect("/supplier/notifications");
  }

  redirect("/auth/login");

  // fallback UI if somehow no redirect occurs
  return <DashboardPageFallback />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
