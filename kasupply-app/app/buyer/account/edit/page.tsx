import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { BuyerAccountAvatarSection } from "@/components/buyer-account-avatar-section";
import { BuyerAccountForm } from "@/components/buyer-account-form";
import { BusinessCategoriesStepForm } from "@/components/business-categories-step-form";
import { BuyerDocumentsForm } from "@/components/buyer-documents-form";
import { saveBusinessProfileCategories } from "@/app/onboarding/categories/actions";
import { isBuyerDtiDocumentTypeName } from "@/lib/verification/document-rules";

type BuyerAccountEditPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

type ProductCategoryRow = {
  category_id: number;
  category_name: string;
};

type BusinessProfileCategoryRow = {
  category_id: number;
};

type BusinessProfileCustomCategoryRow = {
  category_name: string;
};

type BuyerDocumentRow = {
  doc_id: number;
  file_url: string | null;
  status: string | null;
  review_notes: string | null;
  is_visible_to_others: boolean | null;
  document_types:
    | {
        document_type_name: string;
      }
    | null;
};

function SuccessBanner({ saved }: { saved: string | undefined }) {
  if (saved === "profile") {
    return (
      <div className="rounded-[16px] border border-[#bfe0cb] bg-[#f5fbf7] px-4 py-3 text-sm text-[#2f7f4d]">
        Your profile details were updated successfully.
      </div>
    );
  }

  if (saved === "categories") {
    return (
      <div className="rounded-[16px] border border-[#bfe0cb] bg-[#f5fbf7] px-4 py-3 text-sm text-[#2f7f4d]">
        Your buying categories were updated successfully.
      </div>
    );
  }

  return null;
}

export default async function BuyerAccountEditPage({
  searchParams,
}: BuyerAccountEditPageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    redirect("/auth/login?source=buyer-account-edit");
  }

  if (user.roles?.role_name?.toLowerCase() !== "buyer") {
    redirect("/dashboard");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select(
      `
        profile_id,
        business_name,
        business_type,
        contact_name,
        contact_number,
        business_location,
        city,
        province,
        region,
        about
      `
    )
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError) {
    throw new Error(businessProfileError.message || "Failed to load business profile.");
  }

  if (!businessProfile) {
    redirect("/onboarding/buyer");
  }

  const profileId = businessProfile.profile_id;

  const [{ data: categories }, { data: savedCategories }, { data: customCategories }, { data: buyerDocuments }] =
    await Promise.all([
      supabase
        .from("product_categories")
        .select("category_id, category_name")
        .order("category_name", { ascending: true }),
      supabase
        .from("business_profile_categories")
        .select("category_id")
        .eq("profile_id", profileId),
      supabase
        .from("business_profile_custom_categories")
        .select("category_name")
        .eq("profile_id", profileId),
      supabase
        .from("business_documents")
        .select(
          `
            doc_id,
            file_url,
            status,
            review_notes,
            is_visible_to_others,
            document_types!business_documents_doc_type_id_fkey (
              document_type_name
            )
          `
        )
        .eq("profile_id", profileId),
    ]);

  const currentDtiDocument =
    ((buyerDocuments as BuyerDocumentRow[] | null) ?? []).find((doc) =>
      isBuyerDtiDocumentTypeName(doc.document_types?.document_type_name ?? "")
    ) ?? null;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold text-[#1E3A5F]">
            Edit Buyer Profile
          </h1>
          <p className="mt-[2px] text-[16px] text-[#94A3B8]">
            Update your business details, sourcing categories, and DTI document from one place.
          </p>
        </div>
        <Link
          href="/buyer/account"
          className="rounded-[12px] border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#4a5568] transition hover:bg-[#f8fafc]"
        >
          Back to Account
        </Link>
      </div>

      <SuccessBanner saved={params.saved} />

      <BuyerAccountForm
        user={{
          name: user.name,
          email: user.email,
        }}
        businessProfile={{
          business_name: businessProfile.business_name,
          business_type: businessProfile.business_type,
          contact_name: businessProfile.contact_name,
          contact_number: businessProfile.contact_number,
          business_location: businessProfile.business_location,
          city: businessProfile.city,
          province: businessProfile.province,
          region: businessProfile.region,
          about: businessProfile.about,
        }}
        documentId={currentDtiDocument?.doc_id ?? null}
        documentVisibility={Boolean(currentDtiDocument?.is_visible_to_others)}
        mode="edit"
        backHref={null}
        returnPath="/buyer/account/edit?saved=profile"
        formLead={
          <BuyerAccountAvatarSection
            displayName={businessProfile.business_name || user.name}
            avatarUrl={user.avatar_url}
          />
        }
      />

      <BusinessCategoriesStepForm
        categories={(categories as ProductCategoryRow[] | null) ?? []}
        initialSelectedCategoryIds={
          ((savedCategories as BusinessProfileCategoryRow[] | null) ?? []).map(
            (item) => item.category_id
          )
        }
        initialOtherCategories={
          ((customCategories as BusinessProfileCustomCategoryRow[] | null) ?? []).map(
            (item) => item.category_name
          )
        }
        mode="edit"
        backHref={null}
        returnPath="/buyer/account/edit?saved=categories"
        pageTitle=""
        pageDescription=""
        sectionTitle="Edit Buying Categories"
        sectionDescription="Select the product categories or interests that match your buying needs."
        submitLabel="Save Categories"
        action={saveBusinessProfileCategories}
      />

      <BuyerDocumentsForm
        mode="edit"
        backHref={null}
        currentDocument={
          currentDtiDocument
            ? {
                fileUrl: currentDtiDocument.file_url,
                status: currentDtiDocument.status,
                reviewNotes: currentDtiDocument.review_notes,
              }
            : null
        }
      />
    </main>
  );
}
