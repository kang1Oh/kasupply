import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  retryProfileVerificationAction,
  retryVerificationRunAction,
} from "@/app/admin/dashboard/actions";

type VerificationDetailPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

type VerificationRunRow = {
  run_id: number;
  profile_id: number;
  target_type: string;
  target_id: number | null;
  kind: string;
  status: string;
  triggered_by: string;
  input_snapshot: Record<string, unknown> | null;
  provider_status: Record<string, unknown> | null;
  result_summary: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type BusinessProfileRow = {
  profile_id: number;
  user_id: string;
  business_name: string;
  business_type: string;
  business_location: string;
  city: string;
  province: string;
  region: string;
  contact_name: string | null;
  contact_number: string | null;
};

type UserRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  roles: { role_name: string } | null;
};

type BusinessDocumentRow = {
  doc_id: number;
  profile_id: number;
  file_url: string;
  status: string;
  uploaded_at: string;
  verified_at: string | null;
  verification_score: number | null;
  manual_review_required: boolean | null;
  review_notes: string | null;
  ocr_extracted_fields: Record<string, unknown> | null;
  metadata_analysis: Record<string, unknown> | null;
  verification_analysis: Record<string, unknown> | null;
  document_types:
    | {
        document_type_name: string;
      }
    | {
        document_type_name: string;
      }[]
    | null;
};

type SiteImageRow = {
  image_id: number;
  image_type: string;
  image_url: string;
  status: string;
  analysis_result: Record<string, unknown> | null;
  manual_review_required: boolean | null;
  review_notes: string | null;
  verified_at: string | null;
};

type SiteVerificationCheckRow = {
  site_verification_id: number;
  status: string;
  similarity_score: number | null;
  deliverability_status: string;
  street_view_status: string;
  manual_review_required: boolean;
  review_notes: string | null;
  geocode_payload: Record<string, unknown> | null;
  street_view_metadata: Record<string, unknown> | null;
  comparison_payload: Record<string, unknown> | null;
  created_at: string;
};

function toTitleCase(value: string | null | undefined) {
  const safeValue = String(value ?? "").trim();
  if (!safeValue) return "Unknown";

  return safeValue
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getStatusPillClasses(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "approved" || normalized === "active") {
    return "border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d]";
  }

  if (normalized === "review_required" || normalized === "warned") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#b45309]";
  }

  if (normalized === "restricted" || normalized === "suspended" || normalized === "failed") {
    return "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]";
  }

  if (normalized === "banned" || normalized === "rejected") {
    return "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
  }

  if (normalized === "queued" || normalized === "processing" || normalized === "submitted") {
    return "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]";
  }

  return "border-[#dbe2ea] bg-[#f8fafc] text-[#475569]";
}

function readDocumentTypeName(row: BusinessDocumentRow) {
  if (Array.isArray(row.document_types)) {
    return row.document_types[0]?.document_type_name ?? "Unknown document";
  }

  return row.document_types?.document_type_name ?? "Unknown document";
}

