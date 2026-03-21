import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

function DashboardPageFallback() {
  return <div className="p-6">Checking your account...</div>;
}

export default async function DashboardPage() {
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

    redirect("/dashboard/supplier");
  }

  redirect("/auth/login");

  // fallback UI if somehow no redirect occurs
  return <DashboardPageFallback />;
}
