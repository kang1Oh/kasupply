import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckMarkModalIcon, ModalShell, TrashCanModalIcon } from "@/components/modals";
import { SupplierProductImagePicker } from "@/components/supplier-product-image-picker";
import { createClient } from "@/lib/supabase/server";
import { createInventoryItem, deleteInventoryItem, updateInventoryItem } from "./actions";

type ProductCategoryRow = { category_id: number; category_name: string };
type SupplierProfileRow = { supplier_id: number; profile_id: number };
type ProductImageRow = {
  image_id: number;
  product_id: number;
  storage_path: string;
  sort_order: number | null;
  is_cover: boolean | null;
};
type ProductRow = {
  product_id: number;
  category_id: number | null;
  product_name: string;
  description: string | null;
  image_url: string | null;
  unit: string;
  price_per_unit: number;
  moq: number;
  max_capacity: number;
  lead_time: string;
  stock_available: number;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};
type InventorySearchParams = {
  edit?: string;
  delete?: string;
  added?: string;
  modal?: string;
  search?: string;
  category?: string;
  status?: string;
  page?: string;
};
type InventoryStatus = "all" | "in-stock" | "low-stock" | "out-of-stock";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInventoryStatus(product: ProductRow): InventoryStatus {
  if (product.stock_available <= 0) return "out-of-stock";
  if (product.stock_available <= product.moq) return "low-stock";
  return "in-stock";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "today";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildInventoryHref(params: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  modal?: string;
  edit?: number | null;
  deleteId?: number | null;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.modal) query.set("modal", params.modal);
  if (params.edit) query.set("edit", String(params.edit));
  if (params.deleteId) query.set("delete", String(params.deleteId));
  const suffix = query.toString();
  return suffix ? `/supplier/inventory?${suffix}` : "/supplier/inventory";
}

function InventoryField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">{label}</label>
      {children}
    </div>
  );
}

function InventorySelect({
  name,
  required,
  defaultValue,
  children,
}: {
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="h-[34px] w-full appearance-none rounded-[8px] border border-[#C9D3E0] bg-white px-3 pr-10 text-[12px] text-[#344054] outline-none"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#98A2B3]">
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
  );
}

