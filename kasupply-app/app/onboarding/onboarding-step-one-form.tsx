"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BUSINESS_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "trader", label: "Trader" },
  { value: "retailer", label: "Retailer" },
  { value: "processor", label: "Processor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "others", label: "Others" },
];

const PROVINCE_OPTIONS = [
  { value: "Davao del Sur", label: "Davao del Sur" },
  { value: "Davao del Norte", label: "Davao del Norte" },
  { value: "Davao de Oro", label: "Davao de Oro" },
  { value: "Davao Occidental", label: "Davao Occidental" },
  { value: "Davao Oriental", label: "Davao Oriental" },
];

const DAVAO_CITY_GROUPS = [
  {
    label: "Davao del Sur",
    options: [
      { value: "Davao City", label: "Davao City" },
      { value: "Digos City", label: "Digos City" },
      { value: "Bansalan", label: "Bansalan" },
      { value: "Hagonoy", label: "Hagonoy" },
      { value: "Kiblawan", label: "Kiblawan" },
      { value: "Magsaysay", label: "Magsaysay" },
      { value: "Malalag", label: "Malalag" },
      { value: "Matanao", label: "Matanao" },
      { value: "Padada", label: "Padada" },
      { value: "Santa Cruz", label: "Santa Cruz" },
      { value: "Sulop", label: "Sulop" },
    ],
  },
  {
    label: "Davao del Norte",
    options: [
      { value: "Panabo City", label: "Panabo City" },
      { value: "Samal City", label: "Samal City" },
      { value: "Tagum City", label: "Tagum City" },
      { value: "Asuncion", label: "Asuncion" },
      { value: "Braulio E. Dujali", label: "Braulio E. Dujali" },
      { value: "Carmen", label: "Carmen" },
      { value: "Kapalong", label: "Kapalong" },
      { value: "New Corella", label: "New Corella" },
      { value: "San Isidro", label: "San Isidro" },
      { value: "Santo Tomas", label: "Santo Tomas" },
      { value: "Talaingod", label: "Talaingod" },
    ],
  },
  {
    label: "Davao de Oro",
    options: [
      { value: "Compostela", label: "Compostela" },
      { value: "Laak", label: "Laak" },
      { value: "Mabini", label: "Mabini" },
      { value: "Maco", label: "Maco" },
      { value: "Maragusan", label: "Maragusan" },
      { value: "Mawab", label: "Mawab" },
      { value: "Monkayo", label: "Monkayo" },
      { value: "Montevista", label: "Montevista" },
      { value: "Nabunturan", label: "Nabunturan" },
      { value: "New Bataan", label: "New Bataan" },
      { value: "Pantukan", label: "Pantukan" },
    ],
  },
  {
    label: "Davao Occidental",
    options: [
      { value: "Don Marcelino", label: "Don Marcelino" },
      { value: "Jose Abad Santos", label: "Jose Abad Santos" },
      { value: "Malita", label: "Malita" },
      { value: "Santa Maria", label: "Santa Maria" },
      { value: "Sarangani", label: "Sarangani" },
    ],
  },
  {
    label: "Davao Oriental",
    options: [
      { value: "Mati City", label: "Mati City" },
      { value: "Baganga", label: "Baganga" },
      { value: "Banaybanay", label: "Banaybanay" },
      { value: "Boston", label: "Boston" },
      { value: "Caraga", label: "Caraga" },
      { value: "Cateel", label: "Cateel" },
      { value: "Governor Generoso", label: "Governor Generoso" },
      { value: "Lupon", label: "Lupon" },
      { value: "Manay", label: "Manay" },
      { value: "San Isidro", label: "San Isidro" },
      { value: "Tarragona", label: "Tarragona" },
    ],
  },
];

type OnboardingStepOneFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  regions: string[];
};

type SelectOption = {
  value: string;
  label: string;
};

