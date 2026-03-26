"use client";

import { useMemo, useState } from "react";
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
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
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

    const supplierTags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));

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
        .slice(0, 3),
    [suppliers]
  );

  const recommendedPages = useMemo(() => {
    const pages: BuyerHomepageSupplier[][] = [];

    for (let index = 0; index < recommendedSuppliers.length; index += 2) {
      pages.push(recommendedSuppliers.slice(index, index + 2));
    }

    return pages;
  }, [recommendedSuppliers]);

  const visibleRecommendedSuppliers =
    recommendedPages[recommendedPage] ?? recommendedSuppliers.slice(0, 2);

  function handleHeroSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(heroSearch);
    setVisibleCount(6);
  }

  function handleCategoryFilter(category: string) {
    setSelectedFilter(category);
    setVisibleCount(6);
  }

  return (
    <div className="space-y-9">
      <section className="relative overflow-hidden rounded-[22px] bg-[#0d2a50] px-8 pt-5 pb-7 text-white shadow-[0_16px_34px_rgba(15,23,42,0.11)] lg:px-10">
        <div className="absolute -left-8 top-[110px] h-[140px] w-[140px] rounded-full bg-[#8e5630]" />
        <div className="absolute bottom-[-48px] left-[320px] h-[150px] w-[150px] rounded-full bg-[#8e5630]" />
        <div className="absolute -right-2 -top-7 h-[160px] w-[160px] rounded-full bg-[#8e5630]" />

        <div className="relative max-w-4xl">
          <p className="text-[16px] font-semibold text-[#f39a44]">
            Discover Local Suppliers · Davao Region
          </p>
          <h1 className="mt-2.5 text-[34px] font-semibold leading-[1.25] tracking-[-0.03em] text-white">
            Find Verified Local <span className="text-[#f39a44]">Suppliers</span>
            <br />
            For Your Business.
          </h1>

          <form
            onSubmit={handleHeroSearchSubmit}
            className="mt-6 flex max-w-[840px] items-center gap-3 rounded-[16px] bg-white px-4 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
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
              className="inline-flex h-11 items-center justify-center rounded-[11px] bg-[#294773] px-8 text-[15px] font-semibold text-white transition hover:bg-[#1f3658]"
            >
              Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {heroCategories.map((category) => (
              <button
                key={category.category_id}
                type="button"
                onClick={() => {
                  setHeroSearch(category.category_name);
                  setSearchQuery(category.category_name);
                  setSelectedFilter("All");
                }}
                className="rounded-full border border-[#d3dbe7] bg-transparent px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/10"
              >
                {category.category_name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#223654]">
              Recommended for You
            </h2>
            <p className="mt-1 text-[16px] text-[#7a8699]">
              Suppliers matched to your sourcing categories and location
            </p>
          </div>
          <Link
            href="/buyer/search"
            className="text-[13px] font-medium text-[#4d6ea3] transition hover:text-[#223654]"
          >
            See All
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleRecommendedSuppliers.map((supplier) => (
            <BuyerSupplierCard
              key={`recommended-${supplier.id}`}
              supplier={supplier}
            />
          ))}
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
          <h2 className="text-[28px] font-semibold text-[#223654]">
            Browse suppliers
          </h2>
          <p className="mt-1 text-[15px] text-[#7a8699]">
            Explore verified suppliers in the Davao Region
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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

          <label className="inline-flex shrink-0 items-center gap-2.5 self-end whitespace-nowrap rounded-lg bg-white text-[13px] text-[#7a8699] lg:self-start">
            <span className="leading-none">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="min-w-[160px] rounded-lg border border-[#dbe3ef] bg-white px-3 py-2.5 text-[13px] leading-none text-[#475569] outline-none"
            >
              <option value="name">Supplier name</option>
              <option value="type">Business type</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredSuppliers.slice(0, visibleCount).map((supplier) => (
            <BuyerSupplierCard key={supplier.id} supplier={supplier} />
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
