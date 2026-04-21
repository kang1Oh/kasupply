"use client";

import { useMemo, useState, useTransition } from "react";
import { updateSupplierAccountSettings } from "./actions";

type CategoryOption = {
  categoryId: number;
  categoryName: string;
};

type SupplierBusinessProfileFormProps = {
  headerBusinessName: string;
  headerInitials?: string;
  userEmail: string;
  businessProfile: {
    businessName: string;
    businessType: string;
    businessLocation: string;
    city: string;
    province: string;
    region: string;
    contactName: string;
    contactNumber: string;
    businessDescription: string;
  };
  categories: CategoryOption[];
  initialSelectedCategoryIds: number[];
  initialOtherCategories: string[];
};

type FormState = {
  businessName: string;
  businessType: string;
  businessLocation: string;
  emailAddress: string;
  contactName: string;
  contactNumber: string;
  businessDescription: string;
  otherCategory: string;
};

const BUSINESS_TYPE_OPTIONS = [
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Distributor", value: "distributor" },
  { label: "Trader", value: "trader" },
  { label: "Retailer", value: "retailer" },
  { label: "Processor", value: "processor" },
  { label: "Wholesaler", value: "wholesaler" },
] as const;

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SupplierBusinessProfileForm({
  headerBusinessName,
  headerInitials = "DF",
  userEmail,
  businessProfile,
  categories,
  initialSelectedCategoryIds,
  initialOtherCategories,
}: SupplierBusinessProfileFormProps) {
  const initialFormState = useMemo<FormState>(
    () => ({
      businessName: businessProfile.businessName,
      businessType: businessProfile.businessType,
      businessLocation: businessProfile.businessLocation,
      emailAddress: userEmail,
      contactName: businessProfile.contactName,
      contactNumber: businessProfile.contactNumber,
      businessDescription: businessProfile.businessDescription,
      otherCategory: initialOtherCategories.join(", "),
    }),
    [businessProfile, initialOtherCategories, userEmail],
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialSelectedCategoryIds,
  );
  const [fileInputKey, setFileInputKey] = useState(0);
  const avatarInitials = useMemo(
    () =>
      headerInitials.trim() ||
      getInitials(headerBusinessName || businessProfile.businessName || "BP"),
    [businessProfile.businessName, headerBusinessName, headerInitials],
  );

  const normalizedBusinessType = useMemo(() => {
    const currentValue = formState.businessType.trim().toLowerCase();
    return BUSINESS_TYPE_OPTIONS.some((option) => option.value === currentValue)
      ? currentValue
      : "";
  }, [formState.businessType]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleCategory(categoryId: number) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((entry) => entry !== categoryId)
        : [...current, categoryId],
    );
  }

  function handleDiscard() {
    setError("");
    setFormState(initialFormState);
    setSelectedCategoryIds(initialSelectedCategoryIds);
    setFileInputKey((current) => current + 1);
  }

  return (
    <form
      className="space-y-[12px]"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await updateSupplierAccountSettings(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
      {selectedCategoryIds.map((categoryId) => (
        <input key={categoryId} type="hidden" name="category_ids" value={categoryId} />
      ))}
      <input type="hidden" name="city" value={businessProfile.city} />
      <input type="hidden" name="province" value={businessProfile.province} />
      <input type="hidden" name="region" value={businessProfile.region} />

      <section className="rounded-[18px] border border-[#E3EAF2] bg-white px-[18px] py-[16px] shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-[14px]">
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#DDF7E8] text-[17px] font-medium text-[#2E7D5B]">
              {avatarInitials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[17px] font-medium text-[#4A5B73]">
                {headerBusinessName}
              </p>
              <p className="mt-[5px] text-[14px] text-[#A7B0BE]">JPG or PNG. Max 2MB.</p>
            </div>
          </div>

          <label className="inline-flex h-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-[#D8E1ED] bg-white px-[18px] text-[13px] font-medium text-[#42536B] transition hover:bg-[#F8FAFC]">
            Change photo
            <input
              key={fileInputKey}
              name="avatar_file"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="sr-only"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[16px] border border-[#E8EDF5] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
        <div className="border-b border-[#E9EEF5] px-[18px] pb-[18px] pt-[14px]">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#2E446A]">
            Basic Information
          </h2>
        </div>

        <div className="grid gap-[12px] px-[18px] py-[16px] md:grid-cols-2">
          <label className="block">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Business Name
            </span>
            <input
              name="business_name"
              value={formState.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
              className="h-[42px] w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>

          <label className="block">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Business Type
            </span>
            <div className="relative">
              <select
                name="business_type"
                value={normalizedBusinessType}
                onChange={(event) => updateField("businessType", event.target.value)}
                className="h-[42px] w-full appearance-none rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] pr-[40px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
              >
                <option value="" disabled>
                  Select business type
                </option>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-[12px] flex items-center text-[#98A2B3]">
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="m5 7.5 5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Business Location
            </span>
            <input
              name="business_location"
              value={formState.businessLocation}
              onChange={(event) => updateField("businessLocation", event.target.value)}
              className="h-[42px] w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>

          <label className="block">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Email Address
            </span>
            <input
              name="email_address"
              value={formState.emailAddress}
              onChange={(event) => updateField("emailAddress", event.target.value)}
              className="h-[42px] w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>

          <label className="block">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Contact Name
            </span>
            <input
              name="contact_name"
              value={formState.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
              className="h-[42px] w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Contact Number
            </span>
            <input
              name="contact_number"
              value={formState.contactNumber}
              onChange={(event) => updateField("contactNumber", event.target.value)}
              className="h-[42px] w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] text-[15px] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-[6px] block text-[12px] font-medium uppercase text-[#A6AFBE]">
              Business Description
            </span>
            <textarea
              name="about"
              rows={5}
              value={formState.businessDescription}
              onChange={(event) => updateField("businessDescription", event.target.value)}
              className="w-full rounded-[6px] border border-[#D7DFEB] bg-white px-[16px] py-[12px] text-[15px] leading-[1.55] text-[#334155] outline-none transition focus:border-[#9CB0CB]"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[16px] border border-[#E8EDF5] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
        <div className="border-b border-[#E9EEF5] px-[18px] py-[14px]">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[#2E446A]">
            Categories Supplied
          </h2>
        </div>

        <div className="px-[18px] py-[18px]">
          <p className="text-[14px] text-[#98A2B3]">
            Select the raw material categories you can supply to buyers.
          </p>

          <div className="mt-[14px] flex flex-wrap gap-[8px]">
            {categories.map((category) => {
              const selected = selectedCategoryIds.includes(category.categoryId);

              return (
                <button
                  key={category.categoryId}
                  type="button"
                  onClick={() => toggleCategory(category.categoryId)}
                  className={`inline-flex h-[38px] items-center rounded-full border px-[14px] text-[13px] font-medium transition ${
                    selected
                      ? "border-[#274C7D] bg-[#274C7D] text-white"
                      : "border-[#AFC0D8] bg-white text-[#35516F] hover:bg-[#F7FAFD]"
                  }`}
                >
                  {category.categoryName}
                </button>
              );
            })}
          </div>

          <label className="mt-[18px] block">
            <span className="mb-[8px] block text-[15px] font-medium text-[#334155]">Others</span>
            <input
              name="other_categories"
              value={formState.otherCategory}
              onChange={(event) => updateField("otherCategory", event.target.value)}
              placeholder="Enter Category"
              className="h-[46px] w-full rounded-[10px] border border-[#D7DFEB] bg-white px-[18px] text-[15px] text-[#334155] outline-none transition placeholder:text-[#AAB4C3] focus:border-[#9CB0CB]"
            />
          </label>
        </div>
      </section>

      {error ? <p className="text-[12px] text-[#D92D20]">{error}</p> : null}

      <div className="flex flex-col gap-3 pt-[6px] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[#98A2B3]">Changes are not saved automatically.</p>

        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={handleDiscard}
            className="inline-flex h-[33px] items-center justify-center rounded-[6px] border border-[#D7DFEB] bg-white px-[12px] text-[13px] font-medium text-[#5C6A7E] transition hover:bg-[#F8FAFC]"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-[33px] items-center justify-center rounded-[6px] bg-[#2F6CF6] px-[12px] text-[13px] font-medium text-white transition hover:bg-[#245CE0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
