"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { RemoveProductModal } from "@/components/modals";
import { deleteInventoryItem } from "./actions";

type InventoryStatus = "all" | "in-stock" | "low-stock" | "out-of-stock";

type CategoryOption = {
  categoryId: number;
  categoryName: string;
};

type InventoryItem = {
  productId: number;
  categoryId: number | null;
  categoryLabel: string;
  productName: string;
  description: string | null;
  imageSrc: string | null;
  unit: string;
  pricePerUnit: number;
  moq: number;
  maxCapacity: number;
  leadTime: string;
  stockAvailable: number;
  isPublished: boolean;
  status: Exclude<InventoryStatus, "all">;
};

type SelectedProduct = {
  productId: number;
  name: string;
};

type SupplierInventoryTableClientProps = {
  categories: CategoryOption[];
  products: InventoryItem[];
  initialSearchText: string;
  initialSelectedCategory: string;
  initialSelectedStatus: InventoryStatus;
  initialPage: number;
};

function normalizeFilterValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildInventoryHref(params: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  edit?: number | null;
}) {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.edit) query.set("edit", String(params.edit));

  const suffix = query.toString();
  return suffix ? `/supplier/inventory?${suffix}` : "/supplier/inventory";
}

function getEmptyStateMessage(params: {
  selectedCategory: string;
  searchQuery: string;
  status: InventoryStatus;
}) {
  if (params.selectedCategory) {
    return "No products found in this category.";
  }

  if (params.searchQuery) {
    return "No products match your search.";
  }

  if (params.status !== "all") {
    return `No ${params.status.replace("-", " ")} products found.`;
  }

  return "No inventory products found.";
}