function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null | undefined;
}) {
  return (
    <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <h2 className="text-base font-semibold text-[#223654]">{title}</h2>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-[#f8fafc] p-4 text-xs leading-6 text-[#334155]">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </section>
  );
}

async function getVerificationDetailData(runId: number) {
  const supabase = await createClient();

  const { data: run, error: runError } = await supabase
    .from("verification_runs")
    .select(
      "run_id, profile_id, target_type, target_id, kind, status, triggered_by, input_snapshot, provider_status, result_summary, error_message, created_at, started_at, completed_at"
    )
    .eq("run_id", runId)
    .maybeSingle<VerificationRunRow>();

  if (runError) {
    throw new Error(runError.message || "Failed to load verification run.");
  }

  if (!run) {
    return null;
  }

  const [
    { data: profile, error: profileError },
    { data: profileDocuments, error: profileDocumentsError },
    { data: siteImages, error: siteImagesError },
    { data: siteChecks, error: siteChecksError },
    { data: profileRuns, error: profileRunsError },
  ] = await Promise.all([
    supabase
      .from("business_profiles")
      .select(
        "profile_id, user_id, business_name, business_type, business_location, city, province, region, contact_name, contact_number"
      )
      .eq("profile_id", run.profile_id)
      .maybeSingle<BusinessProfileRow>(),
    supabase
      .from("business_documents")
      .select(
        `
          doc_id,
          profile_id,
          file_url,
          status,
          uploaded_at,
          verified_at,
          verification_score,
          manual_review_required,
          review_notes,
          ocr_extracted_fields,
          metadata_analysis,
          verification_analysis,
          document_types!business_documents_doc_type_id_fkey (
            document_type_name
          )
        `
      )
      .eq("profile_id", run.profile_id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("site_showcase_images")
      .select(
        "image_id, image_type, image_url, status, analysis_result, manual_review_required, review_notes, verified_at"
      )
      .eq("profile_id", run.profile_id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("site_verification_checks")
      .select(
        "site_verification_id, status, similarity_score, deliverability_status, street_view_status, manual_review_required, review_notes, geocode_payload, street_view_metadata, comparison_payload, created_at"
      )
      .eq("profile_id", run.profile_id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("verification_runs")
      .select(
        "run_id, profile_id, target_type, target_id, kind, status, triggered_by, input_snapshot, provider_status, result_summary, error_message, created_at, started_at, completed_at"
      )
      .eq("profile_id", run.profile_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (profileError) {
    throw new Error(profileError.message || "Failed to load business profile.");
  }

  if (profileDocumentsError) {
    throw new Error(profileDocumentsError.message || "Failed to load business documents.");
  }

  if (siteImagesError) {
    throw new Error(siteImagesError.message || "Failed to load site images.");
  }

  if (siteChecksError) {
    throw new Error(siteChecksError.message || "Failed to load site verification checks.");
  }

  if (profileRunsError) {
    throw new Error(profileRunsError.message || "Failed to load verification run history.");
  }

  let user: UserRow | null = null;

  if (profile?.user_id) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
          user_id,
          name,
          email,
          status,
          roles!users_role_id_fkey (
            role_name
          )
        `
      )
      .eq("user_id", profile.user_id)
      .maybeSingle<UserRow>();

    if (userError) {
      throw new Error(userError.message || "Failed to load account details.");
    }

    user = userData ?? null;
  }

  const safeDocuments = (profileDocuments as BusinessDocumentRow[] | null) ?? [];
  const safeSiteImages = (siteImages as SiteImageRow[] | null) ?? [];
  const safeSiteChecks = (siteChecks as SiteVerificationCheckRow[] | null) ?? [];
  const safeProfileRuns = (profileRuns as VerificationRunRow[] | null) ?? [];

  const targetDocument =
    run.target_type === "business_document" && run.target_id
      ? safeDocuments.find((document) => document.doc_id === run.target_id) ?? null
      : null;

  return {
    run,
    profile: profile ?? null,
    user,
    documents: safeDocuments,
    targetDocument,
    siteImages: safeSiteImages,
    siteChecks: safeSiteChecks,
    profileRuns: safeProfileRuns,
  };
}

export default async function VerificationDetailPage({
  params,
}: VerificationDetailPageProps) {
  await requireAdminUser();

  const resolvedParams = await params;
  const runId = Number(resolvedParams.runId);

  if (!runId || Number.isNaN(runId)) {
    notFound();
  }

  const data = await getVerificationDetailData(runId);

  if (!data) {
    notFound();
  }

  const latestSiteCheck = data.siteChecks[0] ?? null;

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-[#1d4ed8] transition hover:text-[#1e40af]"
            >
              Back to admin dashboard
            </Link>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight text-[#223654]">
              Verification Run #{data.run.run_id}
            </h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              Inspect the stored verification artifacts, business context, and retry history for this automated run.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <form action={retryVerificationRunAction}>
              <input type="hidden" name="run_id" value={data.run.run_id} />
              <button
                type="submit"
                className="rounded-lg border border-[#223654] px-4 py-2.5 text-sm font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
              >
                Retry This Run
              </button>
            </form>
            <form action={retryProfileVerificationAction}>
              <input type="hidden" name="profile_id" value={data.run.profile_id} />
              <button
                type="submit"
                className="rounded-lg bg-[#eef4ff] px-4 py-2.5 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
              >
                Retry Latest For Profile
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e5ebf4] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-[#8b95a5]">Run Status</p>
          <div className="mt-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${getStatusPillClasses(
                data.run.status
              )}`}
            >
              {toTitleCase(data.run.status)}
            </span>
          </div>
          <p className="mt-3 text-xs text-[#6b7280]">
            Triggered by {toTitleCase(data.run.triggered_by)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5ebf4] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-[#8b95a5]">Kind</p>
          <h2 className="mt-2 text-xl font-semibold text-[#223654]">
            {toTitleCase(data.run.kind)}
          </h2>
          <p className="mt-2 text-xs text-[#6b7280]">
            {toTitleCase(data.run.target_type)} {data.run.target_id ? `#${data.run.target_id}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5ebf4] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-[#8b95a5]">Business</p>
          <h2 className="mt-2 text-xl font-semibold text-[#223654]">
            {data.profile?.business_name ?? `Profile #${data.run.profile_id}`}
          </h2>
          <p className="mt-2 text-xs text-[#6b7280]">
            {data.user?.email ?? "No linked email"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5ebf4] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-[#8b95a5]">Timeline</p>
          <p className="mt-2 text-sm text-[#334155]">Created {formatDate(data.run.created_at)}</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Started {formatDate(data.run.started_at)}
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Completed {formatDate(data.run.completed_at)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Business Context</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Business</p>
              <p className="mt-1 text-sm font-medium text-[#334155]">
                {data.profile?.business_name ?? "Unknown"}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                {data.profile?.business_type ?? "Unknown type"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Account</p>
              <p className="mt-1 text-sm font-medium text-[#334155]">
                {data.user?.name ?? "Unknown user"}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                {data.user?.email ?? "No email"}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                {toTitleCase(data.user?.roles?.role_name)} | {toTitleCase(data.user?.status)}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Location</p>
              <p className="mt-1 text-sm text-[#334155]">
                {[
                  data.profile?.business_location,
                  data.profile?.city,
                  data.profile?.province,
                  data.profile?.region,
                ]
                  .filter(Boolean)
                  .join(", ") || "No location information"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Run Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-[#334155]">
            <p>
              <span className="font-medium">Status:</span> {toTitleCase(data.run.status)}
            </p>
            <p>
              <span className="font-medium">Triggered by:</span>{" "}
              {toTitleCase(data.run.triggered_by)}
            </p>
            <p>
              <span className="font-medium">Kind:</span> {toTitleCase(data.run.kind)}
            </p>
            {data.run.error_message ? (
              <p className="text-[#b91c1c]">
                <span className="font-medium">Error:</span> {data.run.error_message}
              </p>
            ) : null}
            {data.targetDocument ? (
              <p>
                <span className="font-medium">Target document:</span>{" "}
                {readDocumentTypeName(data.targetDocument)}
              </p>
            ) : null}
            {latestSiteCheck ? (
              <p>
                <span className="font-medium">Latest site check:</span>{" "}
                {toTitleCase(latestSiteCheck.status)}
              </p>
            ) : null}
          </div>
        </section>
      </section>

      {data.targetDocument ? (
        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Target Document</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Type</p>
              <p className="mt-1 text-sm font-medium text-[#334155]">
                {readDocumentTypeName(data.targetDocument)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Status</p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                  data.targetDocument.status
                )}`}
              >
                {toTitleCase(data.targetDocument.status)}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Score</p>
              <p className="mt-1 text-sm text-[#334155]">
                {data.targetDocument.verification_score ?? "Not available"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Review Notes</p>
              <p className="mt-1 text-sm text-[#334155]">
                {data.targetDocument.review_notes ?? "No notes"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {latestSiteCheck ? (
        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Latest Site Verification Check</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Status</p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs ${getStatusPillClasses(
                  latestSiteCheck.status
                )}`}
              >
                {toTitleCase(latestSiteCheck.status)}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Similarity</p>
              <p className="mt-1 text-sm text-[#334155]">
                {latestSiteCheck.similarity_score ?? "Not available"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Deliverability</p>
              <p className="mt-1 text-sm text-[#334155]">
                {toTitleCase(latestSiteCheck.deliverability_status)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8b95a5]">Street View</p>
              <p className="mt-1 text-sm text-[#334155]">
                {toTitleCase(latestSiteCheck.street_view_status)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <JsonPanel title="Run Input Snapshot" value={data.run.input_snapshot} />
        <JsonPanel title="Run Result Summary" value={data.run.result_summary} />
        {data.targetDocument ? (
          <JsonPanel
            title="Document Verification Analysis"
            value={data.targetDocument.verification_analysis}
          />
        ) : null}
        {data.targetDocument ? (
          <JsonPanel
            title="Document Extracted Fields"
            value={data.targetDocument.ocr_extracted_fields}
          />
        ) : null}
        {latestSiteCheck ? (
          <JsonPanel title="Site Check Comparison Payload" value={latestSiteCheck.comparison_payload} />
        ) : null}
        {latestSiteCheck ? (
          <JsonPanel title="Site Check Geocode Payload" value={latestSiteCheck.geocode_payload} />
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Profile Artifacts</h2>
          <div className="mt-4 space-y-4">
            {data.documents.map((document) => (
              <div
                key={document.doc_id}
                className="rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#223654]">
                    {readDocumentTypeName(document)}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusPillClasses(
                      document.status
                    )}`}
                  >
                    {toTitleCase(document.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#6b7280]">
                  Uploaded {formatDate(document.uploaded_at)}
                </p>
                {document.review_notes ? (
                  <p className="mt-2 text-sm text-[#475569]">{document.review_notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-[#223654]">Recent Run History</h2>
          <div className="mt-4 space-y-3">
            {data.profileRuns.map((run) => (
              <Link
                key={run.run_id}
                href={`/admin/verification/${run.run_id}`}
                className="block rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4 transition hover:border-[#d7e0eb] hover:bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#223654]">Run #{run.run_id}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusPillClasses(
                      run.status
                    )}`}
                  >
                    {toTitleCase(run.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#475569]">{toTitleCase(run.kind)}</p>
                <p className="mt-1 text-xs text-[#8b95a5]">{formatDate(run.created_at)}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
