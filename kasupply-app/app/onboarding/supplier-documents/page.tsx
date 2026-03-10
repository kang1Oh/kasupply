import { redirect } from "next/navigation";
import { SupplierDocumentsForm } from "@/components/supplier-documents-form";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

export default async function SupplierDocumentsPage() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (status.role === "supplier" && status.hasSubmittedSupplierDocuments) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xl rounded-xl border p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-bold">Supplier Document Submission</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your business registration documents for verification.
        </p>

        <div className="mt-6">
          <SupplierDocumentsForm />
        </div>
      </div>
    </div>
  );
}