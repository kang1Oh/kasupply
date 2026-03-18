import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateSupplierAccountSettings,
  uploadSupplierCertification,
  deleteSupplierCertification,
} from "./actions";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
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

export default async function SupplierAccountSettingsPage() {
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
    .select("user_id, name")
    .eq("auth_user_id", authUser.id)
    .single();

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
      contact_number
    `)
    .eq("user_id", appUser.user_id)
    .single<BusinessProfileRow>();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
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
      certificationTypesError.message || "Failed to load certification types."
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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-gray-600">
          Update your supplier profile and manage additional certifications.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Business Profile</h2>
          <p className="text-sm text-gray-500">
            Keep your business details accurate for matching and buyer discovery.
          </p>
        </div>

        <form action={updateSupplierAccountSettings} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Business Name</label>
            <input
              name="business_name"
              type="text"
              required
              defaultValue={businessProfile.business_name}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Business Type</label>
            <input
              name="business_type"
              type="text"
              required
              defaultValue={businessProfile.business_type}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. Manufacturer, Distributor, Supplier"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Business Location</label>
            <input
              name="business_location"
              type="text"
              required
              defaultValue={businessProfile.business_location}
              className="w-full rounded border px-3 py-2"
              placeholder="Street / Barangay / Full address"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              name="city"
              type="text"
              required
              defaultValue={businessProfile.city}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Province</label>
            <input
              name="province"
              type="text"
              required
              defaultValue={businessProfile.province}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Region</label>
            <input
              name="region"
              type="text"
              required
              defaultValue={businessProfile.region}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Contact Number</label>
            <input
              name="contact_number"
              type="text"
              required
              defaultValue={businessProfile.contact_number ?? ""}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. 09123456789"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">About</label>
            <textarea
              name="about"
              rows={5}
              defaultValue={businessProfile.about ?? ""}
              className="w-full rounded border px-3 py-2"
              placeholder="Describe your business, products, capabilities, and operations."
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
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
                        <span className="text-xs text-gray-500 break-all">
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
    </main>
  );
}