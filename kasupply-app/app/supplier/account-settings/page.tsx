import Link from "next/link";
import { redirect } from "next/navigation";
import { ModalField, ModalShell } from "@/components/modals";
import { createClient } from "@/lib/supabase/server";
import {
  updateSupplierAccountSettings,
  uploadSupplierCertification,
  deleteSupplierCertification,
} from "./actions";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
  verified: boolean;
  verified_at: string | null;
};

type AppUserRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string;
  business_type: string;
  business_location: string;
  city: string;
  province: string;
  region: string;
  about: string | null;
  contact_number: string | null;
  contact_name: string | null;
};

type CertificationTypeRow = {
  cert_type_id: number;
  certification_type_name: string;
  description: string | null;
};

type SupplierCertificationRow = {
  certification_id: number;
  cert_type_id: number;
  file_url: string;
  status: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verified_at: string | null;
};

const PHILIPPINE_REGIONS = [
  "NCR - National Capital Region",
  "CAR - Cordillera Administrative Region",
  "Region I - Ilocos Region",
  "Region II - Cagayan Valley",
  "Region III - Central Luzon",
  "Region IV-A - CALABARZON",
  "Region IV-B - MIMAROPA",
  "Region V - Bicol Region",
  "Region VI - Western Visayas",
  "Region VII - Central Visayas",
  "Region VIII - Eastern Visayas",
  "Region IX - Zamboanga Peninsula",
  "Region X - Northern Mindanao",
  "Region XI - Davao Region",
  "Region XII - SOCCSKSARGEN",
  "Region XIII - Caraga",
  "BARMM - Bangsamoro Autonomous Region",
];

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getAvatarFallback(name: string | null, businessName: string) {
  const source = (name || businessName).trim();
  return source ? source.charAt(0).toUpperCase() : "S";
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-[1.05rem] text-slate-900">{value}</p>
    </div>
  );
}

