import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { completeOnboarding } from "./actions";

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
  "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao",
];

export default async function OnboardingPage() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (status.hasBusinessProfile) {
    redirect("/dashboard");
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Complete Your Business Profile</h1>
      <p className="mb-6 text-gray-600">
        Please complete your profile before using the platform.
      </p>

      <form action={completeOnboarding} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Business Name</label>
          <input
            name="business_name"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Business Type</label>
          <select
            name="business_type"
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select business type</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="distributor">Distributor</option>
            <option value="trader">Trader</option>
            <option value="retailer">Retailer</option>
            <option value="processor">Processor</option>
            <option value="wholesaler">Wholesaler</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Business Location</label>
          <input
            name="business_location"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">City</label>
          <input
            name="city"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Province</label>
          <input
            name="province"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Region</label>
          <select
            name="region"
            required
            className="w-full border rounded px-3 py-2"
            defaultValue=""
          >
            <option value="" disabled>
              Select region
            </option>
            {PHILIPPINE_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">About</label>
          <textarea
            name="about"
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Contact Number</label>
          <input
            name="contact_number"
            type="text"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contact_name" className="text-sm font-medium">
            Contact Name
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save Profile
        </button>
      </form>
    </main>
  );
}
