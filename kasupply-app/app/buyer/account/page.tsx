import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { getPastSuppliers } from "@/app/buyer/actions";
import { BuyerAccountActions } from "@/components/buyer-account-actions";
import { BuyerSavedSuppliersSection } from "@/components/buyer-saved-suppliers-section";

function BuyerAccountPageFallback() {
  return (
    <main className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[22px] border border-[#e7edf5] bg-white p-6 text-sm text-[#8b95a5]">
        Loading buyer account...
      </div>
    </main>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLabel(value: string | null | undefined, fallback = "Not provided") {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function formatBusinessType(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "Not provided";

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPhone(value: string | null | undefined) {
  return formatLabel(value);
}

function formatPasswordHint(updatedAt: string | null) {
  if (!updatedAt) return "Managed securely";

  try {
    return `Last updated ${new Intl.DateTimeFormat("en-PH", {
      month: "short",
      year: "numeric",
    }).format(new Date(updatedAt))}`;
  } catch {
    return "Managed securely";
  }
}

function formatLocation(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#b7c2d3]" aria-hidden="true">
      <path
        d="m7 4 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BusinessNameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M4.5 8.25h15v10.5h-15zM9 5.25h6v3H9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M12 20.25s6-4.73 6-10.12a6 6 0 1 0-12 0c0 5.39 6 10.12 6 10.12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.13" r="2.35" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function RegistrationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M7 3.75h6l4 4v12.5a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.75v4h4M9 12h6M9 15.5h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndustryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M4.5 20h15M6.5 10h4v10h-4zm7-6h4v16h-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 13.5h0m0 3h0m7-8h0m0 3h0m0 3h0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M4.5 7.5h15a1.5 1.5 0 0 1 1.5 1.5v6a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3V9a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m5 9 7 5 7-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M7.8 4.8h2.4a1.2 1.2 0 0 1 1.17.93l.54 2.4a1.2 1.2 0 0 1-.35 1.11l-1.16 1.16a13.5 13.5 0 0 0 4.08 4.08l1.16-1.16a1.2 1.2 0 0 1 1.11-.35l2.4.54a1.2 1.2 0 0 1 .93 1.17v2.4A1.8 1.8 0 0 1 18.3 19 13.5 13.5 0 0 1 5 5.7a1.8 1.8 0 0 1 1.8-1.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M7.5 10.5v-1.5a4.5 4.5 0 0 1 9 0v1.5M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 15.25h0m2.5 0h0m2.5 0h0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VerifiedBadge({ label = "Verified Business" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#bfe0cb] bg-[#f5fbf7] px-2.5 py-1 text-[11px] font-medium text-[#2f7f4d]">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="m15.5 6.5-6.2 6.2L6.5 9.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}

function ProfileAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-[#dff5e6] text-[36px] font-semibold text-[#2f7f4d]">
      {initials}
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[22px] border border-[#e4eaf2] bg-white px-5 py-6 text-center shadow-[0_6px_16px_rgba(15,23,42,0.02)]">
      <p className="text-[42px] font-medium leading-none tracking-[-0.04em] text-[#38445a]">
        {value}
      </p>
      <p className="mt-2.5 text-[14px] font-normal text-[#a0aabc]">{label}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#e7edf5] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="border-b border-[#edf2f7] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-[#223654]">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  badge,
  icon,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf2f7] px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f7f7f8] text-[#a6a8ad]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#4b5568]">{label}</p>
          <p className="mt-0.5 truncate text-[13px] text-[#9aa5b7]">{value}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {badge}
        <ChevronIcon />
      </div>
    </div>
  );
}

function BuyerAccountBody({
  user,
  businessProfile,
  businessDocument,
  fileName,
  stats,
  savedSuppliers,
}: {
  user: {
    name: string;
    email: string;
    updatedAt: string | null;
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
  fileName: string;
  stats: {
    ordersPlaced: number;
    rfqsSent: number;
    activeSuppliers: number;
  };
  savedSuppliers: {
    supplierId: number;
    avatarUrl: string | null;
    businessName: string;
    businessType: string;
    city: string;
    province: string;
  }[];
}) {
  const displayBusinessName = businessProfile?.business_name || user.name || "Buyer Account";
  const displayLocation =
    formatLocation([
      businessProfile?.business_location,
      businessProfile?.city,
      businessProfile?.province,
    ]) || "Location not provided";
  const isVerified = Boolean(businessDocument);
  const initials = getInitials(displayBusinessName || user.name || "BU");

  return (
    <main className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[26px] border border-[#dde6f0] bg-white px-8 py-6 shadow-[0_8px_20px_rgba(15,23,42,0.02)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfileAvatar initials={initials} />
            <div>
              <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#667085]">
                {displayBusinessName}
              </h1>
              <p className="mt-1 text-[13px] text-[#9ca6b8]">
                Buyer • {displayLocation}
              </p>
              <div className="mt-3">
                {isVerified ? (
                  <VerifiedBadge />
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#e5ebf3] bg-[#fafbfd] px-2.5 py-1 text-[11px] font-medium text-[#8b95a5]">
                    Pending verification
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/onboarding/buyer"
            className="inline-flex h-[42px] items-center justify-center rounded-[12px] border border-[#d7dee8] bg-white px-6 text-[14px] font-medium text-[#4a5568] transition hover:border-[#c4d0e0] hover:bg-[#f8fafc]"
          >
            Edit Profile
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard value={stats.ordersPlaced} label="Orders Placed" />
        <StatCard value={stats.rfqsSent} label="RFQs sent" />
        <StatCard value={stats.activeSuppliers} label="Active suppliers" />
      </section>

      <SectionCard title="Business Information">
        <InfoRow
          label="Business Name"
          value={formatLabel(businessProfile?.business_name)}
          icon={<BusinessNameIcon />}
        />
        <InfoRow
          label="Business Address"
          value={displayLocation}
          icon={<AddressIcon />}
        />
        <InfoRow
          label="DTI Registration"
          value={businessDocument ? fileName : "No DTI document uploaded"}
          badge={businessDocument ? <VerifiedBadge label="Verified" /> : undefined}
          icon={<RegistrationIcon />}
        />
        <InfoRow
          label="Industry Type"
          value={formatBusinessType(businessProfile?.business_type)}
          icon={<IndustryIcon />}
        />
      </SectionCard>

      <SectionCard title="Account Information">
        <InfoRow label="Email Address" value={user.email} icon={<EmailIcon />} />
        <InfoRow
          label="Phone Number"
          value={formatPhone(businessProfile?.contact_number)}
          icon={<PhoneIcon />}
        />
        <InfoRow
          label="Password"
          value={formatPasswordHint(user.updatedAt)}
          icon={<PasswordIcon />}
        />
      </SectionCard>

      <SectionCard title="Saved Supplier">
        <BuyerSavedSuppliersSection suppliers={savedSuppliers} />
      </SectionCard>

      <SectionCard title="Account Actions">
        <BuyerAccountActions />
      </SectionCard>
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
    redirect("/login?source=buyer-account");
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
      business_location,
      city,
      province,
      region,
      about,
      contact_name,
      contact_number,
      created_at,
      updated_at
    `,
    )
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (businessProfileError) {
    throw new Error(
      businessProfileError.message || "Failed to load business profile.",
    );
  }

  const { data: buyerProfile, error: buyerProfileError } = businessProfile
    ? await supabase
        .from("buyer_profiles")
        .select("buyer_id")
        .eq("profile_id", businessProfile.profile_id)
        .maybeSingle()
    : { data: null, error: null };

  if (buyerProfileError) {
    throw new Error(buyerProfileError.message || "Failed to load buyer profile.");
  }

  const buyerId = buyerProfile?.buyer_id ?? null;

  const [{ data: businessDocument, error: businessDocumentError }, pastSuppliers] =
    await Promise.all([
      businessProfile
        ? supabase
            .from("business_documents")
            .select(
              `
              doc_id,
              file_url,
              is_visible_to_others
            `,
            )
            .eq("profile_id", businessProfile.profile_id)
            .order("uploaded_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      getPastSuppliers(),
    ]);

  if (businessDocumentError) {
    throw new Error(
      businessDocumentError.message || "Failed to load business document.",
    );
  }

  const [rfqCountResult, purchaseOrderCountResult, engagementRowsResult] =
    buyerId != null
      ? await Promise.all([
          supabase
            .from("rfqs")
            .select("rfq_id", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
          supabase
            .from("purchase_orders")
            .select("po_id", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
          supabase
            .from("rfq_engagements")
            .select("supplier_id, rfq_id, rfqs!inner(buyer_id)")
            .eq("rfqs.buyer_id", buyerId),
        ])
      : [
          { count: 0, error: null },
          { count: 0, error: null },
          { data: [], error: null },
        ];

  if (rfqCountResult.error) {
    throw new Error(rfqCountResult.error.message || "Failed to load RFQ stats.");
  }

  if (purchaseOrderCountResult.error) {
    throw new Error(
      purchaseOrderCountResult.error.message || "Failed to load order stats.",
    );
  }

  if (engagementRowsResult.error) {
    throw new Error(
      engagementRowsResult.error.message || "Failed to load supplier stats.",
    );
  }

  const activeSuppliers = new Set(
    (engagementRowsResult.data ?? []).map((row) => row.supplier_id),
  ).size;

  const fileName =
    businessDocument?.file_url?.split("/").pop() || "Uploaded document";

  return (
    <BuyerAccountBody
      user={{
        name: user.name,
        email: user.email,
        updatedAt: businessProfile?.updated_at ?? null,
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
      fileName={fileName}
      stats={{
        ordersPlaced: purchaseOrderCountResult.count ?? 0,
        rfqsSent: rfqCountResult.count ?? 0,
        activeSuppliers,
      }}
      savedSuppliers={pastSuppliers.slice(0, 3).map((supplier) => ({
        supplierId: supplier.supplierId,
        avatarUrl: supplier.avatarUrl,
        businessName: supplier.businessName,
        businessType: supplier.businessType,
        city: supplier.city,
        province: supplier.province,
      }))}
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
