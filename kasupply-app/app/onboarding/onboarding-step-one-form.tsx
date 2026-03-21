"use client";

const BUSINESS_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "trader", label: "Trader" },
  { value: "retailer", label: "Retailer" },
  { value: "processor", label: "Processor" },
  { value: "wholesaler", label: "Wholesaler" },
];

type OnboardingStepOneFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  regions: string[];
  defaultContactName: string;
};

function StepIndicator({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          active ? "bg-[#1f3d67] text-white" : "bg-[#e5e7eb] text-[#b8bec8]"
        }`}
      >
        {number}
      </div>
      <span
        className={`truncate text-sm font-medium ${
          active ? "text-[#1f3d67]" : "text-[#c7ccd5]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <span className="text-[13px] font-semibold text-[#1f3d67]">
      {label}
      {required ? <span className="text-[#ef4444]"> *</span> : null}
    </span>
  );
}

function InputField({
  label,
  name,
  required,
  placeholder,
  type = "text",
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ""}`}>
      <FieldLabel label={label} required={required} />
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-[#d7dee8] bg-white px-3 text-sm text-[#334155] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#1f3d67]"
      />
    </label>
  );
}

export function OnboardingStepOneForm({
  action,
  regions,
  defaultContactName,
}: OnboardingStepOneFormProps) {
  return (
    <form action={action} className="space-y-6">
      <section className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-[#223654]">
                Basic Profile Information
              </h1>
              <p className="mt-1 text-sm text-[#8b95a5]">
                Share a few details so we can tailor KaSupply to your needs
              </p>
            </div>
            <p className="text-sm font-semibold text-[#223654]">Step 1 of 3</p>
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator number={1} label="Profile Setup" active />
            <div className="h-px flex-1 bg-[#1f3d67]" />
            <StepIndicator number={2} label="Verification" />
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <StepIndicator number={3} label="User Verified" />
          </div>

          <div className="rounded-[14px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-6">
              <InputField
                label="Business Name"
                name="business_name"
                required
                placeholder="Enter Business Name"
                className="md:col-span-3"
              />

              <label className="block space-y-2 md:col-span-3">
                <FieldLabel label="Business Type" required />
                <select
                  name="business_type"
                  required
                  defaultValue=""
                  className="h-11 w-full rounded-md border border-[#d7dee8] bg-white px-3 text-sm text-[#334155] outline-none transition focus:border-[#1f3d67]"
                >
                  <option value="" disabled>
                    Select Type
                  </option>
                  {BUSINESS_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-6">
                <InputField
                  label="Business Location"
                  name="business_location"
                  required
                  placeholder="Enter Business Name"
                />
              </div>

              <InputField
                label="City"
                name="city"
                required
                placeholder="Select City"
                className="md:col-span-2"
              />

              <InputField
                label="Province"
                name="province"
                required
                placeholder="Select Province"
                className="md:col-span-2"
              />

              <label className="block space-y-2 md:col-span-2">
                <FieldLabel label="Region" required />
                <select
                  name="region"
                  required
                  defaultValue=""
                  className="h-11 w-full rounded-md border border-[#d7dee8] bg-white px-3 text-sm text-[#334155] outline-none transition focus:border-[#1f3d67]"
                >
                  <option value="" disabled>
                    Select Region
                  </option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <InputField
                label="Contact Name"
                name="contact_name"
                required
                placeholder="Enter Contact Name"
                defaultValue={defaultContactName}
                className="md:col-span-3"
              />

              <InputField
                label="Contact Number"
                name="contact_number"
                required
                placeholder="Enter Contact Number"
                className="md:col-span-3"
              />

              <label className="block space-y-2 md:col-span-6">
                <FieldLabel label="Business Description" />
                <textarea
                  name="about"
                  rows={6}
                  placeholder="Enter short description"
                  className="w-full rounded-md border border-[#d7dee8] bg-white px-3 py-3 text-sm text-[#334155] outline-none transition placeholder:text-[#b0b8c5] focus:border-[#1f3d67]"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          className="text-sm font-medium text-[#aab3c2]"
          disabled
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1]"
        >
          Proceed
        </button>
      </div>
    </form>
  );
}
