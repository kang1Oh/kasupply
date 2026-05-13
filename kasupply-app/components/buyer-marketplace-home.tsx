"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuyerSupplierCard,
  type BuyerHomepageSupplier,
} from "./buyer-supplier-card";

type ProductCategory = {
  category_id: number;
  category_name: string;
};

export type BuyerHomepageBrowseCategory = {
  categoryId: number;
  categoryName: string;
  productCount: number;
  isBuyerInterest: boolean;
  sampleProducts: Array<{
    productId: number;
    supplierId: number;
    productName: string;
    imageUrl: string | null;
    pricePerUnit: number | null;
    unit: string | null;
  }>;
};

export type BuyerHomepageOrderAgainItem = {
  poId: number;
  productName: string;
  supplierName: string;
  quantityLabel: string;
  completedAt: string | null;
  totalAmount: number | null;
  specifications: string | null;
  orderHref: string;
  reorderHref: string;
  supplierHref: string | null;
};

type BuyerMarketplaceHomeProps = {
  heroCategories?: ProductCategory[];
  recommendedSuppliers?: BuyerHomepageSupplier[];
  browseCategories?: BuyerHomepageBrowseCategory[];
  orderAgainItems?: BuyerHomepageOrderAgainItem[];
  showSupplierSignupPromo?: boolean;
};

