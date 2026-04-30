"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { updateBuyerAccount } from "@/app/buyer/(protected)/account/actions";

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

const DAVAO_REGION_PROVINCES = [
  "Davao del Sur",
  "Davao del Norte",
  "Davao de Oro",
  "Davao Occidental",
  "Davao Oriental",
];

const DAVAO_LOCALITY_GROUPS = [
  {
    label: "Davao del Sur",
    options: [
      "Bansalan",
      "Davao City",
      "Digos City",
      "Hagonoy",
      "Kiblawan",
      "Magsaysay",
      "Malalag",
      "Matanao",
      "Padada",
      "Santa Cruz",
      "Sulop",
    ],
  },
  {
    label: "Davao del Norte",
    options: [
      "Asuncion",
      "Braulio E. Dujali",
      "Carmen",
      "Island Garden City of Samal",
      "Kapalong",
      "New Corella",
      "Panabo City",
      "San Isidro",
      "Santo Tomas",
      "Tagum City",
      "Talaingod",
    ],
  },
  {
    label: "Davao de Oro",
    options: [
      "Compostela",
      "Laak",
      "Mabini",
      "Maco",
      "Maragusan",
      "Mawab",
      "Monkayo",
      "Montevista",
      "Nabunturan",
      "New Bataan",
      "Pantukan",
    ],
  },
  {
    label: "Davao Occidental",
    options: [
      "Don Marcelino",
      "Jose Abad Santos",
      "Malita",
      "Santa Maria",
      "Sarangani",
    ],
  },
  {
    label: "Davao Oriental",
    options: [
      "Baganga",
      "Banaybanay",
      "Boston",
      "Caraga",
      "Cateel",
      "Governor Generoso",
      "Lupon",
      "Manay",
      "Mati City",
      "San Isidro",
      "Tarragona",
    ],
  },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "trader", label: "Trader" },
  { value: "retailer", label: "Retailer" },
  { value: "processor", label: "Processor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "others", label: "Others" },
];

const OTHER_BUSINESS_TYPE_VALUE = "others";

type BuyerAccountFormProps = {
  user: {
    name: string;
    email: string;
  };
  businessProfile: {
    business_name: string;
    business_type: string;
    contact_name: string | null;
    contact_number: string | null;
    business_location: string;
    city: string;
    province: string;
    region: string;
    about: string | null;
  };
  documentId: number | null;
  documentVisibility: boolean;
  nextPath?: string | null;
  requiredFlow?: string | null;
};

type FormValues = {
  business_name: string;
  business_type: string;
  business_type_other: string;
  business_location: string;
  city: string;
  province: string;
  region: string;
  contact_name: string;
  contact_number: string;
  about: string;
};

type RequiredFieldName = Exclude<keyof FormValues, "about">;

type SelectOption = {
  value: string;
  label: string;
};

type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

const REQUIRED_FIELD_LABELS: Record<RequiredFieldName, string> = {
  business_name: "Business name",
  business_type: "Business type",
  business_type_other: "Business type",
  business_location: "Business location",
  city: "City",
  province: "Province",
  region: "Region",
  contact_name: "Contact name",
  contact_number: "Contact number",
};

const REQUIRED_FIELDS: RequiredFieldName[] = [
  "business_name",
  "business_type",
  "business_location",
  "city",
  "province",
  "region",
  "contact_name",
  "contact_number",
];

const DAVAO_PROVINCE_GROUPS: SelectOptionGroup[] = [
  {
    label: "Region XI - Davao Region",
    options: DAVAO_REGION_PROVINCES.map((province) => ({
      value: province,
      label: province,
    })),
  },
];

const DAVAO_CITY_GROUPS: SelectOptionGroup[] = DAVAO_LOCALITY_GROUPS.map(
  (group) => ({
    label: group.label,
    options: group.options.map((locality) => ({
      value: locality,
      label: locality,
    })),
  }),
);

