import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerSupplierProfileActions } from "@/components/buyer-supplier-profile-actions";
import { BuyerSupplierProfileContent } from "@/components/buyer-supplier-profile-content";
import { getSupplierProfileDetails } from "./actions";

type SupplierProfilePageProps = {
  params: Promise<{
    supplierId: string;
  }>;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatMemberSince(value: string | null) {
  if (!value) {
    return "Member Since Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Member Since Recently";
  }

  return `Member Since ${date.getFullYear()}`;
}

function formatReviewSummary(params: {
  reviewCount: number;
  averageOverallRating: number | null;
}) {
  if (params.reviewCount === 0 || params.averageOverallRating == null) {
    return "No reviews yet";
  }

  return `${params.averageOverallRating.toFixed(1)} rating · ${params.reviewCount} review${
    params.reviewCount === 1 ? "" : "s"
  }`;
}

function SupplierUnavailableState() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-[24px] border border-[#dfe7f1] bg-white px-8 py-12 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
          There&apos;s nothing here
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[#6c7a8e]">
          This supplier does not exist or is no longer available to buyers.
        </p>
        <div className="mt-6">
          <Link
            href="/buyer/search"
            className="inline-flex items-center justify-center rounded-xl bg-[#223654] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1a2a42]"
          >
            Back to search
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function SupplierProfilePage({
  params,
}: SupplierProfilePageProps) {
  const { supplierId } = await params;
  const numericSupplierId = Number(supplierId);

  if (!Number.isFinite(numericSupplierId)) {
    notFound();
  }

  const supplier = await getSupplierProfileDetails(numericSupplierId);

  if (!supplier) {
    return <SupplierUnavailableState />;
  }

  const categoryTags = Array.from(
    new Set(
      supplier.products
        .map((product) => product.categoryName?.trim())
        .filter((tag): tag is string => Boolean(tag))
    )
  );

  const certificationPills = supplier.certifications.slice(0, 4).map((cert) => ({
    id: cert.certificationId,
    label: cert.certificationTypeName,
  }));

  const initials = getInitials(supplier.businessName || "Supplier");
  const memberSince = formatMemberSince(
    supplier.certifications[0]?.verifiedAt ??
      supplier.businessDocuments[0]?.verifiedAt ??
      null
  );
  const reviewSummaryLabel = formatReviewSummary(supplier.reviewSummary);

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#a0abbb]">
        <Link href="/buyer" className="transition hover:text-[#223654]">
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-[#6c7a8e]">Suppliers</span>
        <span>&gt;</span>
        <span className="text-[#6c7a8e]">{supplier.businessName}</span>
      </nav>

      <section className="overflow-hidden rounded-[24px] border border-[#dfe7f1] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className="h-[156px] bg-[#083f42]" />

        <div className="flex flex-col gap-6 px-7 pb-7 pt-0 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="-mt-11">
              {supplier.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={supplier.avatarUrl}
                  alt={`${supplier.businessName} avatar`}
                  className="h-[92px] w-[92px] rounded-2xl border-4 border-white object-cover shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                />
              ) : (
                <div className="flex h-[92px] w-[92px] items-center justify-center rounded-2xl bg-[#e8f7ea] text-[26px] font-semibold text-[#2f7f4d] shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                  {initials}
                </div>
              )}
            </div>

            <div className="mt-4 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#223654]">
                  {supplier.businessName}
                </h1>

                {supplier.verifiedBadge ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84c19b] bg-[#f3fbf5] px-3 py-1 text-[12px] font-medium text-[#2f7f4d]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M8.25 6.75h7.5l1.5 3.38-1.5 7.12L12 19.5l-3.75-2.25-1.5-7.12 1.5-3.38Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m9.75 12 1.5 1.5 3-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Verified
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#98a4b5] sm:text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M12 20.25s6-4.73 6-10.12a6 6 0 1 0-12 0c0 5.39 6 10.12 6 10.12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="10.13"
                      r="2.25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                  {supplier.city}, {supplier.province}
                </span>

                <span className="text-[#d0d7e2]">&bull;</span>

                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 7.75a2 2 0 0 1 2-2h4.5l1.5 2H18a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {supplier.businessType}
                </span>

                <span className="text-[#d0d7e2]">&bull;</span>

                <span className="inline-flex items-center gap-1.5 text-[#f3a115]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="m12 3 2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 17.1l-5.54 2.93 1.06-6.16L3.04 9.5l6.19-.9L12 3Z"
                      fill="currentColor"
                    />
                  </svg>
                  {reviewSummaryLabel}
                </span>

                <span className="text-[#d0d7e2]">&bull;</span>

                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M7.5 3.75v3M16.5 3.75v3M4.5 8.25h15M6.75 20.25h10.5a1.5 1.5 0 0 0 1.5-1.5V6.75a1.5 1.5 0 0 0-1.5-1.5H6.75a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {memberSince}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {certificationPills.length > 0 ? (
                  certificationPills.map((cert) => (
                    <span
                      key={cert.id}
                      className="rounded-full border border-[#3f74ff] bg-white px-3 py-1.5 text-[11px] font-medium text-[#3f74ff]"
                    >
                      {cert.label}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-[#d9e2ee] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-medium text-[#94a3b8]">
                    No certifications yet
                  </span>
                )}
              </div>
            </div>
          </div>

          <BuyerSupplierProfileActions
            supplierId={supplier.supplierId}
          />
        </div>
      </section>

      <BuyerSupplierProfileContent
        supplier={supplier}
        categoryTags={categoryTags}
      />
    </main>
  );
}