export default async function SupplierAccountSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    edit?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const isEditModalOpen = resolvedSearchParams.edit === "profile";

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/auth/login");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, name, email, avatar_url")
    .eq("auth_user_id", authUser.id)
    .single<AppUserRow>();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
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
      contact_number,
      contact_name
    `)
    .eq("user_id", appUser.user_id)
    .single<BusinessProfileRow>();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id, verified, verified_at")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  const { data: certificationTypes, error: certificationTypesError } = await supabase
    .from("certification_types")
    .select("cert_type_id, certification_type_name, description")
    .order("certification_type_name", { ascending: true });

  if (certificationTypesError) {
    throw new Error(
      certificationTypesError.message || "Failed to load certification types.",
    );
  }

  const { data: certifications, error: certificationsError } = await supabase
    .from("supplier_certifications")
    .select(`
      certification_id,
      cert_type_id,
      file_url,
      status,
      issued_at,
      expires_at,
      verified_at
    `)
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("issued_at", { ascending: false });

  if (certificationsError) {
    throw new Error(certificationsError.message || "Failed to load certifications.");
  }

  const safeCertificationTypes =
    (certificationTypes as CertificationTypeRow[] | null) ?? [];
  const safeCertifications =
    (certifications as SupplierCertificationRow[] | null) ?? [];

  const certificationTypeMap = new Map<number, CertificationTypeRow>();
  for (const type of safeCertificationTypes) {
    certificationTypeMap.set(type.cert_type_id, type);
  }

  const avatarFallback = getAvatarFallback(appUser.name, businessProfile.business_name);
  const subtitleParts = [
    businessProfile.business_type,
    businessProfile.region,
    supplierProfile.verified_at
      ? `Verified since ${formatDate(supplierProfile.verified_at)}`
      : supplierProfile.verified
        ? "Verified supplier"
        : "Verification pending",
  ].filter(Boolean);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-gray-600">
          View your public supplier profile and manage your certifications.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-950">Business profile</h2>
          <p className="text-sm text-slate-500">
            Your business information as shown to buyers on the platform.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            {appUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appUser.avatar_url}
                alt={`${businessProfile.business_name} profile`}
                className="h-20 w-20 rounded-full border border-emerald-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-3xl font-semibold text-[#0f766e]">
                {avatarFallback}
              </div>
            )}

            <div>
              <h3 className="text-[1.85rem] font-semibold tracking-tight text-slate-950">
                {businessProfile.business_name}
              </h3>
              <p className="mt-1 text-[1.02rem] text-slate-700">
                {subtitleParts.join(" · ")}
              </p>
            </div>
          </div>

          <Link
            href="/supplier/account-settings?edit=profile"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span aria-hidden="true">✎</span>
            Edit profile
          </Link>
        </div>

        <div className="mt-10 grid gap-x-14 gap-y-8 md:grid-cols-2">
          <InfoField label="Business Name" value={businessProfile.business_name} />
          <InfoField label="Business Type" value={businessProfile.business_type} />
          <InfoField label="Business Location" value={businessProfile.business_location} />
          <InfoField label="Province" value={businessProfile.province} />
          <InfoField label="City / Municipality" value={businessProfile.city} />
          <InfoField label="Contact Number" value={businessProfile.contact_number ?? "Not provided"} />
          <InfoField label="Region" value={businessProfile.region} />
          <InfoField label="Contact Person" value={businessProfile.contact_name ?? appUser.name ?? "Not provided"} />
          <div className="md:col-span-2">
            <InfoField label="About" value={businessProfile.about ?? "No business description added yet."} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Additional Certifications</h2>
          <p className="text-sm text-gray-500">
            Upload optional certifications relevant to your goods or operations.
          </p>
        </div>

        <form action={uploadSupplierCertification} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Certification Type</label>
            <select
              name="cert_type_id"
              required
              className="w-full rounded border px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select certification type
              </option>
              {safeCertificationTypes.map((type) => (
                <option key={type.cert_type_id} value={type.cert_type_id}>
                  {type.certification_type_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Certification File</label>
            <input
              name="certification_file"
              type="file"
              required
              className="w-full rounded border px-3 py-2"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Issued Date</label>
            <input
              name="issued_at"
              type="date"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Expiry Date</label>
            <input
              name="expires_at"
              type="date"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Upload Certification
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Uploaded Certifications</h2>
          <p className="text-sm text-gray-500">
            These are the additional certifications currently linked to your supplier profile.
          </p>
        </div>

        {safeCertifications.length === 0 ? (
          <p className="text-sm text-gray-500">No certifications uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Certification</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Issued</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Verified At</th>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {safeCertifications.map((certification) => {
                  const type = certificationTypeMap.get(certification.cert_type_id);

                  return (
                    <tr key={certification.certification_id} className="border-b">
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {type?.certification_type_name ?? "Unknown certification"}
                        </div>
                        {type?.description ? (
                          <div className="text-xs text-gray-500">{type.description}</div>
                        ) : null}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {certification.status ?? "pending"}
                        </span>
                      </td>

                      <td className="px-3 py-3">{formatDate(certification.issued_at)}</td>
                      <td className="px-3 py-3">{formatDate(certification.expires_at)}</td>
                      <td className="px-3 py-3">{formatDate(certification.verified_at)}</td>

                      <td className="px-3 py-3">
                        <span className="break-all text-xs text-gray-500">
                          {certification.file_url}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <form action={deleteSupplierCertification}>
                          <input
                            type="hidden"
                            name="certification_id"
                            value={certification.certification_id}
                          />
                          <button
                            type="submit"
                            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isEditModalOpen ? (
        <ModalShell
          title="Edit profile"
          description="Update your public supplier profile and upload a profile picture."
          closeHref="/supplier/account-settings"
          maxWidthClassName="max-w-3xl"
          panelClassName="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          overlayClassName="bg-slate-950/45 px-4 py-8"
        >
            <form action={updateSupplierAccountSettings} className="grid gap-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {appUser.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={appUser.avatar_url}
                      alt={`${businessProfile.business_name} avatar`}
                      className="h-20 w-20 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-3xl font-semibold text-[#0f766e]">
                      {avatarFallback}
                    </div>
                  )}

                  <div className="flex-1">
                    <ModalField label="Profile Picture">
                      <input
                        name="avatar_file"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="w-full rounded border border-slate-200 bg-white px-3 py-2"
                      />
                    </ModalField>
                    <p className="mt-2 text-xs text-slate-500">
                      Recommended: square image, up to 5 MB. This will update `users.avatar_url`.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ModalField label="Contact Person">
                  <input
                    name="contact_name"
                    type="text"
                    required
                    defaultValue={businessProfile.contact_name ?? appUser.name ?? ""}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <ModalField label="Contact Number">
                  <input
                    name="contact_number"
                    type="text"
                    required
                    defaultValue={businessProfile.contact_number ?? ""}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <ModalField label="Business Name">
                  <input
                    name="business_name"
                    type="text"
                    required
                    defaultValue={businessProfile.business_name}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <ModalField label="Business Type">
                  <input
                    name="business_type"
                    type="text"
                    required
                    defaultValue={businessProfile.business_type}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <div className="md:col-span-2">
                  <ModalField label="Business Location">
                    <input
                      name="business_location"
                      type="text"
                      required
                      defaultValue={businessProfile.business_location}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </ModalField>
                </div>

                <ModalField label="City / Municipality">
                  <input
                    name="city"
                    type="text"
                    required
                    defaultValue={businessProfile.city}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <ModalField label="Province">
                  <input
                    name="province"
                    type="text"
                    required
                    defaultValue={businessProfile.province}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  />
                </ModalField>

                <ModalField label="Region">
                  <select
                    name="region"
                    required
                    defaultValue={businessProfile.region}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  >
                    {PHILIPPINE_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </ModalField>

                <div className="md:col-span-2">
                  <ModalField label="About">
                    <textarea
                      name="about"
                      rows={5}
                      defaultValue={businessProfile.about ?? ""}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </ModalField>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <Link
                  href="/supplier/account-settings"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#243f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e3658]"
                >
                  Save Changes
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </main>
  );
}