const REGION_GROUPS: SelectOptionGroup[] = [
  {
    label: "Philippine Regions",
    options: PHILIPPINE_REGIONS.map((region) => ({
      value: region,
      label: region,
    })),
  },
];

const BUSINESS_TYPE_GROUPS: SelectOptionGroup[] = [
  {
    label: "Business Type",
    options: BUSINESS_TYPE_OPTIONS,
  },
];

function flattenOptions(groups: SelectOptionGroup[]) {
  return groups.flatMap((group) => group.options);
}

function getRequiredError(name: RequiredFieldName, value: string) {
  return value.trim() ? "" : `${REQUIRED_FIELD_LABELS[name]} is required.`;
}

function getActiveRequiredFields(values: FormValues) {
  if (values.business_type === OTHER_BUSINESS_TYPE_VALUE) {
    return [...REQUIRED_FIELDS, "business_type_other"] as RequiredFieldName[];
  }

  return REQUIRED_FIELDS;
}

function formatContactNumberInput(value: string) {
  // Only allow digits, limit to 10
  return value.replace(/\D/g, "").slice(0, 10);
}

function validateContactNumber(value: string): string | null {
  // Extract all digits
  const digitsOnly = value.replace(/\D/g, "");
  
  if (!digitsOnly) {
    return null;
  }
  
  // Must be exactly 10 digits
  if (digitsOnly.length !== 10) {
    return "Please complete the contact number.";
  }
  
  return null;
}

function buildRequiredErrors(values: FormValues) {
  const errors = getActiveRequiredFields(values).reduce<
    Partial<Record<RequiredFieldName, string>>
  >(
    (nextErrors, fieldName) => {
      const error = getRequiredError(fieldName, values[fieldName]);

      if (error) {
        nextErrors[fieldName] = error;
      }

      return nextErrors;
    },
    {},
  );

  // Add contact number validation
  const contactNumberError = getRequiredError("contact_number", values.contact_number);
  if (contactNumberError) {
    errors.contact_number = contactNumberError;
  } else {
    const validationError = validateContactNumber(values.contact_number);
    if (validationError) {
      errors.contact_number = validationError;
    }
  }

  return errors;
}

