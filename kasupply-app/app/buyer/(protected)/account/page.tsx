import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { BuyerAccountForm } from "@/components/buyer-account-form";
import { logoutBuyerAccount } from "./actions";

function BuyerAccountPageFallback() {
  return <div className="p-6">Loading buyer account...</div>;
}

type BuyerAccountPageProps = {
  searchParams: Promise<{
    edit?: string;
    required?: string;
  }>;
};

async function BuyerAccountPageContent({ searchParams }: BuyerAccountPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const isEditMode = params.edit === "1";
  const requiredFlow = params.required ?? "";

  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    throw new Error("Failed to load current user.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(`
      profile_id,
      business_name,
      business_type,
      business_location,
      city,
      province,
      region,
      about,
      contact_name,
      contact_number,
      created_at,
      updated_at
    `)
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError) {
    throw new Error(
      businessProfileError.message || "Failed to load business profile."
    );
  }

  const { data: businessDocument, error: businessDocumentError } = businessProfile
    ? await supabase
        .from("business_documents")
        .select(`
          doc_id,
          file_url,
          is_visible_to_others
        `)
        .eq("profile_id", businessProfile.profile_id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (businessDocumentError) {
    throw new Error(
      businessDocumentError.message || "Failed to load business document."
    );
  }

  let documentUrl: string | null = null;

    if (businessDocument?.file_url) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("business-documents")
        .createSignedUrl(businessDocument.file_url, 60 * 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
        documentUrl = signedUrlData.signedUrl;
    }
    }

  const fileName = businessDocument?.file_url?.split("/").pop() || "Uploaded document";
  const lowerFileName = fileName.toLowerCase();
  const isImageFile =
    lowerFileName.endsWith(".jpg") ||
    lowerFileName.endsWith(".jpeg") ||
    lowerFileName.endsWith(".png");
  const isPdfFile = lowerFileName.endsWith(".pdf");

  if (isEditMode) {
    return (
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {businessProfile ? "Edit Account" : "Set Up Buyer Business Details"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {requiredFlow === "rfq"
              ? "Set up your buyer business details before creating an RFQ."
              : businessProfile
                ? "Update your buyer account and business profile details."
                : "Add your buyer business details when you are ready to create RFQs or place orders."}
          </p>
        </div>

        <BuyerAccountForm
          user={{
            name: user.name,
            email: user.email,
          }}
          businessProfile={{
            business_name: businessProfile?.business_name ?? "",
            business_type: businessProfile?.business_type ?? "",
            contact_name: businessProfile?.contact_name ?? "",
            contact_number: businessProfile?.contact_number ?? "",
            business_location: businessProfile?.business_location ?? "",
            city: businessProfile?.city ?? "",
            province: businessProfile?.province ?? "",
            region: businessProfile?.region ?? "",
            about: businessProfile?.about ?? "",
          }}
          documentId={businessDocument?.doc_id ?? null}
          documentVisibility={businessDocument?.is_visible_to_others ?? false}
        />
      </main>
    );
  }

  if (!businessProfile) {
    return (
      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your buyer business details when you are ready to create an RFQ or place an order.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/buyer/account?edit=1"
              className="rounded-md border bg-gray-200 px-4 py-2 text-black transition hover:bg-black hover:text-white hover:border-white"
            >
              Set Up Business Details
            </Link>

            <form action={logoutBuyerAccount}>
              <button
                type="submit"
                className="rounded-md border border-red-500 px-4 py-2 text-red-500 transition hover:bg-red-500 hover:text-white"
              >
                Log Out
              </button>
            </form>
          </div>
        </div>

        <section className="rounded-xl border bg-black p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Business Profile</h2>
          <p className="mt-2 text-sm text-gray-400">
            You can skip buyer business setup for now. We&apos;ll only ask for these details when you start an RFQ or need them for ordering.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your buyer account and business profile details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/buyer/account?edit=1"
            className="rounded-md border bg-gray-200 px-4 py-2 text-black transition hover:bg-black hover:text-white hover:border-white"
          >
            Edit Account
          </Link>

          <form action={logoutBuyerAccount}>
            <button
              type="submit"
              className="rounded-md border border-red-500 px-4 py-2 text-red-500 transition hover:bg-red-500 hover:text-white"
            >
              Log Out
            </button>
          </form>
        </div>
      </div>

      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-medium">{user.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>

        </div>
      </section>

      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Business Profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Business Name</p>
            <p className="font-medium">{businessProfile.business_name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Business Type</p>
            <p className="font-medium">{businessProfile.business_type}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Contact Name</p>
            <p className="font-medium">{businessProfile.contact_name || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Contact Number</p>
            <p className="font-medium">{businessProfile.contact_number || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Business Location</p>
            <p className="font-medium">{businessProfile.business_location}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">City</p>
            <p className="font-medium">{businessProfile.city}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Province</p>
            <p className="font-medium">{businessProfile.province}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Region</p>
            <p className="font-medium">{businessProfile.region}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">About</p>
          <p className="font-medium">{businessProfile.about || "-"}</p>
        </div>
      </section>

      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Uploaded Certificate</h2>
        </div>

        <div>
          <p className="text-sm text-gray-500">Visibility to others</p>
          <p className="font-medium">
            {businessDocument?.is_visible_to_others ? "Visible" : "Hidden"}
          </p>
        </div>

        {!businessDocument || !documentUrl ? (
          <p className="text-sm text-gray-500">No document uploaded.</p>
        ) : isImageFile ? (
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <img
              src={documentUrl}
              alt="Buyer certificate"
              className="max-h-80 rounded-lg border object-contain"
            />
          </a>
        ) : isPdfFile ? (
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border p-4 hover:bg-gray-800"
          >
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-gray-500">Open PDF document</p>
          </a>
        ) : (
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border p-4 hover:bg-gray-50"
          >
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-gray-500">Open uploaded document</p>
          </a>
        )}
      </section>
    </main>
  );
}

export default function BuyerAccountPage(props: BuyerAccountPageProps) {
  return (
    <Suspense fallback={<BuyerAccountPageFallback />}>
      <BuyerAccountPageContent {...props} />
    </Suspense>
  );
}
