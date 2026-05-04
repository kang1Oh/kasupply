"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BuyerSupplierCard,
  type BuyerHomepageSupplier,
} from "./buyer-supplier-card";

type ProductCategory = {
  category_id: number;
  category_name: string;
};

type BuyerMarketplaceHomeProps = {
  heroCategories?: ProductCategory[];
  suppliers?: BuyerHomepageSupplier[];
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden="true">
      <path
        d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="m12 3 2.55 5.17 5.7.83-4.13 4.03.98 5.67L12 16.02 6.9 18.7l.98-5.67L3.75 9l5.7-.83L12 3Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BuyerPremiumPromo() {
  return (
<section className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] px-7 py-6 text-white shadow-[0_14px_30px_rgba(255,122,0,0.18)]">      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-50 shadow-sm">
            <StarIcon />
            Buyer Premium
          </div>

          <h2 className="text-[22px] font-bold leading-tight tracking-tight text-white">
            Unlock faster supplier sourcing.
          </h2>

          <p className="mt-1 text-[17px] leading-6 text-white/80">
            Better matches • More RFQ access • Faster quotes
          </p>
        </div>

        <Link
          href="/buyer/premium-page"
          className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-white/15"
        >
          Explore Premium
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-normal transition ${
        active
          ? "bg-[#294773] text-white"
          : "border border-[#e2e8f0] bg-white text-[#6b7280] hover:border-[#c9d4e5] hover:text-[#223654]"
      }`}
    >
      {label}
    </button>
  );
}

export function BuyerMarketplaceHome({
  heroCategories = [],
  suppliers = [],
}: BuyerMarketplaceHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [heroSearch, setHeroSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [recommendedPage, setRecommendedPage] = useState(0);

  const appliedSearch = heroSearch || searchQuery;

  const browseCategories = useMemo(() => {
    const tagSet = new Set<string>();

    for (const supplier of suppliers) {
      for (const tag of supplier.categoryTags) {
        tagSet.add(tag);
      }
    }

    const supplierTags = Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b)
    );

    if (supplierTags.length > 0) {
      return supplierTags;
    }

    return heroCategories.map((category) => category.category_name);
  }, [heroCategories, suppliers]);

  const filterOptions = useMemo(
    () => ["All", ...browseCategories],
    [browseCategories]
  );

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = appliedSearch.trim().toLowerCase();

    const results = suppliers.filter((supplier) => {
      const matchesSearch =
        !normalizedSearch ||
        supplier.name.toLowerCase().includes(normalizedSearch) ||
        supplier.supplierType.toLowerCase().includes(normalizedSearch) ||
        supplier.shortDescription.toLowerCase().includes(normalizedSearch) ||
        supplier.categoryTags.some((tag) =>
          tag.toLowerCase().includes(normalizedSearch)
        );

      const matchesCategory =
        selectedFilter === "All" ||
        supplier.categoryTags.includes(selectedFilter);

      return matchesSearch && matchesCategory;
    });

    const sorted = [...results];

    if (sortBy === "type") {
      sorted.sort((a, b) => a.supplierType.localeCompare(b.supplierType));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [appliedSearch, selectedFilter, sortBy, suppliers]);

  const recommendedSuppliers = useMemo(
    () =>
      [...suppliers]
        .sort((a, b) => {
          const scoreDifference =
            (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);

          if (scoreDifference !== 0) {
            return scoreDifference;
          }

          return a.name.localeCompare(b.name);
        })
        .slice(0, 4),
    [suppliers]
  );

  const recommendedPages = useMemo(() => {
    const pages: BuyerHomepageSupplier[][] = [];
    const maxStartIndex = Math.max(0, recommendedSuppliers.length - 3);

    for (let index = 0; index <= maxStartIndex; index += 1) {
      pages.push(recommendedSuppliers.slice(index, index + 3));
    }

    return pages;
  }, [recommendedSuppliers]);

  const visibleRecommendedSuppliers =
    recommendedPages[recommendedPage] ?? recommendedSuppliers.slice(0, 3);

  function handleHeroSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(heroSearch);
    setVisibleCount(6);
  }

  function handleCategoryFilter(category: string) {
    setSelectedFilter(category);
    setVisibleCount(6);
  }

  function handleNextRecommended() {
    setRecommendedPage((current) =>
      Math.min(current + 1, recommendedPages.length - 1)
    );
  }

  function handlePrevRecommended() {
    setRecommendedPage((current) => Math.max(current - 1, 0));
  }

  return (
    <div className="space-y-7">
      <section
        className="relative overflow-hidden rounded-[22px] px-8 pb-9 pt-7 text-white shadow-[0_16px_34px_rgba(15,23,42,0.11)] lg:px-10"
        style={{
          background:
            "linear-gradient(135deg, #061b3a 0%, #082652 48%, #0b3471 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-28 -top-40 h-[340px] w-[520px] rounded-bl-full"
          style={{
            background:
              "linear-gradient(215deg, rgba(92,123,180,0.34) 0%, rgba(92,123,180,0.22) 42%, rgba(92,123,180,0.09) 68%, rgba(92,123,180,0) 100%)",
          }}
        />

        <div className="relative z-10 max-w-4xl">
          <p className="text-[16px] font-medium text-[#f39a44]">
            Discover Local Suppliers · Davao Region
          </p>

          <h1 className="mt-1 text-[32px] font-semibold leading-[1.20] tracking-[-0.03em] text-white">
            Find Verified Local{" "}
            <span className="text-[#f39a44]">Suppliers</span>
            <br />
            For Your Business.
          </h1>

          <form
            onSubmit={handleHeroSearchSubmit}
            className="mt-5 flex max-w-[840px] items-center gap-3 rounded-[16px] bg-white px-4 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
          >
            <div className="flex flex-1 items-center gap-3 text-[#a8b3c4]">
              <SearchIcon />
              <input
                value={heroSearch}
                onChange={(event) => setHeroSearch(event.target.value)}
                placeholder="Search supplier name, product or categories..."
                className="w-full bg-transparent text-[16px] text-[#64748b] outline-none placeholder:text-[#b4bcc9]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#294773] px-6 text-[15px] font-medium text-white transition hover:bg-[#1f3658]"
            >
              Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {heroCategories.map((category) => (
              <button
                key={category.category_id}
                type="button"
                onClick={() => {
                  setHeroSearch(category.category_name);
                  setSearchQuery(category.category_name);
                  setSelectedFilter("All");
                }}
                className="rounded-full border border-[#d3dbe7] bg-transparent px-3 py-1.5 text-[14px] font-normal text-white transition hover:bg-white/10"
              >
                {category.category_name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <BuyerPremiumPromo />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[25px] font-semibold leading-tight text-[#223654]">
              Recommended for You
            </h2>
            <p className="mt-0.5 text-[18px] leading-tight text-[#7a8699]">
              Suppliers matched to your sourcing categories and location
            </p>
          </div>

          <Link
            href="/buyer/search"
            className="text-[16px] font-medium text-[#4d6ea3] transition hover:text-[#223654] hover:underline"
          >
            See All
          </Link>
        </div>

        <div className="group relative py-1">
          <div className="overflow-hidden">
            <div className="flex gap-4 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleRecommendedSuppliers.map((supplier) => (
                <div
                  key={`recommended-${supplier.supplierId}`}
                  className="shrink-0"
                  style={{ flexBasis: "calc((100% - 2rem) / 2.3)" }}
                >
                  <BuyerSupplierCard supplier={supplier} />
                </div>
              ))}
            </div>
          </div>

          {recommendedPage > 0 ? (
            <button
              type="button"
              onClick={handlePrevRecommended}
              aria-label="Previous recommended suppliers"
              className="pointer-events-none absolute left-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] opacity-0 shadow-[0_6px_14px_rgba(15,23,42,0.10)] transition hover:bg-[#f8fafc] group-hover:pointer-events-auto group-hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="m15 6-6 6 6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}

          {recommendedPage < recommendedPages.length - 1 ? (
            <button
              type="button"
              onClick={handleNextRecommended}
              aria-label="Next recommended suppliers"
              className="pointer-events-none absolute right-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] opacity-0 shadow-[0_6px_14px_rgba(15,23,42,0.10)] transition hover:bg-[#f8fafc] group-hover:pointer-events-auto group-hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="m9 6 6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>

        {recommendedPages.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            {recommendedPages.map((_, index) => {
              const isActive = index === recommendedPage;

              return (
                <button
                  key={`recommended-page-${index}`}
                  type="button"
                  onClick={() => setRecommendedPage(index)}
                  aria-label={`Show recommended suppliers page ${index + 1}`}
                  className={`rounded-full transition ${
                    isActive
                      ? "h-2 w-8 bg-[#294773]"
                      : "h-2 w-3 bg-[#d8e2ef] hover:bg-[#c4d3e6]"
                  }`}
                />
              );
            })}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-[25px] font-semibold leading-tight text-[#223654]">
            Browse suppliers
          </h2>
          <p className="mt-0.5 text-[18px] leading-tight text-[#7a8699]">
            Explore all verified suppliers in the Davao Region
          </p>
        </div>

        <div className="relative z-40 mb-8 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <FilterChip
                key={filter}
                label={filter}
                active={selectedFilter === filter}
                onClick={() => handleCategoryFilter(filter)}
              />
            ))}
          </div>

          <div className="relative inline-flex shrink-0 items-center gap-2 self-end whitespace-nowrap text-[14px] font-medium text-[#7a8699] lg:self-start">
            <span>Sort by</span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((current) => !current)}
                className="flex h-10 min-w-[145px] items-center justify-between gap-3 rounded-xl border border-[#dbe3ef] bg-white px-3.5 text-[14px] font-medium text-[#223654] transition hover:border-[#c7d3e3]"
              >
                {sortBy === "name" ? "Supplier name" : "Business type"}

                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-[#7a8699] transition ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {sortOpen ? (
                <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)]">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("name");
                      setSortOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2.5 text-left text-[14px] transition ${
                      sortBy === "name"
                        ? "bg-[#eef4fb] text-[#223654]"
                        : "text-[#475569] hover:bg-[#f8fafc]"
                    }`}
                  >
                    Supplier name
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("type");
                      setSortOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2.5 text-left text-[14px] transition ${
                      sortBy === "type"
                        ? "bg-[#eef4fb] text-[#223654]"
                        : "text-[#475569] hover:bg-[#f8fafc]"
                    }`}
                  >
                    Business type
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredSuppliers.slice(0, visibleCount).map((supplier) => (
            <BuyerSupplierCard key={supplier.supplierId} supplier={supplier} />
          ))}
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#d9e2ee] bg-white px-5 py-8 text-center text-[14px] text-[#8a94a6]">
            No suppliers match your current search and category filter.
          </div>
        ) : null}

        {visibleCount < filteredSuppliers.length ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 4)}
              className="w-full rounded-xl border border-dashed border-[#cfd8e6] bg-white px-4 py-3 text-[14px] font-medium text-[#9aa5b5] transition hover:border-[#bfcbdc] hover:text-[#223654]"
            >
              Load more supplier
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}