function buildContactNumberError(value: string): string | null {
  // First check if empty (required field validation)
  if (!value.trim()) {
    return null;
  }
  
  // Then check for 11-digit validation
  return validateContactNumber(value);
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
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

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-normal text-[#dc2626]">{message}</p>;
}

function InputField({
  label,
  name,
  fieldName,
  hideLabel,
  required,
  placeholder,
  value,
  error,
  className,
  onChange,
  onBlur,
}: {
  label: string;
  name: RequiredFieldName;
  fieldName?: string | null;
  hideLabel?: boolean;
  required?: boolean;
  placeholder?: string;
  value: string;
  error?: string;
  className?: string;
  onChange: (name: RequiredFieldName, value: string) => void;
  onBlur: (name: RequiredFieldName) => void;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      {hideLabel ? null : <FieldLabel label={label} required={required} />}
      <input
        name={fieldName === null ? undefined : fieldName ?? name}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={() => onBlur(name)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`h-10 w-full rounded-md border bg-white px-3 text-sm font-normal text-[#334155] outline-none transition placeholder:font-normal placeholder:text-[#bcc5d1] focus:border-[#1f3d67] ${
          error ? "border-[#dc2626]" : "border-[#d7dee8]"
        }`}
      />
      <div id={`${name}-error`}>
        <FieldError message={error} />
      </div>
    </label>
  );
}

function CustomSelect({
  label,
  name,
  required,
  placeholder,
  value,
  groups,
  submitValue,
  error,
  className,
  onChange,
  onBlur,
}: {
  label: string;
  name: RequiredFieldName;
  required?: boolean;
  placeholder: string;
  value: string;
  groups: SelectOptionGroup[];
  submitValue?: string;
  error?: string;
  className?: string;
  onChange: (name: RequiredFieldName, value: string) => void;
  onBlur: (name: RequiredFieldName) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo(() => flattenOptions(groups), [groups]);
  const selectedOption = options.find((option) => option.value === value);
  const visibleError = open ? undefined : error;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);

        if (open) {
          onBlur(name);
        }
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [name, onBlur, open]);

  return (
    <div ref={rootRef} className={`relative block space-y-1 ${className ?? ""}`}>
      <FieldLabel label={label} required={required} />
      <input type="hidden" name={name} value={submitValue ?? value} />
      <button
        type="button"
        onClick={() => {
          if (open && !value.trim()) {
            onBlur(name);
          }

          setOpen((current) => !current);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              onBlur(name);
            }
          }, 0);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-describedby={visibleError ? `${name}-error` : undefined}
        className={`relative flex h-10 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 pr-9 text-left text-sm font-normal outline-none transition focus:border-[#1f3d67] ${
          visibleError ? "border-[#dc2626]" : "border-[#d7dee8]"
        } ${selectedOption ? "text-[#334155]" : "text-[#bcc5d1]"}`}
      >
        <span className="min-w-0 truncate font-normal">
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#667085]">
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-64 w-full overflow-y-auto rounded-lg border border-[#dbe3ef] bg-white py-2 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
        >
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#98a2b3]">
                {group.label}
              </p>
              {group.options.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={`${group.label}-${option.value}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(name, option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm font-normal transition ${
                      selected
                        ? "bg-[#eef4fb] text-[#1f3d67]"
                        : "text-[#475467] hover:bg-[#f8fafc] hover:text-[#1f3d67]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      <div id={`${name}-error`}>
        <FieldError message={visibleError} />
      </div>
    </div>
  );
}

export function BuyerAccountForm({
  user,
  businessProfile,
  documentId,
  documentVisibility,
  nextPath,
  requiredFlow,
}: BuyerAccountFormProps) {
  const initialCity = flattenOptions(DAVAO_CITY_GROUPS).some(
    (option) => option.value === businessProfile.city,
  )
    ? businessProfile.city
    : "";
  const initialProvince = DAVAO_REGION_PROVINCES.includes(businessProfile.province)
    ? businessProfile.province
    : "";
  const initialRegion = PHILIPPINE_REGIONS.includes(businessProfile.region)
    ? businessProfile.region
    : "Region XI - Davao Region";
  const hasKnownBusinessType = BUSINESS_TYPE_OPTIONS.some(
    (option) => option.value === businessProfile.business_type,
  );
  const initialBusinessType =
    businessProfile.business_type && !hasKnownBusinessType
      ? OTHER_BUSINESS_TYPE_VALUE
      : businessProfile.business_type;
  const initialOtherBusinessType =
    businessProfile.business_type && !hasKnownBusinessType
      ? businessProfile.business_type
      : "";

  const [values, setValues] = useState<FormValues>({
    business_name: businessProfile.business_name,
    business_type: initialBusinessType,
    business_type_other: initialOtherBusinessType,
    business_location: businessProfile.business_location,
    city: initialCity,
    province: initialProvince,
    region: initialRegion,
    contact_name: businessProfile.contact_name ?? "",
    contact_number: (() => {
      const stored = businessProfile.contact_number ?? "";
      // Strip +63 prefix if present since the field now has +63 as a fixed prefix
      return stored.startsWith("+63") ? stored.slice(3) : stored;
    })(),
    about: businessProfile.about ?? "",
  });
  const [touched, setTouched] = useState<Partial<Record<RequiredFieldName, boolean>>>(
    {},
  );
  const [errors, setErrors] = useState<Partial<Record<RequiredFieldName, string>>>(
    {},
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState("");
  const backHref = "/buyer";

  const isFormComplete = getActiveRequiredFields(values).every((fieldName) =>
    values[fieldName].trim(),
  ) && !validateContactNumber(values.contact_number);

  function getVisibleError(name: RequiredFieldName) {
    if (name === "contact_number") {
      const baseError = touched[name] || attemptedSubmit ? errors[name] : undefined;
      if (baseError) return baseError;
      const contactError = buildContactNumberError(values.contact_number);
      return contactError ?? undefined;
    }
    return touched[name] || attemptedSubmit ? errors[name] : undefined;
  }

  function updateField(name: RequiredFieldName, value: string) {
    let nextValue = value;
    
    if (name === "contact_number") {
      // Filter at input level: only allow digits, limit to 10
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setValues((current) => {
      const next = {
        ...current,
        [name]: nextValue,
      };

      if (name === "business_type" && nextValue !== OTHER_BUSINESS_TYPE_VALUE) {
        next.business_type_other = "";
      }

      return next;
    });

    setErrors((current) => {
      const next = { ...current };
      delete next[name];

      if (name === "contact_number") {
        delete next.contact_number;
      }

      if (name === "business_type") {
        delete next.business_type_other;
      }

      return next;
    });

    if (name === "business_type" && nextValue !== OTHER_BUSINESS_TYPE_VALUE) {
      setTouched((current) => {
        const next = { ...current };
        delete next.business_type_other;

        return next;
      });
    }
  }

  function updateAbout(event: ChangeEvent<HTMLTextAreaElement>) {
    setValues((current) => ({
      ...current,
      about: event.target.value,
    }));
  }

  function markFieldTouched(name: RequiredFieldName) {
    setTouched((current) => ({
      ...current,
      [name]: true,
    }));

    setErrors((current) => {
      const next = { ...current };
      const error = getRequiredError(name, values[name]);

      if (error) {
        next[name] = error;
      } else {
        delete next[name];
      }

      return next;
    });
  }

  function markRequiredFieldsTouched() {
    setTouched(
      getActiveRequiredFields(values).reduce<
        Partial<Record<RequiredFieldName, boolean>>
      >(
        (nextTouched, fieldName) => {
          nextTouched[fieldName] = true;
          return nextTouched;
        },
        {},
      ),
    );
  }

  function showRequiredFieldErrors() {
    setSubmitError("");
    setAttemptedSubmit(true);
    setErrors(buildRequiredErrors(values));
    markRequiredFieldsTouched();
  }

  return (
    <form
      noValidate
      className="space-y-4"
      action={(formData) => {
        setSubmitError("");
        setAttemptedSubmit(true);

        const nextErrors = buildRequiredErrors(values);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
          markRequiredFieldsTouched();
          return;
        }

        startTransition(async () => {
          try {
            await updateBuyerAccount(formData);
          } catch (err) {
            if (err instanceof Error && err.message === "NEXT_REDIRECT") {
              throw err; // let Next.js handle the redirect
            }
            setSubmitError(
              err instanceof Error ? err.message : "Something went wrong.",
            );
          }
        });
      }}
    >
      <input type="hidden" name="name" value={user.name} />
      <input type="hidden" name="document_id" value={documentId ?? ""} />
      <input
        type="hidden"
        name="is_visible_to_others"
        value={documentVisibility ? "on" : ""}
      />
      <input type="hidden" name="next_path" value={nextPath ?? ""} />
      <input type="hidden" name="required_flow" value={requiredFlow ?? ""} />
      <input
        type="hidden"
        name="contact_number"
        value={"+63" + values.contact_number}
      />

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
              Basic Profile Information
            </h1>
            <p className="mt-0.4 text-[18px] leading-6 text-[#8b95a5]">
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
          <div className="grid gap-3 md:grid-cols-6">
            <InputField
              label="Business Name"
              name="business_name"
              required
              placeholder="e.g. Dela Cruz Trading Co."
              value={values.business_name}
              error={getVisibleError("business_name")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-3"
            />

            <CustomSelect
              label="Business Type"
              name="business_type"
              required
              placeholder="Select business type"
              value={values.business_type}
              groups={BUSINESS_TYPE_GROUPS}
              submitValue={
                values.business_type === OTHER_BUSINESS_TYPE_VALUE
                  ? values.business_type_other
                  : values.business_type
              }
              error={getVisibleError("business_type")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-3"
            />

            {values.business_type === OTHER_BUSINESS_TYPE_VALUE ? (
              <InputField
                label="Business type"
                name="business_type_other"
                fieldName={null}
                hideLabel
                required
                placeholder="e.g. Food Cooperative"
                value={values.business_type_other}
                error={getVisibleError("business_type_other")}
                onChange={updateField}
                onBlur={markFieldTouched}
                className="-mt-1 md:col-span-3 md:col-start-4"
              />
            ) : null}

            <InputField
              label="Business Location"
              name="business_location"
              required
              placeholder="e.g. 123 Rizal St., Brgy. Poblacion"
              value={values.business_location}
              error={getVisibleError("business_location")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-6"
            />

            <CustomSelect
              label="City / Municipality"
              name="city"
              required
              placeholder="Select city or municipality"
              value={values.city}
              groups={DAVAO_CITY_GROUPS}
              error={getVisibleError("city")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-2"
            />

            <CustomSelect
              label="Province"
              name="province"
              required
              placeholder="Select province"
              value={values.province}
              groups={DAVAO_PROVINCE_GROUPS}
              error={getVisibleError("province")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-2"
            />

            <CustomSelect
              label="Region"
              name="region"
              required
              placeholder="Select region"
              value={values.region}
              groups={REGION_GROUPS}
              error={getVisibleError("region")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-2"
            />

            <InputField
              label="Contact Name"
              name="contact_name"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={values.contact_name}
              error={getVisibleError("contact_name")}
              onChange={updateField}
              onBlur={markFieldTouched}
              className="md:col-span-3"
            />

            <div className="relative md:col-span-3">
              <FieldLabel label="Contact Number" required />
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 border-[#d7dee8] bg-[#f1f3f5] px-3 text-sm font-normal text-[#334155]">
                  +63
                </span>
                <input
                  type="tel"
                  name="contact_number"
                  required
                  placeholder="e.g. 9171234567"
                  value={values.contact_number}
                  onChange={(event) => updateField("contact_number", event.target.value)}
                  onBlur={() => markFieldTouched("contact_number")}
                  aria-invalid={!!getVisibleError("contact_number")}
                  aria-describedby={getVisibleError("contact_number") ? "contact_number-error" : undefined}
                  className={`h-10 w-full rounded-r-md border bg-white px-3 text-sm font-normal text-[#334155] outline-none transition placeholder:font-normal placeholder:text-[#bcc5d1] focus:border-[#1f3d67] ${
                    getVisibleError("contact_number") ? "border-[#dc2626]" : "border-[#d7dee8]"
                  }`}
                />
              </div>
              <div id="contact_number-error">
                <FieldError message={getVisibleError("contact_number")} />
              </div>
            </div>

            <label className="block space-y-1 md:col-span-6">
              <FieldLabel label="Business Description" />
              <textarea
                name="about"
                rows={4}
                value={values.about}
                onChange={updateAbout}
                placeholder="e.g. We supply fresh produce and dry goods to F&B businesses in Davao."
                className="w-full rounded-md border border-[#d7dee8] bg-white px-3 py-2.5 text-sm font-normal text-[#334155] outline-none transition placeholder:font-normal placeholder:text-[#bcc5d1] focus:border-[#1f3d67]"
              />
            </label>
          </div>
        </div>
      </section>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="flex items-center justify-end gap-4">
        <Link
          href={backHref}
          className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
        >
          Back
        </Link>
        <span
          onPointerDown={() => {
            if (!isFormComplete && !isPending) {
              showRequiredFieldErrors();
            }
          }}
        >
          <button
            type="submit"
            disabled={!isFormComplete || isPending}
            className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:pointer-events-none ${
              isFormComplete
                ? "bg-[#1f3d67] hover:bg-[#193354] disabled:opacity-70"
                : "bg-[#c3ccd9]"
            }`}
          >
            {isPending ? "Saving..." : "Proceed"}
          </button>
        </span>
      </div>
    </form>
  );
}