function ProductFormFields({
  categories,
  product,
  imageSrc,
  existingImages,
}: {
  categories: ProductCategoryRow[];
  product?: ProductRow | null;
  imageSrc?: string | null;
  existingImages?: Array<{ id: number; url: string }>;
}) {
  return (
    <div className="space-y-4">
      <SupplierProductImagePicker
        name="image_file"
        existingImages={existingImages}
        existingImageSrc={imageSrc}
        existingImageAlt={product?.product_name ?? "Current product image"}
      />
      {false ? (
      <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#344054]">Product Images</p>
          <label className="relative mt-3 flex h-[86px] w-[86px] cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D4DAE5] bg-[#F7F8FA] text-[#98A2B3]">
            <input
              name="image_file"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mt-1.5 text-[12px] font-medium">Add Photo</span>
          </label>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#B0B8C5]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M12 4v16M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Drag thumbnails to reorder
          </p>
        </div>

        <div className="pt-[3px] text-right text-[11px] text-[#98A2B3]">
          First Image = Cover · Drag To Reorder
        </div>
      </div>

      {imageSrc ? (
        <div className="flex items-center gap-2">
          <img
            src={imageSrc}
            alt={product?.product_name ?? "Current product image"}
            className="h-[54px] w-[54px] rounded-[10px] border border-[#E5EAF2] object-cover"
          />
        </div>
      ) : null}
      </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <InventoryField label={<>Product Name <span className="text-[#F04438]">*</span></>}>
            <input
              name="product_name"
              type="text"
              required
              defaultValue={product?.product_name ?? ""}
              className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
              placeholder="e.g Fresh Kangkong"
            />
          </InventoryField>
        </div>

        <div className="md:col-span-2">
          <InventoryField label={<>Category <span className="text-[#F04438]">*</span></>}>
            <InventorySelect
              name="category_id"
              required
              defaultValue={product?.category_id ?? ""}
            >
              <option value="" disabled>Select category</option>
              {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
            </InventorySelect>
          </InventoryField>
        </div>

        <InventoryField label={<>Stock Quantity <span className="text-[#F04438]">*</span></>}>
          <input
            name="stock_available"
            type="number"
            min="0"
            required
            defaultValue={product?.stock_available ?? ""}
            className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
            placeholder="e.g 100"
          />
        </InventoryField>

        <InventoryField label={<>Unit <span className="text-[#F04438]">*</span></>}>
          <InventorySelect
            name="unit"
            required
            defaultValue={product?.unit ?? ""}
          >
            <option value="" disabled>Select unit</option>
            {["kg", "g", "liter", "ml", "bottle", "box", "pack", "piece", "sack"].map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </InventorySelect>
        </InventoryField>

        <InventoryField label={<>Price per unit <span className="text-[#F04438]">*</span></>}>
          <input
            name="price_per_unit"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.price_per_unit ?? ""}
            className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
            placeholder="e.g 10"
          />
        </InventoryField>

        <InventoryField label={<>Min. Order Qty <span className="text-[#F04438]">*</span></>}>
          <input
            name="moq"
            type="number"
            min="0"
            required
            defaultValue={product?.moq ?? ""}
            className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
            placeholder="e.g 10"
          />
        </InventoryField>

        <InventoryField label={<>Lead time <span className="text-[#F04438]">*</span></>}>
          <input
            name="lead_time"
            type="text"
            required
            defaultValue={product?.lead_time ?? ""}
            className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
            placeholder="e.g 1 day"
          />
        </InventoryField>

        <InventoryField label={<>Max capacity <span className="text-[#F04438]">*</span></>}>
          <input
            name="max_capacity"
            type="number"
            min="0"
            required
            defaultValue={product?.max_capacity ?? ""}
            className="h-[34px] w-full rounded-[8px] border border-[#C9D3E0] px-3 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
            placeholder="e.g 2000"
          />
        </InventoryField>

        <div className="md:col-span-2">
          <InventoryField label={<>Visibility <span className="text-[#F04438]">*</span></>}>
            <InventorySelect
              name="visibility"
              required
              defaultValue={product?.is_published ? "visible" : "hidden"}
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </InventorySelect>
          </InventoryField>
        </div>

        <div className="md:col-span-2">
          <InventoryField label={<>Description <span className="text-[#F04438]">*</span></>}>
            <textarea
              name="description"
              rows={4}
              required
              defaultValue={product?.description ?? ""}
              className="w-full rounded-[8px] border border-[#C9D3E0] px-3 py-2.5 text-[12px] text-[#344054] outline-none placeholder:text-[#B0B8C5]"
              placeholder="Describe the product, quality, packaging..."
            />
          </InventoryField>
        </div>
      </div>
    </div>
  );
}

export default async function SupplierInventoryPage({ searchParams }: { searchParams?: Promise<InventorySearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editingId = resolvedSearchParams.edit ? Number(resolvedSearchParams.edit) : null;
  const deletingId = resolvedSearchParams.delete ? Number(resolvedSearchParams.delete) : null;
  const modal = String(resolvedSearchParams.modal || "").trim().toLowerCase();
  const searchText = String(resolvedSearchParams.search || "").trim();
  const normalizedSearch = searchText.toLowerCase();
  const selectedCategory = String(resolvedSearchParams.category || "").trim();
  const selectedStatus = (String(resolvedSearchParams.status || "").trim() || "all") as InventoryStatus;
  const currentPage = Math.max(1, Number(resolvedSearchParams.page || "1") || 1);

  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) redirect("/login");

  const { data: appUser, error: appUserError } = await supabase.from("users").select("user_id, name").eq("auth_user_id", authUser.id).single();
  if (appUserError || !appUser) throw new Error("User record not found.");

  const { data: businessProfile, error: businessProfileError } = await supabase.from("business_profiles").select("profile_id, business_name").eq("user_id", appUser.user_id).single();
  if (businessProfileError || !businessProfile) redirect("/onboarding");

  const { data: supplierProfile, error: supplierProfileError } = await supabase.from("supplier_profiles").select("supplier_id, profile_id").eq("profile_id", businessProfile.profile_id).single<SupplierProfileRow>();
  if (supplierProfileError || !supplierProfile) throw new Error("Supplier profile not found.");

  const { data: categories, error: categoriesError } = await supabase.from("product_categories").select("category_id, category_name").order("category_name", { ascending: true });
  if (categoriesError) throw new Error(categoriesError.message || "Failed to load categories.");

  const { data: products, error: productsError } = await supabase.from("products").select(`
      product_id, category_id, product_name, description, image_url, unit, price_per_unit, moq, max_capacity, lead_time, stock_available, is_published, created_at, updated_at
    `).eq("supplier_id", supplierProfile.supplier_id).order("created_at", { ascending: true });
  if (productsError) throw new Error(productsError.message || "Failed to load products.");

  const safeCategories = (categories as ProductCategoryRow[] | null) ?? [];
  const safeProducts = (products as ProductRow[] | null) ?? [];
    const productIds = safeProducts.map((product) => product.product_id);
    const { data: productImages, error: productImagesError } = productIds.length
      ? await supabase
          .from("product_images")
          .select("image_id, product_id, storage_path, sort_order, is_cover")
          .in("product_id", productIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };
  if (productImagesError) throw new Error(productImagesError.message || "Failed to load product images.");
  const categoryMap = new Map<number, string>();
  for (const category of safeCategories) categoryMap.set(category.category_id, category.category_name);

  const imageSrcMap = new Map<number, string | null>();
  const productImagesMap = new Map<number, Array<{ id: number; url: string }>>();
  for (const image of (productImages as ProductImageRow[] | null) ?? []) {
    const { data } = supabase.storage.from("product-images").getPublicUrl(image.storage_path);
    const currentImages = productImagesMap.get(image.product_id) ?? [];
    currentImages.push({ id: image.image_id, url: data.publicUrl });
    productImagesMap.set(image.product_id, currentImages);
  }
  for (const product of safeProducts) {
    const storedImages = productImagesMap.get(product.product_id);
    if (storedImages && storedImages.length > 0) {
      imageSrcMap.set(product.product_id, storedImages[0].url);
      continue;
    }
    if (!product.image_url) {
      imageSrcMap.set(product.product_id, null);
      continue;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(product.image_url);
    imageSrcMap.set(product.product_id, data.publicUrl);
  }

  const totalProducts = safeProducts.length;
  const inStockProducts = safeProducts.filter((product) => getInventoryStatus(product) === "in-stock").length;
  const lowStockProducts = safeProducts.filter((product) => getInventoryStatus(product) === "low-stock").length;
  const outOfStockProducts = safeProducts.filter((product) => getInventoryStatus(product) === "out-of-stock").length;

  const lastUpdatedProduct = [...safeProducts].sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime()).at(0);

  const filteredProducts = safeProducts.filter((product) => {
    const productStatus = getInventoryStatus(product);
    const categoryName = product.category_id ? categoryMap.get(product.category_id) ?? "" : "";
    const matchesSearch = !normalizedSearch || product.product_name.toLowerCase().includes(normalizedSearch) || (product.description ?? "").toLowerCase().includes(normalizedSearch) || categoryName.toLowerCase().includes(normalizedSearch);
    const matchesCategory = !selectedCategory || String(product.category_id ?? "") === selectedCategory;
    const matchesStatus = selectedStatus === "all" ? true : productStatus === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const productBeingEdited = editingId != null ? safeProducts.find((product) => product.product_id === editingId) ?? null : null;
  const productBeingDeleted = deletingId != null ? safeProducts.find((product) => product.product_id === deletingId) ?? null : null;
  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) pageNumbers.push(page);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    for (let page = Math.max(2, safePage - 1); page <= Math.min(totalPages - 1, safePage + 1); page += 1) pageNumbers.push(page);
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <>
      <main className="-m-6 min-h-screen bg-[#F7F9FC]">
        <section className="overflow-hidden border-b border-[#E8EDF4] bg-white">
          <div className="flex items-center justify-between px-[18px] py-[15px]">
            <div className="flex items-center gap-2 text-[12px] text-[#A4ACBA]">
              <span>KaSupply</span>
              <span className="text-[#CBD2DE]">/</span>
              <span className="font-semibold text-[#506073]">Inventory</span>
            </div>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                aria-label="Notifications"
                className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
              >
                <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                aria-label="Messages"
                className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
              >
                <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true"><path d="M7 18.5A2.5 2.5 0 0 1 4.5 16V8A2.5 2.5 0 0 1 7 5.5h10A2.5 2.5 0 0 1 19.5 8v8a2.5 2.5 0 0 1-2.5 2.5H11l-4 3v-3H7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

        </section>

        <section className="px-[24px] py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-[#2B3B56]">Product Inventory</h1>
                <p className="mt-1.5 text-[13px] text-[#98A3B4]">
                  {totalProducts} items cataloged · last updated {formatUpdatedAt(lastUpdatedProduct?.updated_at ?? lastUpdatedProduct?.created_at ?? null)}
                </p>
              </div>
              <Link href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: safePage, modal: "add" })} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#2F6CF6] px-4 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(47,108,246,0.22)] transition hover:bg-[#245CE0]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Add Product
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[18px] border border-[#EDF1F6] border-l-[3px] border-l-[#2F6CF6] bg-white px-[18px] py-[18px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"><p className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">Total Products</p><p className="mt-3 text-[24px] font-semibold leading-none text-[#27344C]">{totalProducts}</p></div>
              <div className="rounded-[18px] border border-[#EDF1F6] border-l-[3px] border-l-[#23A05A] bg-white px-[18px] py-[18px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"><p className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">In Stock</p><p className="mt-3 text-[24px] font-semibold leading-none text-[#27344C]">{inStockProducts}</p></div>
              <div className="rounded-[18px] border border-[#EDF1F6] border-l-[3px] border-l-[#FF8B2B] bg-white px-[18px] py-[18px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"><p className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">Low Stock</p><p className="mt-3 text-[24px] font-semibold leading-none text-[#27344C]">{lowStockProducts}</p></div>
              <div className="rounded-[18px] border border-[#EDF1F6] border-l-[3px] border-l-[#FF4D4F] bg-white px-[18px] py-[18px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"><p className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">Out of Stock</p><p className="mt-3 text-[24px] font-semibold leading-none text-[#27344C]">{outOfStockProducts}</p></div>
            </div>

            <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input type="hidden" name="status" value={selectedStatus} />
                <label className="relative block sm:w-[330px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#C1C9D6]">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true"><path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <input name="search" defaultValue={searchText} placeholder="Search Products..." className="h-[42px] w-full rounded-[10px] border border-[#D8E0EA] bg-white pl-10 pr-4 text-[13px] text-[#334155] outline-none placeholder:text-[#C1C9D6]" />
                </label>
                <div className="relative sm:w-[158px]">
                  <select name="category" defaultValue={selectedCategory} className="h-[42px] w-full appearance-none rounded-[10px] border border-[#D8E0EA] bg-white px-4 pr-10 text-[13px] text-[#344054] outline-none">
                    <option value="">All Categories</option>
                    {safeCategories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
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
                <button type="submit" className="hidden">Apply</button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["all", "All"],
                  ["in-stock", "In stock"],
                  ["low-stock", "Low stock"],
                  ["out-of-stock", "Out of stock"],
                ].map(([value, label]) => (
                  <Link key={value} href={buildInventoryHref({ search: searchText, category: selectedCategory, status: value, page: 1 })} className={`inline-flex h-[28px] items-center justify-center rounded-full px-4 text-[12px] font-normal transition ${selectedStatus === value ? "bg-[#233F68] text-white" : "text-[#A0A8B7] hover:text-[#64748B]"}`}>
                    {label}
                  </Link>
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
                      <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">#</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Product</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Description</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Stock</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Price</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Min Qty</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Max Capacity</th>
                      <th className="px-3 py-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Lead Time</th>
                      <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Visibility</th>
                      <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Status</th>
                      <th className="pl-3 pr-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#ABB4C2]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-[13px] text-[#9AA4B5]">No inventory products found.</td>
                      </tr>
                    ) : (
                      paginatedProducts.map((product, index) => {
                        const status = getInventoryStatus(product);
                        const statusLabel = status === "in-stock" ? "In stock" : status === "low-stock" ? "Low stock" : "Out of stock";
                        const statusClassName = status === "in-stock" ? "bg-[#ECFBF1] text-[#22A658]" : status === "low-stock" ? "bg-[#FFF3EA] text-[#FF8A2D]" : "bg-[#FFF0EF] text-[#FF5454]";
                        const categoryLabel = product.category_id ? categoryMap.get(product.category_id) ?? "Uncategorized" : "Uncategorized";
                        const visibilityLabel = product.is_published ? "Visible" : "Hidden";
                        const visibilityClassName = product.is_published
                          ? "bg-[#EAF1FF] text-[#3E73F7] border border-[#D6E3FF]"
                          : "bg-[#F5F6F7] text-[#A4ACBA] border border-[#E2E8F0]";
                        return (
                          <tr key={product.product_id} className="border-t border-[#EEF2F7] text-[12px] text-[#66748B]">
                            <td className="px-3 py-3.5 align-middle text-center font-medium text-[#B6BFCC]">{String((safePage - 1) * pageSize + index + 1).padStart(2, "0")}</td>
                            <td className="px-3 py-3.5 align-middle">
                              <div className="flex items-center gap-2.5">
                                {imageSrcMap.get(product.product_id) ? (
                                  <img src={imageSrcMap.get(product.product_id) ?? ""} alt={product.product_name} className="h-10 w-10 rounded-[10px] border border-[#EDF2F7] object-cover" />
                                ) : (
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[16px] ${status === "out-of-stock" ? "bg-[#C28A35]" : "bg-[#E9F7EA]"}`}>
                                    <span role="img" aria-label="product">{status === "out-of-stock" ? "🫚" : "🌿"}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-[12px] font-semibold text-[#39455C]">{product.product_name}</p>
                                  <span className="mt-1 inline-flex rounded-full bg-[#F6F7F8] px-2.5 py-0.5 text-[10px] text-[#A0A8B7]">{categoryLabel}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 align-middle text-[12px] leading-5 text-[#66748B]">
                              <p className="line-clamp-2">{product.description?.trim() || "No description added yet."}</p>
                            </td>
                            <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">{product.stock_available} {product.unit}</td>
                            <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">{formatCurrency(Number(product.price_per_unit))}<span className="text-[#96A0AF]">/{product.unit}</span></td>
                            <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">{product.moq} {product.unit}</td>
                            <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">{product.max_capacity.toLocaleString()}</td>
                            <td className="px-3 py-3.5 align-middle font-medium text-[#66748B]">{product.lead_time}</td>
                            <td className="px-3 py-3.5 align-middle text-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${visibilityClassName}`}>{visibilityLabel}</span>
                            </td>
                            <td className="px-3 py-3.5 align-middle text-center"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${statusClassName}`}>{statusLabel}</span></td>
                            <td className="pl-3 pr-6 py-3.5 align-middle">
                              <div className="flex items-center justify-center gap-1.5">
                                <Link href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: safePage, edit: product.product_id })} aria-label="Edit product" className="block h-[32px] w-[40px] shrink-0 transition hover:opacity-90">
                                  <Image src="/icons/inventory-edit.svg" alt="" width={40} height={32} className="h-[32px] w-[40px]" />
                                </Link>
                                <Link href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: safePage, deleteId: product.product_id })} aria-label="Delete product" className="block h-[32px] w-[40px] shrink-0 transition hover:opacity-90">
                                  <Image src="/icons/inventory-delete.svg" alt="" width={40} height={32} className="h-[32px] w-[40px]" />
                                </Link>
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
              <Link href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: Math.max(1, safePage - 1) })} className={`inline-flex items-center gap-1.5 ${safePage === 1 ? "pointer-events-none opacity-50" : "hover:text-[#5D6B85]"}`}>
                <span>←</span><span>Previous</span>
              </Link>
              <div className="flex items-center gap-2">
                {pageNumbers.map((pageNumber, index) => pageNumber === "..." ? <span key={`ellipsis-${index}`} className="px-1 text-[#A0A8B7]">...</span> : <Link key={pageNumber} href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: pageNumber })} className={`flex h-8 min-w-8 items-center justify-center rounded-[10px] px-2 ${safePage === pageNumber ? "bg-[#233F68] text-white" : "text-[#55637C] hover:text-[#233F68]"}`}>{pageNumber}</Link>)}
              </div>
              <Link href={buildInventoryHref({ search: searchText, category: selectedCategory, status: selectedStatus, page: Math.min(totalPages, safePage + 1) })} className={`inline-flex items-center gap-1.5 ${safePage === totalPages ? "pointer-events-none opacity-50" : "text-[#55637C] hover:text-[#233F68]"}`}>
                <span>Next</span><span>→</span>
              </Link>
            </div>
        </section>
      </main>

      {modal === "add" ? (
        <ModalShell
          maxWidthClassName="max-w-[420px]"
          panelClassName="rounded-[20px] bg-white px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
          overlayClassName="bg-[#101828]/45 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[18px] font-semibold text-[#243F68]">Add Product</h2>
            <Link href="/supplier/inventory" className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-[#F4F6FA] text-[#A0A8B7] transition hover:text-[#66748B]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <form action={createInventoryItem} className="mt-3 space-y-5">
            <ProductFormFields categories={safeCategories} />
            <div className="flex items-center justify-end gap-3 pt-1">
              <Link href="/supplier/inventory" className="px-2 py-2 text-[12px] font-medium text-[#98A2B3]">Cancel</Link>
              <button type="submit" className="inline-flex h-[40px] min-w-[124px] items-center justify-center rounded-[10px] bg-[#233F68] px-5 text-[13px] font-medium text-white">Add Product</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {productBeingEdited ? (
        <ModalShell
          maxWidthClassName="max-w-[420px]"
          panelClassName="rounded-[20px] bg-white px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
          overlayClassName="bg-[#101828]/45 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[18px] font-semibold text-[#243F68]">Edit Product</h2>
            <Link href="/supplier/inventory" className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-[#F4F6FA] text-[#A0A8B7] transition hover:text-[#66748B]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <form action={updateInventoryItem} className="mt-3 space-y-5">
            <input type="hidden" name="product_id" value={productBeingEdited.product_id} />
            <ProductFormFields
              categories={safeCategories}
              product={productBeingEdited}
              imageSrc={imageSrcMap.get(productBeingEdited.product_id) ?? null}
              existingImages={productImagesMap.get(productBeingEdited.product_id) ?? []}
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <Link href="/supplier/inventory" className="px-2 py-2 text-[12px] font-medium text-[#98A2B3]">Cancel</Link>
              <button type="submit" className="inline-flex h-[40px] min-w-[124px] items-center justify-center rounded-[10px] bg-[#233F68] px-5 text-[13px] font-medium text-white">Update Product</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {productBeingDeleted ? (
        <ModalShell
          maxWidthClassName="max-w-[625px]"
          panelClassName="rounded-[26px] bg-white px-[42px] py-[42px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
          overlayClassName="bg-[#101828]/45 p-4"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#EFF4FA]">
              <TrashCanModalIcon size={50} />
            </div>

            <h2 className="mt-[26px] text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]">
              Remove Product
            </h2>

            <p className="mt-[18px] max-w-[520px] text-[17px] leading-[1.42] text-[#A7B0BF]">
              Are you sure you want to remove this product from your catalog? This action cannot be undone.
            </p>

            <div className="mt-[34px] flex w-full max-w-[342px] items-center justify-center gap-2.5">
              <Link
                href="/supplier/inventory"
                className="inline-flex h-[46px] min-w-[166px] items-center justify-center rounded-[12px] bg-[#233F68] px-6 text-[14px] font-medium text-white transition hover:bg-[#1D3557]"
              >
                Cancel
              </Link>

              <form action={deleteInventoryItem}>
                <input type="hidden" name="product_id" value={productBeingDeleted.product_id} />
                <button
                  type="submit"
                  className="inline-flex h-[46px] min-w-[166px] items-center justify-center rounded-[12px] border border-[#FF4A3D] bg-white px-6 text-[14px] font-medium text-[#FF3B30] transition hover:bg-[#FFF6F5]"
                >
                  Remove Product
                </button>
              </form>
            </div>
          </div>
        </ModalShell>
      ) : null}

        {modal === "added" ? (
          <ModalShell
            maxWidthClassName="max-w-[560px]"
            panelClassName="rounded-[24px] bg-white px-[34px] py-[34px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
            overlayClassName="bg-[#101828]/45 p-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#EFF4FA]">
                <CheckMarkModalIcon size={52} />
              </div>

              <h2 className="mt-7 text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#243F68]">
                Product Added
              </h2>

                <p className="mt-4 max-w-[370px] text-[16px] font-normal leading-[1.45] text-[#A7B0BF]">
                  Your product has been successfully added to your catalog.
                </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={
                    buildInventoryHref({
                      search: searchText,
                      category: selectedCategory,
                      status: selectedStatus,
                      page: safePage,
                    })
                  }
                  className="inline-flex h-[52px] min-w-[182px] items-center justify-center rounded-[12px] bg-[#233F68] px-6 text-[14px] font-medium text-white transition hover:bg-[#1D3557]"
                >
                  View Product
                </Link>
              <Link
                href={buildInventoryHref({
                  search: searchText,
                  category: selectedCategory,
                  status: selectedStatus,
                  page: safePage,
                  modal: "add",
                })}
                  className="inline-flex h-[52px] min-w-[182px] items-center justify-center rounded-[12px] bg-[#98A7BD] px-6 text-[14px] font-medium text-white transition hover:bg-[#8899B1]"
                >
                  Add Another
                </Link>
            </div>
            </div>
          </ModalShell>
        ) : null}

        {modal === "saved" ? (
          <ModalShell
            maxWidthClassName="max-w-[420px]"
            panelClassName="rounded-[20px] bg-white px-[30px] py-[30px] shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
            overlayClassName="bg-[#101828]/45 p-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EFF4FA]">
                <CheckMarkModalIcon size={34} />
              </div>

              <h2 className="mt-5 text-[18px] font-semibold leading-none tracking-[-0.02em] text-[#243F68]">
                Changes saved
              </h2>

              <p className="mt-3 max-w-[290px] text-[14px] font-normal leading-[1.45] text-[#A7B0BF]">
                Your changes have been saved successfully.
              </p>

              <div className="mt-6">
                <Link
                  href="/supplier/inventory"
                  className="inline-flex h-[42px] min-w-[112px] items-center justify-center rounded-[10px] bg-[#233F68] px-6 text-[14px] font-medium text-white transition hover:bg-[#1D3557]"
                >
                  Okay
                </Link>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </>
    );
  }