type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type FormValues = {
  business_name: string;
  business_type: string;
  other_business_type: string;
  business_location: string;
  city: string;
  province: string;
  region: string;
  contact_name: string;
  contact_number: string;
  about: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-[#8b95a5]"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
          active ? "bg-[#1f3d67] text-white" : "bg-[#e8ecf2] text-[#9aa5b4]"
        }`}
      >
        {number}
      </div>
      <span
        className={`truncate text-[15px] font-medium ${
          active ? "text-[#1f3d67]" : "text-[#9aa5b4]"
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
    <span className="text-[14px] font-medium text-[#1f3d67]">
      {label}
      {required ? <span className="text-[#ef4444]"> *</span> : null}
    </span>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-[#ef4444]">{message}</p>;
}

function CustomSelect({
  name,
  value,
  placeholder,
  options,
  groups,
  error,
  onChange,
  onBlur,
}: {
  name: keyof FormValues;
  value: string;
  placeholder: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  error?: string;
  onChange: (name: keyof FormValues, value: string) => void;
  onBlur: (name: keyof FormValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const flatOptions = useMemo(() => {
    if (groups) {
      return groups.flatMap((group) => group.options);
    }

    return options ?? [];
  }, [groups, options]);

  const selectedOption = flatOptions.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (nextValue: string) => {
    onChange(name, nextValue);
    onBlur(name);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => onBlur(name)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm outline-none transition focus:border-[#1f3d67] ${
          error ? "border-[#ef4444]" : "border-[#d7dee8]"
        } ${selectedOption ? "text-[#334155]" : "font-normal text-[#bcc5d1]"}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-lg border border-[#e4e9f1] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.10)]">
          {groups
            ? groups.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa5b4]">
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <button
                      key={`${group.label}-${option.value}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(option.value)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        value === option.value
                          ? "bg-[#eef3f8] font-medium text-[#1f3d67]"
                          : "text-[#334155] hover:bg-[#f5f7fa]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ))
            : options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    value === option.value
                      ? "bg-[#eef3f8] font-medium text-[#1f3d67]"
                      : "text-[#334155] hover:bg-[#f5f7fa]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
        </div>
      ) : null}
    </div>
  );
}

function InputField({
  label,
  name,
  required,
  placeholder,
  type = "text",
  value,
  error,
  className,
  onChange,
  onBlur,
}: {
  label: string;
  name: keyof FormValues;
  required?: boolean;
  placeholder?: string;
  type?: string;
  value: string;
  error?: string;
  className?: string;
  onChange: (name: keyof FormValues, value: string) => void;
  onBlur: (name: keyof FormValues) => void;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <FieldLabel label={label} required={required} />
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={() => onBlur(name)}
        className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-[#334155] outline-none transition placeholder:font-normal placeholder:text-[#bcc5d1] focus:border-[#1f3d67] ${
          error ? "border-[#ef4444]" : "border-[#d7dee8]"
        }`}
      />
      <ErrorMessage message={error} />
    </label>
  );
}

export function OnboardingStepOneForm({
  action,
  regions,
}: OnboardingStepOneFormProps) {
  const regionOptions = useMemo(() => {
    const normalizedRegions =
      regions.length > 0 ? regions : ["Region XI", "Davao Region"];

    return normalizedRegions.map((region) => ({
      value: region,
      label: region,
    }));
  }, [regions]);

  const defaultRegion = useMemo(() => {
    if (regions.includes("Davao Region")) {
      return "Davao Region";
    }

    if (regions.includes("Region XI")) {
      return "Region XI";
    }

    return regions[0] ?? "Region XI";
  }, [regions]);

  const [values, setValues] = useState<FormValues>({
    business_name: "",
    business_type: "",
    other_business_type: "",
    business_location: "",
    city: "",
    province: "",
    region: defaultRegion,
    contact_name: "",
    contact_number: "",
    about: "",
  });

  const [touched, setTouched] = useState<
    Partial<Record<keyof FormValues, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);

  const businessTypeValue =
    values.business_type === "others"
      ? values.other_business_type.trim()
      : values.business_type;

  const errors = useMemo<FormErrors>(() => {
    const nextErrors: FormErrors = {};

    if (!values.business_name.trim()) {
      nextErrors.business_name = "Business name is required.";
    }

    if (!values.business_type) {
      nextErrors.business_type = "Business type is required.";
    }

    if (
      values.business_type === "others" &&
      !values.other_business_type.trim()
    ) {
      nextErrors.other_business_type = "Please enter your business type.";
    }

    if (!values.business_location.trim()) {
      nextErrors.business_location = "Business location is required.";
    }

    if (!values.city) {
      nextErrors.city = "City is required.";
    }

    if (!values.province) {
      nextErrors.province = "Province is required.";
    }

    if (!values.region) {
      nextErrors.region = "Region is required.";
    }

    if (!values.contact_name.trim()) {
      nextErrors.contact_name = "Contact name is required.";
    }

    if (!values.contact_number.trim()) {
      nextErrors.contact_number = "Contact number is required.";
    } else if (values.contact_number.length !== 10) {
      nextErrors.contact_number = "Contact number must be 10 digits.";
    }

    return nextErrors;
  }, [values]);

  const isFormValid = Object.keys(errors).length === 0;

  const shouldShowError = (name: keyof FormValues) =>
    submitted || Boolean(touched[name]);

  const getError = (name: keyof FormValues) =>
    shouldShowError(name) ? errors[name] : undefined;

  const handleChange = (name: keyof FormValues, value: string) => {
    setValues((current) => {
      if (name === "contact_number") {
        return {
          ...current,
          contact_number: value.replace(/\D/g, "").slice(0, 10),
        };
      }

      if (name === "business_type" && value !== "others") {
        return {
          ...current,
          business_type: value,
          other_business_type: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleBlur = (name: keyof FormValues) => {
    setTouched((current) => ({
      ...current,
      [name]: true,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setSubmitted(true);

    if (!isFormValid) {
      event.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} noValidate className="space-y-4">
      <input type="hidden" name="business_type" value={businessTypeValue} />
      <input
        type="hidden"
        name="contact_number"
        value={values.contact_number ? `+63${values.contact_number}` : ""}
      />
      <input type="hidden" name="city" value={values.city} />
      <input type="hidden" name="province" value={values.province} />
      <input type="hidden" name="region" value={values.region} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
            Basic Profile Information
          </h1>
          <p className="mt-0.5 text-[18px] leading-6 text-[#8b95a5]">
            Share a few details so we can tailor KaSupply to your needs
          </p>
        </div>
        <p className="text-[16px] font-semibold text-[#223654]">Step 1 of 3</p>
      </div>

      <div className="mb-5 mt-5 flex items-center gap-3">
        <StepIndicator number={1} label="Profile Setup" active />
        <div className="h-px flex-1 bg-[#d7dee8]" />
        <StepIndicator number={2} label="Verification" />
        <div className="h-px flex-1 bg-[#d7dee8]" />
        <StepIndicator number={3} label="User Verified" />
      </div>

      <div className="rounded-[12px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-6">
          <InputField
            label="Business Name"
            name="business_name"
            required
            placeholder="e.g. Dela Cruz Trading Co."
            value={values.business_name}
            error={getError("business_name")}
            onChange={handleChange}
            onBlur={handleBlur}
            className="md:col-span-3"
          />

          <div className="block space-y-1 md:col-span-3">
            <FieldLabel label="Business Type" required />
            <CustomSelect
              name="business_type"
              value={values.business_type}
              placeholder="Select Type"
              options={BUSINESS_TYPE_OPTIONS}
              error={getError("business_type")}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <ErrorMessage message={getError("business_type")} />
          </div>

          {values.business_type === "others" ? (
            <InputField
              label="Other Business Type"
              name="other_business_type"
              required
              placeholder="e.g. Food Cooperative"
              value={values.other_business_type}
              error={getError("other_business_type")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="md:col-span-6"
            />
          ) : null}

          <div className="md:col-span-6">
            <InputField
              label="Business Location"
              name="business_location"
              required
              placeholder="e.g. 123 Rizal St., Brgy. Poblacion"
              value={values.business_location}
              error={getError("business_location")}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>

          <div className="block space-y-1 md:col-span-2">
            <FieldLabel label="City" required />
            <CustomSelect
              name="city"
              value={values.city}
              placeholder="Select City"
              groups={DAVAO_CITY_GROUPS}
              error={getError("city")}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <ErrorMessage message={getError("city")} />
          </div>

          <div className="block space-y-1 md:col-span-2">
            <FieldLabel label="Province" required />
            <CustomSelect
              name="province"
              value={values.province}
              placeholder="Select Province"
              options={PROVINCE_OPTIONS}
              error={getError("province")}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <ErrorMessage message={getError("province")} />
          </div>

          <div className="block space-y-1 md:col-span-2">
            <FieldLabel label="Region" required />
            <CustomSelect
              name="region"
              value={values.region}
              placeholder="Select Region"
              options={regionOptions}
              error={getError("region")}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <ErrorMessage message={getError("region")} />
          </div>

          <InputField
            label="Contact Name"
            name="contact_name"
            required
            placeholder="e.g. Juan Dela Cruz"
            value={values.contact_name}
            error={getError("contact_name")}
            onChange={handleChange}
            onBlur={handleBlur}
            className="md:col-span-3"
          />

          <label className="block space-y-1 md:col-span-3">
            <FieldLabel label="Contact Number" required />
            <div
              className={`flex h-10 overflow-hidden rounded-md border bg-white transition focus-within:border-[#1f3d67] ${
                getError("contact_number")
                  ? "border-[#ef4444]"
                  : "border-[#d7dee8]"
              }`}
            >
              <span className="flex h-full items-center border-r border-[#d7dee8] bg-[#f8fafc] px-3 text-sm font-medium text-[#334155]">
                +63
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={values.contact_number}
                placeholder="e.g. 9171234567"
                onChange={(event) =>
                  handleChange("contact_number", event.target.value)
                }
                onBlur={() => handleBlur("contact_number")}
                className="h-full w-full bg-white px-3 text-sm text-[#334155] outline-none placeholder:font-normal placeholder:text-[#bcc5d1]"
              />
            </div>
            <ErrorMessage message={getError("contact_number")} />
          </label>

          <label className="block space-y-1 md:col-span-6">
            <FieldLabel label="Business Description" />
            <textarea
              name="about"
              rows={4}
              value={values.about}
              placeholder="e.g. We supply fresh produce and dry goods to F&B businesses in Davao."
              onChange={(event) => handleChange("about", event.target.value)}
              onBlur={() => handleBlur("about")}
              className="w-full rounded-md border border-[#d7dee8] bg-white px-3 py-3 text-sm text-[#334155] outline-none transition placeholder:font-normal placeholder:text-[#bcc5d1] focus:border-[#1f3d67]"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isFormValid}
          className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white transition ${
            isFormValid
              ? "bg-[#1f3d67] hover:bg-[#193354]"
              : "cursor-not-allowed bg-[#c3ccd9]"
          }`}
        >
          Proceed
        </button>
      </div>
    </form>
  );
}