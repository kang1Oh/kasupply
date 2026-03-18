import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { SupplierSiteVideoUploadForm } from "@/components/supplier-site-video-upload-form";

function SupplierSiteVideoPageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 p-6 md:p-10">
      <div className="w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        Loading site showcase upload...
      </div>
    </div>
  );
}

async function SupplierSiteVideoPageContent() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (status.role !== "supplier") {
    redirect("/dashboard");
  }

  if (!status.hasSubmittedRequiredSupplierDocuments) {
    redirect("/onboarding/supplier-documents");
  }

  const profileId = status.businessProfile?.profile_id;

  if (!profileId) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 p-6 md:p-10">
      <div className="w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Site Showcase Video Upload</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload a site showcase video showing your office, warehouse, signage,
          operational setup, safety standards, and location map or sketch.
        </p>

        <div className="mt-6 rounded-lg border bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-900">Video should include</h2>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            <li>• Physical office or warehouse</li>
            <li>• Business signage</li>
            <li>• Operational setup</li>
            <li>• Safety standards</li>
            <li>• Location map or sketch</li>
          </ul>
        </div>

        <div className="mt-6 rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-800">
          Current storage plan allows uploads up to <span className="font-medium">50 MB</span>.
          Please upload a compressed MP4 video for onboarding.
        </div>

        {status.siteVideo ? (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
            Existing uploaded video status:{" "}
            <span className="font-medium">{status.siteVideo.status}</span>
          </div>
        ) : null}

        <SupplierSiteVideoUploadForm
          profileId={profileId}
          existingFilePath={status.siteVideo?.file_url ?? null}
        />
      </div>
    </div>
  );
}

export default function SupplierSiteVideoPage() {
  return (
    <Suspense fallback={<SupplierSiteVideoPageFallback />}>
      <SupplierSiteVideoPageContent />
    </Suspense>
  );
}