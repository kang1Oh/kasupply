"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupplierProfileDetails } from "@/app/buyer/search/[supplierId]/actions";

type SupplierProfileContentProps = {
  supplier: SupplierProfileDetails;
  categoryTags: string[];
};

type TabKey = "overview" | "products" | "reviews";
type SortKey = "match" | "name" | "price_low" | "price_high";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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

function formatMoney(value: number) {
  return `P${value.toLocaleString()}`;
}

function getStockLabel(stockAvailable: number | null, moq: number) {
  if (stockAvailable == null) return "In stock";
  if (stockAvailable <= moq) return "Low stock";
  return "In stock";
}

function ProductFallbackImage({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#eef6ee,#d5e7d8)] text-[28px] font-semibold text-[#5f7a60]">
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

function ProductCard({
  supplierId,
  product,
  onOpen,
}: {
  supplierId: number;
  product: SupplierProfileDetails["products"][number];
  onOpen: () => void;
}) {
  const stockLabel = getStockLabel(product.stockAvailable, product.moq);
  const stockColor =
    stockLabel === "Low stock"
      ? "text-[#ef4444]"
      : "text-[#3f8a57]";

  return (
    <article className="overflow-hidden rounded-[18px] border border-[#dfe7f1] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
      >
        <div className="relative aspect-[1.18/1] bg-[#eef4ea]">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <ProductFallbackImage label={product.productName} />
          )}

          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#f28b2d] shadow-sm">
            {product.categoryName}
          </span>
        </div>
      </button>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-[#223654]">
              {product.productName}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#94a3b8]">
              {product.description?.trim() || "Freshly harvested supplier product."}
            </p>
          </div>
          <p className="shrink-0 text-[13px] font-semibold text-[#223654]">
            {formatMoney(product.pricePerUnit)}
            <span className="text-[11px] font-medium text-[#94a3b8]">/{product.unit}</span>
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] px-3 py-2">
            <p className="text-[10px] text-[#94a3b8]">MOQ</p>
            <p className="mt-1 text-[11px] font-medium text-[#223654]">
              {product.moq} {product.unit}
            </p>
          </div>
          <div className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] px-3 py-2">
            <p className="text-[10px] text-[#94a3b8]">Lead time</p>
            <p className="mt-1 text-[11px] font-medium text-[#223654]">
              {product.leadTime ?? "1-2 days"}
            </p>
          </div>
          <div className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] px-3 py-2">
            <p className="text-[10px] text-[#94a3b8]">Capacity</p>
            <p className="mt-1 text-[11px] font-medium text-[#223654]">
              {product.maxCapacity != null
                ? `${product.maxCapacity.toLocaleString()} kg/week`
                : "500 kg/week"}
            </p>
          </div>
          <div className="rounded-xl border border-[#edf2f7] bg-[#fbfcfe] px-3 py-2">
            <p className="text-[10px] text-[#94a3b8]">Availability</p>
            <p className={`mt-1 text-[11px] font-medium ${stockColor}`}>{stockLabel}</p>
          </div>
        </div>

        <Link
          href={`/buyer/rfqs/new?supplierId=${supplierId}&productId=${product.productId}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#2f6df6] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#2458cb]"
        >
          Send RFQ
        </Link>
      </div>
    </article>
  );
}

function ProductDetailsModal({
  supplierId,
  product,
  onClose,
}: {
  supplierId: number;
  product: SupplierProfileDetails["products"][number];
  onClose: () => void;
}) {
  const stockLabel = getStockLabel(product.stockAvailable, product.moq);
  const stockColor =
    stockLabel === "Low stock" ? "text-[#ef4444]" : "text-[#2f7f4d]";
  const thumbnails = useMemo(
    () =>
      product.galleryImages.length > 0
        ? product.galleryImages
        : product.imageUrl
          ? [product.imageUrl]
          : [],
    [product.galleryImages, product.imageUrl]
  );
  const [activeImage, setActiveImage] = useState<string | null>(
    thumbnails[0] ?? product.imageUrl ?? null
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setActiveImage(thumbnails[0] ?? product.imageUrl ?? null);
  }, [product, product.imageUrl, thumbnails]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[760px] rounded-[24px] bg-white p-7 shadow-[0_22px_50px_rgba(15,23,42,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div>
            <div className="overflow-hidden rounded-[18px] bg-[#eef1f5]">
              <div className="aspect-square">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={product.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProductFallbackImage label={product.productName} />
                )}
              </div>
            </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {thumbnails.map((thumbnail, index) => (
                  <button
                    key={`${product.productId}-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveImage(thumbnail)}
                    className={`overflow-hidden rounded-[14px] bg-[#eef1f5] ${
                      activeImage === thumbnail
                        ? "ring-2 ring-[#2f6df6] ring-offset-2 ring-offset-white"
                        : ""
                    }`}
                  >
                    <div className="aspect-square">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={`${product.productName} thumbnail ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ProductFallbackImage label={product.productName} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[21px] font-semibold leading-tight text-[#223654]">
                    {product.productName}
                  </h2>
                  <span className="rounded-full border border-[#ff9f57] bg-[#fff6ee] px-2.5 py-0.5 text-[11px] font-medium text-[#ff8a2a]">
                    {product.categoryName}
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] text-[#9aa5b5]">
                  Available Stock: {product.stockAvailable?.toLocaleString() ?? "Not listed"}
                </p>
                <p className="mt-2.5 text-[23px] font-semibold text-[#223654]">
                  {formatMoney(product.pricePerUnit)}
                  <span className="ml-1 text-[17px] font-medium text-[#9aa5b5]">
                    /{product.unit}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#223654] transition hover:bg-[#f3f6fb]"
                aria-label="Close product details"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#b2bac7]">
                Product Description
              </p>
              <p className="mt-2 text-[14px] leading-7 text-[#5f6d80]">
                {product.description?.trim() ||
                  "Freshly harvested supplier product available for repeat business orders."}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#b2bac7]">
                More Product Details
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    label: "Minimum Order Quantity",
                    value: `${product.moq} ${product.unit}`,
                    color: "text-[#223654]",
                  },
                  {
                    label: "Lead Time",
                    value: product.leadTime ?? "1-2 days",
                    color: "text-[#223654]",
                  },
                  {
                    label: "Capacity",
                    value:
                      product.maxCapacity != null
                        ? `${product.maxCapacity.toLocaleString()} kg/wk`
                        : "500 kg/wk",
                    color: "text-[#223654]",
                  },
                  {
                    label: "Availability",
                    value: stockLabel,
                    color: stockColor,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[12px] border border-[#e7edf5] bg-[#fbfcfe] px-3.5 py-3.5"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.03em] text-[#b2bac7]">
                      {item.label}
                    </p>
                    <p className={`mt-1.5 text-[13px] font-semibold ${item.color}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={`/buyer/rfqs/new?supplierId=${supplierId}&productId=${product.productId}`}
              className="mt-4 inline-flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#2f6df6] px-4 text-[16px] font-semibold text-white transition hover:bg-[#2458cb]"
            >
              Send RFQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuyerSupplierProfileContent({
  supplier,
  categoryTags,
}: SupplierProfileContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("match");
  const [selectedProduct, setSelectedProduct] = useState<
    SupplierProfileDetails["products"][number] | null
  >(null);
  const productCount = supplier.products.length;
  const reviewCount = 0;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextProducts = supplier.products.filter((product) => {
      if (!normalizedSearch) return true;

      return (
        product.productName.toLowerCase().includes(normalizedSearch) ||
        product.categoryName.toLowerCase().includes(normalizedSearch) ||
        (product.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });

    nextProducts.sort((left, right) => {
      switch (sort) {
        case "name":
          return left.productName.localeCompare(right.productName);
        case "price_low":
          return left.pricePerUnit - right.pricePerUnit;
        case "price_high":
          return right.pricePerUnit - left.pricePerUnit;
        case "match":
        default:
          return right.moq - left.moq;
      }
    });

    return nextProducts;
  }, [search, sort, supplier.products]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#e3eaf2] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center gap-6 px-7 pt-4">
          {[
            { key: "overview", label: "Overview" },
            { key: "products", label: "Products", count: productCount },
            { key: "reviews", label: "Reviews", count: reviewCount },
          ].map(({ key, label, count }) => {
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as TabKey)}
                className={`relative inline-flex items-center gap-2 pb-4 text-[13px] font-medium transition ${
                  isActive
                    ? "text-[#2563eb]"
                    : "text-[#d1d5db] hover:text-[#94a3b8]"
                }`}
              >
                {label}
                {typeof count === "number" ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#eef2f7] px-1.5 text-[11px] font-semibold text-[#6b7280]">
                    {count}
                  </span>
                ) : null}
                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[#2563eb]" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="h-px w-full bg-[#edf2f7]" />
      </section>

      {activeTab === "overview" ? (
        <>
          <section className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
            <h2 className="text-[15px] font-semibold text-[#334155]">
              Categories Supplied
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {categoryTags.length > 0 ? (
                categoryTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#33598a] bg-white px-[1.2rem] pb-[0.4rem] pt-[0.3rem] text-[14px] font-medium text-[#33598a]"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-[13px] text-[#94a3b8]">
                  No product categories listed yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
            <h2 className="text-[15px] font-semibold text-[#223654]">
              Business Description
            </h2>
            <p className="mt-4 text-[13px] leading-7 text-[#5f6d80]">
              {supplier.about?.trim() || "No business description provided yet."}
            </p>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
              <h2 className="text-[15px] font-semibold text-[#223654]">
                Contact & Sourcing Info
              </h2>

              <dl className="mt-4 divide-y divide-[#edf2f7]">
                {[
                  ["Phone", supplier.contactNumber ?? "Not provided"],
                  ["Address", supplier.businessLocation],
                  ["City", supplier.city],
                  ["Province", supplier.province],
                  ["Region", supplier.region],
                  ["Lead Time", supplier.products[0]?.leadTime ?? "2-3 business days"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[150px_1fr] gap-4 py-3 text-[13px]"
                  >
                    <dt className="text-[#94a3b8]">{label}</dt>
                    <dd className="text-[#516074]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-[#223654]">
                  Certifications
                </h2>
                {supplier.certifications.length > 0 ? (
                  <span className="text-[12px] text-[#94a3b8]">
                    {supplier.certifications.length} verified
                  </span>
                ) : null}
              </div>

              {supplier.certifications.length === 0 ? (
                <p className="mt-4 text-[13px] text-[#94a3b8]">
                  No certifications uploaded yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {supplier.certifications.map((cert) => (
                    <div
                      key={cert.certificationId}
                      className="flex items-center gap-4 rounded-[18px] border border-[#edf2f7] bg-[#fbfcfe] px-4 py-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dff1e7] text-[#2f7f4d]">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                          <path
                            d="M8 3.75h6l4 4v12.5a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 3.75v4h4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-[14px] font-semibold text-[#223654]">
                            {cert.certificationTypeName}
                          </p>
                          <span className="rounded-full border border-[#84c19b] bg-[#f3fbf5] px-2 py-0.5 text-[10px] font-medium text-[#2f7f4d]">
                            Verified
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-[#94a3b8]">
                          {cert.expiresAt
                            ? `Expires ${new Date(cert.expiresAt).toLocaleString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}`
                            : cert.fileName}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {cert.documentUrl ? (
                          <a
                            href={cert.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full px-2 py-1 text-[13px] font-medium text-[#376ae6] underline-offset-2 transition hover:text-[#223654] hover:underline"
                          >
                            View File
                          </a>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-[12px] text-[#94a3b8]">
                            File unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "products" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#e3eaf2] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a5b0c2]">
                  <SearchIcon />
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Products..."
                  className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white pl-11 pr-4 text-[13px] text-[#223654] outline-none transition placeholder:text-[#b0b9c8] focus:border-[#9eb4d5]"
                />
              </div>

              <div className="flex items-center gap-3 lg:w-[220px] lg:justify-end">
                <span className="text-[12px] text-[#8a94a6]">Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-11 min-w-[150px] rounded-xl border border-[#dbe3ef] bg-white px-4 text-[13px] text-[#516074] outline-none"
                >
                  <option value="match">Sort by match</option>
                  <option value="name">Sort by name</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <section className="rounded-2xl border border-[#e3eaf2] bg-white p-8 text-center shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
              <p className="text-[14px] text-[#94a3b8]">
                No products matched your search.
              </p>
            </section>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.productId}
                    supplierId={supplier.supplierId}
                    product={product}
                    onOpen={() => setSelectedProduct(product)}
                  />
                ))}
              </section>

              <section className="flex items-center justify-center gap-3 rounded-2xl border border-[#e3eaf2] bg-white px-5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                <button
                  type="button"
                  className="text-[12px] text-[#94a3b8] transition hover:text-[#223654]"
                >
                  &lt; Previous
                </button>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#223f68] px-2 text-[11px] font-medium text-white">
                  1
                </span>
                <button
                  type="button"
                  className="text-[12px] text-[#94a3b8] transition hover:text-[#223654]"
                >
                  Next &gt;
                </button>
              </section>
            </>
          )}
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="rounded-2xl border border-[#e3eaf2] bg-white p-8 text-center shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
          <p className="text-[14px] text-[#94a3b8]">
            No reviews yet for this supplier.
          </p>
        </section>
      ) : null}

      {selectedProduct ? (
        <ProductDetailsModal
          supplierId={supplier.supplierId}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}