function formatCurrency(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "Price on request";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Recently completed";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently completed";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

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
            More matches • More RFQs and Purchase Orders
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

export function BuyerMarketplaceHome({
  heroCategories = [],
  recommendedSuppliers = [],
  browseCategories = [],
  orderAgainItems = [],
  showSupplierSignupPromo = false,
}: BuyerMarketplaceHomeProps) {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);

  const recommendedPages = useMemo(() => {
    const pages: BuyerHomepageSupplier[][] = [];

    for (let index = 0; index < recommendedSuppliers.length; index += 2) {
      pages.push(recommendedSuppliers.slice(index, index + 2));
    }

    return pages.length > 0 ? pages : [recommendedSuppliers.slice(0, 2)];
  }, [recommendedSuppliers]);

  const categoryPages = useMemo(() => {
    const pages: BuyerHomepageBrowseCategory[][] = [];

    for (let index = 0; index < browseCategories.length; index += 3) {
      pages.push(browseCategories.slice(index, index + 3));
    }

    return pages;
  }, [browseCategories]);

  function openSupplierSearch(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push("/buyer/search");
      return;
    }

    router.push(`/buyer/search?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function handleHeroSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openSupplierSearch(heroSearch);
  }

  function handleNextRecommended() {
    setRecommendedPage((current) =>
      Math.min(current + 1, recommendedPages.length - 1),
    );
  }

  function handlePrevRecommended() {
    setRecommendedPage((current) => Math.max(current - 1, 0));
  }

  function handleNextCategoryPage() {
    setCategoryPage((current) =>
      Math.min(current + 1, categoryPages.length - 1),
    );
  }

  function handlePrevCategoryPage() {
    setCategoryPage((current) => Math.max(current - 1, 0));
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
            Discover Local Suppliers - Davao Region
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
                onClick={() => openSupplierSearch(category.category_name)}
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
              Suppliers trusted by most buyers. See if they have what you are looking for.
            </p>
          </div>

          <Link
            href="/buyer/search"
            className="text-[16px] font-medium text-[#4d6ea3] transition hover:text-[#223654] hover:underline"
          >
            See All
          </Link>
        </div>

        {recommendedSuppliers.length > 0 ? (
          <div className="space-y-4">
            <div className="group relative overflow-x-hidden overflow-y-visible px-2 py-2">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  width: `${recommendedPages.length * 100}%`,
                  transform: `translateX(-${recommendedPage * (100 / Math.max(recommendedPages.length, 1))}%)`,
                }}
              >
                {recommendedPages.map((page, pageIndex) => (
                  <div
                    key={`recommended-page-${pageIndex}`}
                    className="w-full shrink-0 px-1"
                    style={{ width: `${100 / Math.max(recommendedPages.length, 1)}%` }}
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      {page.map((supplier) => (
                        <BuyerSupplierCard
                          key={`recommended-${supplier.supplierId}`}
                          supplier={supplier}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {recommendedPage > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevRecommended}
                  aria-label="Previous recommended suppliers"
                  className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] shadow-[0_8px_16px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafc]"
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
                  className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] shadow-[0_8px_16px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafc]"
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
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#d9e2ee] bg-white px-6 py-8 text-center">
            <p className="text-[18px] font-semibold text-[#223654]">
              No strong supplier matches yet
            </p>
            <p className="mt-2 text-[14px] text-[#8a94a6]">
              Add more detail to your buying categories or business description to
              improve homepage recommendations.
            </p>
          </div>
        )}

        {recommendedSuppliers.length > 0 && recommendedPages.length > 1 ? (
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
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[25px] font-semibold leading-tight text-[#223654]">
              Browse Categories
            </h2>
            <p className="mt-0.5 text-[18px] leading-tight text-[#7a8699]">
              Explore categories that match your business needs. 
            </p>
          </div>

          <Link
            href="/buyer/search"
            className="text-[16px] font-medium text-[#4d6ea3] transition hover:text-[#223654] hover:underline"
          >
            See All
          </Link>
        </div>

        {browseCategories.length > 0 ? (
          <div className="space-y-4">
            <div className="group relative overflow-x-hidden overflow-y-visible px-2 py-2">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  width: `${categoryPages.length * 100}%`,
                  transform: `translateX(-${categoryPage * (100 / Math.max(categoryPages.length, 1))}%)`,
                }}
              >
                {categoryPages.map((page, pageIndex) => (
                  <div
                    key={`category-page-${pageIndex}`}
                    className="w-full shrink-0 px-1"
                    style={{ width: `${100 / Math.max(categoryPages.length, 1)}%` }}
                  >
                    <div className="grid gap-4 xl:grid-cols-3">
                      {page.map((category) => (
                        <Link
                          key={category.categoryId}
                          href={`/buyer/search?q=${encodeURIComponent(category.categoryName)}`}
                          className="group/card flex min-h-[232px] flex-col rounded-[22px] border border-[#e2e8f0] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#294773] hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[18px] font-semibold leading-tight text-[#223654]">
                                {category.categoryName}
                              </p>
                              <p className="mt-1 text-[13px] text-[#8b97aa]">
                                {category.productCount} published products
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                                category.isBuyerInterest
                                  ? "bg-[#edf5ff] text-[#2f5f97]"
                                  : "bg-[#f6f8fb] text-[#7a8699]"
                              }`}
                            >
                              {category.isBuyerInterest ? "Your category" : "Explore"}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2.5">
                            {category.sampleProducts.map((product) => (
                              <div
                                key={`${category.categoryId}-${product.productId}`}
                                className="flex items-center gap-3 rounded-[14px] border border-[#edf2f7] bg-[#fbfcfe] px-3.5 py-3"
                              >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#eaf0f7]">
                                  {product.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={product.imageUrl}
                                      alt={product.productName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b97aa]">
                                      No image
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="line-clamp-1 text-[14px] font-medium text-[#223654]">
                                    {product.productName}
                                  </p>
                                  <p className="mt-1 text-[12px] text-[#8a94a6]">
                                    {formatCurrency(product.pricePerUnit)}
                                    {product.unit ? ` / ${product.unit}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-auto pt-4 text-[13px] font-medium text-[#294773] transition group-hover/card:text-[#1f3658]">
                            Browse suppliers in this category
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {categoryPage > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevCategoryPage}
                  aria-label="Previous category cards"
                  className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] shadow-[0_8px_16px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafc]"
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

              {categoryPage < categoryPages.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextCategoryPage}
                  aria-label="Next category cards"
                  className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eef2f7] bg-white text-[#294773] shadow-[0_8px_16px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafc]"
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

            {categoryPages.length > 1 ? (
              <div className="flex items-center justify-center gap-2">
                {categoryPages.map((_, index) => {
                  const isActive = index === categoryPage;

                  return (
                    <button
                      key={`category-dot-${index}`}
                      type="button"
                      onClick={() => setCategoryPage(index)}
                      aria-label={`Show category page ${index + 1}`}
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
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#d9e2ee] bg-white px-6 py-8 text-center text-[14px] text-[#8a94a6]">
            No category showcases are available yet.
          </div>
        )}
      </section>

      {orderAgainItems.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[25px] font-semibold leading-tight text-[#223654]">
                Order Again
              </h2>
              <p className="mt-0.5 text-[18px] leading-tight text-[#7a8699]">
                Easily reorder from suppliers you trust.
              </p>
            </div>

            <Link
              href="/buyer/purchase-orders"
              className="text-[16px] font-medium text-[#4d6ea3] transition hover:text-[#223654] hover:underline"
            >
              View All Orders
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {orderAgainItems.map((order) => (
              <article
                key={order.poId}
                className="flex h-full flex-col rounded-[22px] border border-[#e2e8f0] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7a8699]">
                      Completed order
                    </p>
                    <h3 className="mt-2 text-[20px] font-semibold leading-tight text-[#223654]">
                      {order.productName}
                    </h3>
                  </div>

                  <span className="rounded-full bg-[#eef8f2] px-3 py-1 text-[12px] font-semibold text-[#2f7c4b]">
                    Completed
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[14px] text-[#6b778b]">
                  <p>
                    Supplier:{" "}
                    {order.supplierHref ? (
                      <Link
                        href={order.supplierHref}
                        className="font-medium text-[#294773] hover:underline"
                      >
                        {order.supplierName}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#294773]">
                        {order.supplierName}
                      </span>
                    )}
                  </p>
                  <p>Quantity: {order.quantityLabel}</p>
                  <p>Delivered: {formatDate(order.completedAt)}</p>
                  <p>Total paid: {formatCurrency(order.totalAmount)}</p>
                </div>

                <p className="mt-4 line-clamp-3 min-h-[60px] text-[14px] leading-[1.6] text-[#56657a]">
                  {order.specifications?.trim() ||
                    "Use this as a quick jump-off point to request the same item from the same supplier again."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href={order.reorderHref}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-[10px] bg-[#223f68] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#1d3454]"
                  >
                    Order Again
                  </Link>
                  <Link
                    href={order.orderHref}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-[10px] border border-[#d9e2ee] px-4 py-2 text-[13px] font-medium text-[#66758a] transition hover:bg-[#f8fafc] hover:text-[#223654]"
                  >
                    View Order
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : showSupplierSignupPromo ? (
        <section className="overflow-hidden rounded-[26px] bg-[#234a78] shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
          <div className="grid gap-8 px-7 py-7 lg:grid-cols-[1fr_360px] lg:items-center lg:px-9">
            <div className="text-white">
              <p className="text-[14px] font-semibold uppercase text-[#bfd5f4]">
                Or Sign Up As A Supplier
              </p>
              <h2 className="mt-3 max-w-[540px] text-[31px] font-semibold leading-[1.18] tracking-[-0.03em]">
                Connect with Verified Buyers in Davao and Grow Your Business.
              </h2>
              <p className="mt-3 max-w-[520px] text-[16px] text-[#d8e5f7]">
                Create a supplier account to showcase your goods, earn trust through a quick and easy verification process, and start receiving RFQs from businesses across Davao.
              </p>

              <div className="mt-6">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-[12px] bg-white px-6 py-3 text-[15px] font-semibold text-[#234a78] transition hover:bg-[#eef4fb]"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-white/10">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,27,52,0.02)_0%,rgba(12,27,52,0.14)_100%)]" />
              <Image
                src="/images/supplier-signup-market.jpg"
                alt="Fresh produce stall with coconuts and market goods"
                width={1200}
                height={800}
                className="h-[260px] w-full object-cover"
              />
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
