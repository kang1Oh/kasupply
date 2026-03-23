import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { logoutBuyerAccount } from "./actions";

function BuyerAccountPageFallback() {
  return <div className="p-6 text-sm text-[#8b95a5]">Loading buyer account...</div>;
}

function BuyerAccountBody({
  user,
  businessProfile,
  businessDocument,
  documentUrl,
  isImageFile,
  isPdfFile,
  fileName,
}: {
  user: {
    name: string;
    email: string;
  };
  businessProfile: {
    business_name: string;
    business_type: string;
    business_location: string;
    city: string;
    province: string;
    region: string;
    about: string | null;
    contact_name: string | null;
    contact_number: string | null;
  } | null;
  businessDocument: {
    is_visible_to_others: boolean | null;
  } | null;
  documentUrl: string | null;
  isImageFile: boolean;
  isPdfFile: boolean;
  fileName: string;
}) {
  if (!businessProfile) {
    return (
      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#223654]">Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your buyer business details when you are ready to create an RFQ or place an order.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding/buyer"
              className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
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

        <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-semibold text-[#223654]">Business Profile</h2>
          <p className="mt-2 text-sm text-[#8b95a5]">
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
          <h1 className="text-2xl font-bold text-[#223654]">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your buyer account and business profile details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/onboarding/buyer"
            className="rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
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

      <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-lg font-semibold text-[#223654]">User Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-[#8b95a5]">Full Name</p>
            <p className="font-medium text-[#223654]">{user.name}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Email</p>
            <p className="font-medium text-[#223654]">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-lg font-semibold text-[#223654]">Business Profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-[#8b95a5]">Business Name</p>
            <p className="font-medium text-[#223654]">{businessProfile.business_name}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Business Type</p>
            <p className="font-medium text-[#223654]">{businessProfile.business_type}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Contact Name</p>
            <p className="font-medium text-[#223654]">{businessProfile.contact_name || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Contact Number</p>
            <p className="font-medium text-[#223654]">{businessProfile.contact_number || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Business Location</p>
            <p className="font-medium text-[#223654]">{businessProfile.business_location}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">City</p>
            <p className="font-medium text-[#223654]">{businessProfile.city}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Province</p>
            <p className="font-medium text-[#223654]">{businessProfile.province}</p>
          </div>

          <div>
            <p className="text-sm text-[#8b95a5]">Region</p>
            <p className="font-medium text-[#223654]">{businessProfile.region}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#8b95a5]">About</p>
          <p className="font-medium text-[#223654]">{businessProfile.about || "-"}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#edf1f7] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-lg font-semibold text-[#223654]">Uploaded Certificate</h2>
        </div>

        <div>
          <p className="text-sm text-[#8b95a5]">Visibility to others</p>
          <p className="font-medium text-[#223654]">
            {businessDocument?.is_visible_to_others ? "Visible" : "Hidden"}
          </p>
        </div>

        {!businessDocument || !documentUrl ? (
          <p className="text-sm text-[#8b95a5]">No document uploaded.</p>
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
            className="block rounded-lg border border-[#d7dee8] p-4 transition hover:bg-[#f8fafc]"
          >
            <p className="font-medium text-[#223654]">{fileName}</p>
            <p className="text-sm text-[#8b95a5]">Open PDF document</p>
          </a>
        ) : (
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-[#d7dee8] p-4 transition hover:bg-[#f8fafc]"
          >
            <p className="font-medium text-[#223654]">{fileName}</p>
            <p className="text-sm text-[#8b95a5]">Open uploaded document</p>
          </a>
        )}
      </section>
    </main>
  );
}

type BuyerAccountPageProps = {
  searchParams: Promise<{
    edit?: string;
    required?: string;
    next?: string;
  }>;
};

async function BuyerAccountPageContent({ searchParams }: BuyerAccountPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const isEditMode = params.edit === "1";
  const nextPath = params.next ?? null;
  const requiredFlow = params.required ?? null;

  if (isEditMode) {
    const redirectParams = new URLSearchParams();

    if (nextPath) {
      redirectParams.set("next", nextPath);
    }

    if (requiredFlow) {
      redirectParams.set("required", requiredFlow);
    }

    redirect(
      `/onboarding/buyer${
        redirectParams.toString() ? `?${redirectParams.toString()}` : ""
      }`,
    );
  }

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

  return (
    <BuyerAccountBody
      user={{
        name: user.name,
        email: user.email,
      }}
      businessProfile={
        businessProfile
          ? {
              business_name: businessProfile.business_name,
              business_type: businessProfile.business_type,
              contact_name: businessProfile.contact_name,
              contact_number: businessProfile.contact_number,
              business_location: businessProfile.business_location,
              city: businessProfile.city,
              province: businessProfile.province,
              region: businessProfile.region,
              about: businessProfile.about,
            }
          : null
      }
      businessDocument={businessDocument}
      documentUrl={documentUrl}
      isImageFile={isImageFile}
      isPdfFile={isPdfFile}
      fileName={fileName}
    />
  );
}

export default function BuyerAccountPage(props: BuyerAccountPageProps) {
  return (
    <Suspense fallback={<BuyerAccountPageFallback />}>
      <BuyerAccountPageContent {...props} />
    </Suspense>
  );
}
