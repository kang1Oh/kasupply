"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BuyerSupplierCard,
  type BuyerHomepageSupplier,
} from "./buyer-supplier-card";
import type { SupplierSearchItem } from "@/app/buyer/search/actions";

type BuyerSearchPageProps = {
  suppliers: SupplierSearchItem[];
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="M6.75 4.75h10.5a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1H6.75a1 1 0 0 1-1-1V5.75a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 3.75v3M15.25 3.75v3M5.75 9.25h12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupplierTypeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="M8.5 11a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM15.5 10a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 18.25a3.75 3.75 0 0 1 7.5 0M12.5 18.25a3 3 0 0 1 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="M12 20.25s6-4.73 6-10.12a6 6 0 1 0-12 0c0 5.39 6 10.12 6 10.12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10.13"
        r="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CertificationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="M7.75 5.75h8.5a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m9.25 12 1.75 1.75 3.75-3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoqIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" aria-hidden="true">
      <path
        d="M6.75 7.25h10.5M6.75 12h10.5M6.75 16.75h10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

type FilterDropdownProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon: ReactNode;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  icon,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const displayValue = value === "All" ? label : value;
  const selectedCount = value === "All" ? 0 : 1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-[40px] items-center gap-[7px] rounded-full border border-[#5d6f8c] bg-white px-[14px] text-[13px] font-medium text-[#46566e] transition hover:border-[#294773] hover:text-[#223654]"
      >
        {icon}
        <span>{displayValue}</span>
        {selectedCount > 0 ? (
          <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#2f3f58] px-1 text-[9px] font-semibold text-white">
            {selectedCount}
          </span>
        ) : null}
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[220px] overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white py-2 shadow-[0_16px_32px_rgba(15,23,42,0.1)]">
          {options.map((option) => {
            const isActive = option === value;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition ${
                  isActive
                    ? "bg-[#edf3fb] font-medium text-[#223654]"
                    : "text-[#5f6d80] hover:bg-[#f8fafc] hover:text-[#223654]"
                }`}
              >
                <span>{option === "All" ? label : option}</span>
                {isActive ? <span className="text-[#294773]">&bull;</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type CategoryFilterDropdownProps = {
  selectedValues: string[];
  options: string[];
  counts: Record<string, number>;
  onApply: (values: string[]) => void;
  icon: ReactNode;
};

function CategoryFilterDropdown({
  selectedValues,
  options,
  counts,
  onApply,
  icon,
}: CategoryFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<string[]>(selectedValues);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftValues(selectedValues);
  }, [selectedValues]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setDraftValues(selectedValues);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [selectedValues]);

  const selectedCount = selectedValues.length;

  function toggleValue(value: string) {
    setDraftValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-[40px] items-center gap-[7px] rounded-full border border-[#5d6f8c] bg-white px-[14px] text-[13px] font-medium text-[#46566e] transition hover:border-[#294773] hover:text-[#223654]"
      >
        {icon}
        <span>Categories</span>
        {selectedCount > 0 ? (
          <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#2f3f58] px-1 text-[9px] font-semibold text-white">
            {selectedCount}
          </span>
        ) : null}
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[228px] overflow-hidden rounded-[14px] border border-[#dbe3ef] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.12)]">
          <div className="max-h-[260px] overflow-y-auto py-2">
            {options.map((option) => {
              const isChecked = draftValues.includes(option);

              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-1.5 text-[14px] text-[#43546d]"
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleValue(option)}
                      className="h-3.5 w-3.5 rounded-[2px] border-[#7b8ca4] text-[#2f7a45] focus:ring-0"
                    />
                    <span>{option}</span>
                  </span>
                  <span className="text-[12px] text-[#c0c8d4]">
                    {counts[option] ?? 0}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[#edf1f6] px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setDraftValues([]);
                onApply([]);
                setOpen(false);
              }}
              className="text-[11px] font-medium text-[#c2cad6] transition hover:text-[#7b8ca4]"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => {
                onApply(draftValues);
                setOpen(false);
              }}
              className="inline-flex h-[28px] items-center justify-center rounded-[6px] bg-[#2f7a45] px-5 text-[11px] font-semibold text-white transition hover:bg-[#26663a]"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function toHomepageSupplier(supplier: SupplierSearchItem): BuyerHomepageSupplier {
  const categoryTags = Array.from(
    new Set(
      supplier.products
        .map((product) => product.categoryName?.trim())
        .filter((tag): tag is string => Boolean(tag))
    )
  ).slice(0, 3);

  return {
    supplierId: supplier.supplierId,
    profileId: supplier.profileId,
    name: supplier.businessName,
    initials: getInitials(supplier.businessName || "Supplier"),
    avatarUrl: supplier.avatarUrl,
    supplierType: supplier.businessType,
    categoryTags,
    shortDescription:
      supplier.about?.trim() || "Verified supplier in the Davao Region.",
    location: supplier.city,
    verified: supplier.verifiedBadge,
    matchLabel: "No match yet",
    reviewLabel: "No reviews yet",
  };
}

export function BuyerSearchPage({ suppliers }: BuyerSearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedCertification, setSelectedCertification] = useState("All");
  const [selectedMoq, setSelectedMoq] = useState("All");
  const [sortBy, setSortBy] = useState("recent");

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();

    for (const supplier of suppliers) {
      for (const product of supplier.products) {
        if (product.categoryName?.trim()) {
          values.add(product.categoryName.trim());
        }
      }
    }

    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [suppliers]);

  const categoryFilterOptions = useMemo(
    () => categoryOptions.filter((option) => option !== "All"),
    [categoryOptions]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const supplier of suppliers) {
      const uniqueCategories = new Set(
        supplier.products
          .map((product) => product.categoryName?.trim())
          .filter((value): value is string => Boolean(value))
      );

      for (const category of uniqueCategories) {
        counts[category] = (counts[category] ?? 0) + 1;
      }
    }

    return counts;
  }, [suppliers]);

  const typeOptions = useMemo(() => {
    const values = new Set<string>();

    for (const supplier of suppliers) {
      if (supplier.businessType?.trim()) {
        values.add(supplier.businessType.trim());
      }
    }

    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [suppliers]);

  const locationOptions = useMemo(() => {
    const values = new Set<string>();

    for (const supplier of suppliers) {
      const label = supplier.city?.trim() || supplier.province?.trim();
      if (label) {
        values.add(label);
      }
    }

    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = suppliers.filter((supplier) => {
      const categoryTags = supplier.products.map((product) =>
        product.categoryName.toLowerCase()
      );
      const lowestMoq =
        supplier.products.length > 0
          ? Math.min(...supplier.products.map((product) => product.moq))
          : null;

      const matchesSearch =
        !normalizedSearch ||
        supplier.businessName.toLowerCase().includes(normalizedSearch) ||
        supplier.businessType.toLowerCase().includes(normalizedSearch) ||
        supplier.city.toLowerCase().includes(normalizedSearch) ||
        supplier.province.toLowerCase().includes(normalizedSearch) ||
        supplier.region.toLowerCase().includes(normalizedSearch) ||
        (supplier.about ?? "").toLowerCase().includes(normalizedSearch) ||
        supplier.searchableProducts.some(
          (product) =>
            product.productName.toLowerCase().includes(normalizedSearch) ||
            product.categoryName.toLowerCase().includes(normalizedSearch)
        );

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((category) =>
          categoryTags.includes(category.toLowerCase())
        );

      const matchesType =
        selectedType === "All" || supplier.businessType === selectedType;

      const matchesLocation =
        selectedLocation === "All" ||
        supplier.city === selectedLocation ||
        supplier.province === selectedLocation;

      const matchesCertification =
        selectedCertification === "All" ||
        (selectedCertification === "Verified" &&
          supplier.certificationsCount > 0);

      const matchesMoq =
        selectedMoq === "All" ||
        (selectedMoq === "<= 100" && lowestMoq !== null && lowestMoq <= 100) ||
        (selectedMoq === "101-500" &&
          lowestMoq !== null &&
          lowestMoq >= 101 &&
          lowestMoq <= 500) ||
        (selectedMoq === "> 500" && lowestMoq !== null && lowestMoq > 500);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesLocation &&
        matchesCertification &&
        matchesMoq
      );
    });

    filtered.sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.businessName.localeCompare(right.businessName);
        case "certified":
          return right.certificationsCount - left.certificationsCount;
        case "most_products":
          return right.products.length - left.products.length;
        case "recent":
        default:
          return right.supplierId - left.supplierId;
      }
    });

    return filtered;
  }, [
    searchQuery,
    selectedCategories,
    selectedCertification,
    selectedLocation,
    selectedMoq,
    selectedType,
    sortBy,
    suppliers,
  ]);

  const mappedSuppliers = useMemo(
    () => filteredSuppliers.map(toHomepageSupplier),
    [filteredSuppliers]
  );

  function clearAllFilters() {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedType("All");
    setSelectedLocation("All");
    setSelectedCertification("All");
    setSelectedMoq("All");
    setSortBy("recent");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-3 py-4 sm:px-4 lg:px-5">
      <section className="overflow-hidden rounded-[16px] border border-[#e7edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <div className="border-b border-[#edf1f6] px-4 py-3.5 sm:px-5">
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <label className="relative flex-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#c7cfdb]">
                <SearchIcon />
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search supplier name, product or categories..."
                className="h-[52px] w-full rounded-[14px] border border-[#dbe3ee] bg-white pl-12 pr-4 text-[13px] text-[#223654] outline-none transition placeholder:text-[#c2cad6] focus:border-[#294773]"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] bg-[#223f68] px-8 text-[15px] font-semibold text-white transition hover:bg-[#1d3454]"
            >
              Search
            </button>
          </form>
        </div>

        <div className="border-b border-[#edf1f6] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <CategoryFilterDropdown
              selectedValues={selectedCategories}
              options={categoryFilterOptions}
              counts={categoryCounts}
              onApply={setSelectedCategories}
              icon={<CategoryIcon />}
            />

            <FilterDropdown
              label="Supplier type"
              value={selectedType}
              options={typeOptions}
              onChange={setSelectedType}
              icon={<SupplierTypeIcon />}
            />

            <FilterDropdown
              label="Location"
              value={selectedLocation}
              options={locationOptions}
              onChange={setSelectedLocation}
              icon={<LocationIcon />}
            />

            <FilterDropdown
              label="Certification"
              value={selectedCertification}
              options={["All", "Verified"]}
              onChange={setSelectedCertification}
              icon={<CertificationIcon />}
            />

            <FilterDropdown
              label="MOQ"
              value={selectedMoq}
              options={["All", "<= 100", "101-500", "> 500"]}
              onChange={setSelectedMoq}
              icon={<MoqIcon />}
            />

            <span className="mx-3 hidden h-8 w-px bg-[#d9e1ed] md:block" />

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#ff5b4d] transition hover:text-[#d64538]"
            >
              <span className="text-[16px] leading-none">&times;</span>
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] leading-none text-[#99a4b5]">
            Showing {mappedSuppliers.length} supplier
            {mappedSuppliers.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-[#4b5563]">near you</span>
          </p>

          <label className="inline-flex h-[40px] items-center gap-2 self-start rounded-[10px] border border-[#cfd8e6] bg-white px-3.5 text-[13px] text-[#516074] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="appearance-none bg-transparent pr-1 leading-none outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="name">Supplier name</option>
              <option value="certified">Most certified</option>
              <option value="most_products">Most products</option>
            </select>
            <ChevronDownIcon />
          </label>
        </div>

        <div className="bg-white px-5 pb-5">
          {mappedSuppliers.length === 0 ? (
            <section className="rounded-[18px] border border-[#e6ebf2] bg-white px-5 py-8 text-center text-[13px] text-[#8b95a5] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              No suppliers matched your current search and filters.
            </section>
          ) : (
            <>
              <section className="grid gap-3.5 md:grid-cols-2">
                {mappedSuppliers.map((supplier) => (
                  <BuyerSupplierCard key={supplier.supplierId} supplier={supplier} />
                ))}
              </section>

              <section className="flex items-center justify-center gap-4 pt-4 text-[12px] text-[#9aa5b6]">
                <button
                  type="button"
                  className="transition hover:text-[#223654]"
                >
                  &larr; Previous
                </button>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#223f68] px-2 text-[11px] font-medium text-white">
                  1
                </span>
                <button
                  type="button"
                  className="transition hover:text-[#223654]"
                >
                  2
                </button>
                <button
                  type="button"
                  className="transition hover:text-[#223654]"
                >
                  3
                </button>
                <span>...</span>
                <button
                  type="button"
                  className="transition hover:text-[#223654]"
                >
                  Next &rarr;
                </button>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