export function SupplierInventoryTableClient({
  categories,
  products,
  initialSearchText,
  initialSelectedCategory,
  initialSelectedStatus,
  initialPage,
}: SupplierInventoryTableClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchText);
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory);
  const [selectedStatus, setSelectedStatus] =
    useState<InventoryStatus>(initialSelectedStatus);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const normalizedSearch = normalizeFilterValue(deferredSearchQuery);
  const normalizedSelectedCategory = normalizeFilterValue(selectedCategory);

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();

    return categories.filter((category) => {
      const normalizedName = normalizeFilterValue(category.categoryName);
      if (!normalizedName || seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    });
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStatus =
        selectedStatus === "all" ? true : product.status === selectedStatus;

      const matchesCategory =
        !normalizedSelectedCategory ||
        normalizeFilterValue(product.categoryLabel) === normalizedSelectedCategory;

      const matchesSearch =
        !normalizedSearch ||
        [
          product.productName,
          product.description ?? "",
          product.categoryLabel,
        ].some((value) => normalizeFilterValue(value).includes(normalizedSearch));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [normalizedSearch, normalizedSelectedCategory, products, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, normalizedSelectedCategory, selectedStatus]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const pageNumbers: Array<number | "..."> = [];
  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) pageNumbers.push(page);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    for (
      let page = Math.max(2, safePage - 1);
      page <= Math.min(totalPages - 1, safePage + 1);
      page += 1
    ) {
      pageNumbers.push(page);
    }
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  const handleRemoveConfirm = () => {
    if (!selectedProduct) {
      return;
    }

    startRemoveTransition(async () => {
      const formData = new FormData();
      formData.set("product_id", String(selectedProduct.productId));
      await deleteInventoryItem(formData);
    });
  };

  const handleRemoveCancel = () => {
    if (isRemoving) return;
    setIsRemoveModalOpen(false);
    setSelectedProduct(null);
  };

  const handleRemoveOpen = (product: InventoryItem) => {
    setSelectedProduct({
      productId: product.productId,
      name: product.productName,
    });
    setIsRemoveModalOpen(true);
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[330px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#C1C9D6]">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
                <path
                  d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Products..."
              className="h-[42px] w-full rounded-[10px] border border-[#D8E0EA] bg-white pl-10 pr-4 text-[13px] text-[#334155] outline-none placeholder:text-[#C1C9D6]"
            />
          </label>

          <div className="relative sm:w-[190px]">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-[42px] w-full appearance-none rounded-[10px] border border-[#D8E0EA] bg-white px-4 pr-10 text-[13px] text-[#344054] outline-none"
            >
              <option value="">All</option>
              {categoryOptions.map((category) => (
                <option key={category.categoryId} value={category.categoryName}>
                  {category.categoryName}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#98A2B3]">
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            ["all", "All"],
            ["in-stock", "In stock"],
            ["low-stock", "Low stock"],
            ["out-of-stock", "Out of stock"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedStatus(value as InventoryStatus)}
              className={`inline-flex h-[28px] items-center justify-center rounded-full px-4 text-[13px] font-normal transition ${
                selectedStatus === value
                  ? "bg-[#233F68] text-white"
                  : "text-[#A0A8B7] hover:text-[#64748B]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-[#E6EBF2] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.03)]">
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#F0F0F0] text-left">
                <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  #
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Product
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Description
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Stock
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Price
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Min Qty
                </th>
                <th className="whitespace-nowrap px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Max Capacity
                </th>
                <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Lead Time
                </th>
                <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Visibility
                </th>
                <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Status
                </th>
                <th className="pl-3 pr-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-12 text-center text-[13px] text-[#9AA4B5]"
                  >
                    {getEmptyStateMessage({
                      selectedCategory,
                      searchQuery: normalizedSearch,
                      status: selectedStatus,
                    })}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, index) => {
                  const statusLabel =
                    product.status === "in-stock"
                      ? "In stock"
                      : product.status === "low-stock"
                        ? "Low stock"
                        : "Out of stock";
                  const statusClassName =
                    product.status === "in-stock"
                      ? "bg-[#ECFBF1] text-[#22A658]"
                      : product.status === "low-stock"
                        ? "bg-[#FFF3EA] text-[#FF8A2D]"
                        : "bg-[#FFF0EF] text-[#FF5454]";
                  const visibilityLabel = product.isPublished ? "Visible" : "Hidden";
                  const visibilityClassName = product.isPublished
                    ? "bg-[#EAF1FF] text-[#3E73F7] border border-[#D6E3FF]"
                    : "bg-[#F5F6F7] text-[#A4ACBA] border border-[#E2E8F0]";

                  return (
                    <tr
                      key={product.productId}
                      className="border-t border-[#EEF2F7] text-[12px] text-[#66748B]"
                    >
                      <td className="px-3 py-3.5 align-middle text-center font-medium text-[#B6BFCC]">
                        {String((safePage - 1) * pageSize + index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          {product.imageSrc ? (
                            <img
                              src={product.imageSrc}
                              alt={product.productName}
                              className="h-10 w-10 rounded-[10px] border border-[#EDF2F7] object-cover"
                            />
                          ) : (
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[16px] ${
                                product.status === "out-of-stock"
                                  ? "bg-[#C28A35]"
                                  : "bg-[#E9F7EA]"
                              }`}
                            >
                              <span role="img" aria-label="product">
                                {product.status === "out-of-stock" ? "🫚" : "🌿"}
                              </span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[#39455C]">
                              {product.productName}
                            </p>
                            <span className="mt-1 inline-flex rounded-full bg-[#F6F7F8] px-2.5 py-0.5 text-[10px] text-[#A0A8B7]">
                              {product.categoryLabel}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle text-[12px] leading-5 text-[#66748B]">
                        <p className="line-clamp-2">
                          {product.description?.trim() || "No description added yet."}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">
                        {product.stockAvailable} {product.unit}
                      </td>
                      <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">
                        {formatCurrency(Number(product.pricePerUnit))}
                        <span className="text-[#96A0AF]">/{product.unit}</span>
                      </td>
                      <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">
                        {product.moq} {product.unit}
                      </td>
                      <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">
                        {product.maxCapacity.toLocaleString()}
                      </td>
                      <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">
                        {product.leadTime}
                      </td>
                      <td className="px-3 py-3.5 align-middle text-center">
                        <span
                          className={`inline-flex rounded-[6px] px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${visibilityClassName}`}
                        >
                          {visibilityLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 align-middle text-center">
                        <span
                          className={`inline-flex rounded-[6px] px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${statusClassName}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="pl-3 pr-6 py-3.5 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={buildInventoryHref({
                              search: searchQuery.trim(),
                              category: selectedCategory,
                              status: selectedStatus,
                              page: safePage,
                              edit: product.productId,
                            })}
                            aria-label="Edit product"
                            className="block h-[32px] w-[40px] shrink-0 transition hover:opacity-90"
                          >
                            <Image
                              src="/icons/inventory-edit.svg"
                              alt=""
                              width={40}
                              height={32}
                              className="h-[32px] w-[40px]"
                            />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveOpen(product)}
                            aria-label="Delete product"
                            className="block h-[32px] w-[40px] shrink-0 transition hover:opacity-90"
                          >
                            <Image
                              src="/icons/inventory-delete.svg"
                              alt=""
                              width={40}
                              height={32}
                              className="h-[32px] w-[40px]"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[13px] text-[#A0A8B7]">
        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          className={`inline-flex items-center gap-1.5 ${
            safePage === 1 ? "pointer-events-none opacity-50" : "hover:text-[#5D6B85]"
          }`}
        >
          <span>←</span>
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 text-[#A0A8B7]">
                ...
              </span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-[10px] px-2 ${
                  safePage === pageNumber
                    ? "bg-[#233F68] text-white"
                    : "text-[#55637C] hover:text-[#233F68]"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          className={`inline-flex items-center gap-1.5 ${
            safePage === totalPages
              ? "pointer-events-none opacity-50"
              : "text-[#55637C] hover:text-[#233F68]"
          }`}
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
      <RemoveProductModal
        open={isRemoveModalOpen}
        onClose={handleRemoveCancel}
        onConfirm={handleRemoveConfirm}
        productName={selectedProduct?.name}
        isSubmitting={isRemoving}
      />
    </>
  );
}
