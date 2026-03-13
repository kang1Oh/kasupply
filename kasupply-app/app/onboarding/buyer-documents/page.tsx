import { redirect } from "next/navigation";
import { BuyerDocumentsForm } from "@/components/buyer-documents-form";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

export default async function BuyerDocumentsPage() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (status.role !== "buyer") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Buyer Document Submission</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your DTI Business Registration Certificate for verification.
        </p>

        <div className="mt-6">
          <BuyerDocumentsForm />
        </div>
      </div>
    </div>
  );
}