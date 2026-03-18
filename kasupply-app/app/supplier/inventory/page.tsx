import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  togglePublishStatus,
  quickUpdateStock,
} from "./actions";

type ProductCategoryRow = {
  category_id: number;
  category_name: string;
};

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function InventoryStatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-2xl font-bold">{value}</h2>
    </div>
  );
}

function InventoryField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ProductFormFields({
  categories,
  product,
  imageSrc,
}: {
  categories: ProductCategoryRow[];
  product?: ProductRow | null;
  imageSrc?: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <InventoryField label="Product Image">
          <input
            name="image_file"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Upload a clear JPG, PNG, or WEBP image for this product.
          </p>

          {imageSrc ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Current image</p>
              <img
                src={imageSrc}
                alt={product?.product_name ?? "Current product image"}
                className="h-28 w-28 rounded-lg border object-cover"
              />
            </div>
          ) : null}
        </InventoryField>
      </div>

      <div className="md:col-span-2">
        <InventoryField label="Product Name">
          <input
            name="product_name"
            type="text"
            required
            defaultValue={product?.product_name ?? ""}
            className="w-full rounded border px-3 py-2"
            placeholder="e.g. Cocoa Powder"
          />
        </InventoryField>
      </div>

      <InventoryField label="Category">
        <select
          name="category_id"
          required
          defaultValue={product?.category_id ?? ""}
          className="w-full rounded border px-3 py-2"
        >
          <option value="" disabled>
            Select category
          </option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.category_name}
            </option>
          ))}
        </select>
      </InventoryField>

      <InventoryField label="Unit">
        <input
          name="unit"
          type="text"
          required
          defaultValue={product?.unit ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="e.g. kg, sack, pack"
        />
      </InventoryField>

      <div className="md:col-span-2">
        <InventoryField label="Description">
          <textarea
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            className="w-full rounded border px-3 py-2"
            placeholder="Enter product description"
          />
        </InventoryField>
      </div>

      <InventoryField label="Price Per Unit">
        <input
          name="price_per_unit"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={product?.price_per_unit ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="0.00"
        />
      </InventoryField>

      <InventoryField label="MOQ">
        <input
          name="moq"
          type="number"
          min="0"
          required
          defaultValue={product?.moq ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="Minimum order quantity"
        />
      </InventoryField>

      <InventoryField label="Max Capacity">
        <input
          name="max_capacity"
          type="number"
          min="0"
          required
          defaultValue={product?.max_capacity ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="Maximum production capacity"
        />
      </InventoryField>

      <InventoryField label="Lead Time">
        <input
          name="lead_time"
          type="text"
          required
          defaultValue={product?.lead_time ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="e.g. 7 days"
        />
      </InventoryField>

      <InventoryField label="Stock Available">
        <input
          name="stock_available"
          type="number"
          min="0"
          required
          defaultValue={product?.stock_available ?? ""}
          className="w-full rounded border px-3 py-2"
          placeholder="Available stock"
        />
      </InventoryField>

      <div className="flex items-center gap-2 md:col-span-2">
        <input
          id={product ? "edit_is_published" : "is_published"}
          name="is_published"
          type="checkbox"
          defaultChecked={product?.is_published ?? false}
          className="h-4 w-4"
        />
        <label
          htmlFor={product ? "edit_is_published" : "is_published"}
          className="text-sm font-medium"
        >
          Publish this product
        </label>
      </div>
    </div>
  );
}

function InventoryModal({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>

          <Link
            href="/supplier/inventory"
            className="rounded border px-3 py-2 text-sm"
          >
            Close
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}

export default async function SupplierInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    edit?: string;
    delete?: string;
    modal?: string;
    search?: string;
    category?: string;
    status?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editingId = resolvedSearchParams.edit
    ? Number(resolvedSearchParams.edit)
    : null;
  const deletingId = resolvedSearchParams.delete
    ? Number(resolvedSearchParams.delete)
    : null;
  const modal = String(resolvedSearchParams.modal || "").trim().toLowerCase();

  const searchText = String(resolvedSearchParams.search || "").trim().toLowerCase();
  const selectedCategory = String(resolvedSearchParams.category || "").trim();
  const selectedStatus = String(resolvedSearchParams.status || "").trim();

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/auth/login");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, name")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id, business_name")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true });

  if (categoriesError) {
    throw new Error(categoriesError.message || "Failed to load categories.");
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      product_id,
      category_id,
      product_name,
      description,
      image_url,
      unit,
      price_per_unit,
      moq,
      max_capacity,
      lead_time,
      stock_available,
      is_published,
      created_at,
      updated_at
    `)
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw new Error(productsError.message || "Failed to load products.");
  }

  const safeCategories = (categories as ProductCategoryRow[] | null) ?? [];
  const safeProducts = (products as ProductRow[] | null) ?? [];

  const categoryMap = new Map<number, string>();
  for (const category of safeCategories) {
    categoryMap.set(category.category_id, category.category_name);
  }

  const filteredProducts = safeProducts.filter((product) => {
    const matchesSearch =
      !searchText ||
      product.product_name.toLowerCase().includes(searchText) ||
      (product.description ?? "").toLowerCase().includes(searchText);

    const matchesCategory =
      !selectedCategory ||
      String(product.category_id ?? "") === selectedCategory;

    const matchesStatus =
      !selectedStatus ||
      (selectedStatus === "published" && product.is_published) ||
      (selectedStatus === "draft" && !product.is_published) ||
      (selectedStatus === "low-stock" &&
        Number(product.stock_available) <= Number(product.moq));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const productBeingEdited =
    editingId != null
      ? safeProducts.find((product) => product.product_id === editingId) ?? null
      : null;

  const productBeingDeleted =
    deletingId != null
      ? safeProducts.find((product) => product.product_id === deletingId) ?? null
      : null;

  const imageSrcMap = new Map<number, string | null>();
  for (const product of safeProducts) {
    if (!product.image_url) {
      imageSrcMap.set(product.product_id, null);
      continue;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(product.image_url);

    imageSrcMap.set(product.product_id, data.publicUrl);
  }

  const totalProducts = safeProducts.length;
  const publishedProducts = safeProducts.filter((p) => p.is_published).length;
  const unpublishedProducts = safeProducts.filter((p) => !p.is_published).length;
  const lowStockProducts = safeProducts.filter(
    (p) => Number(p.stock_available) <= Number(p.moq)
  ).length;

  return (
    <>
      <main className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-gray-600">
              Review your products first, then add, edit, or remove items as needed.
            </p>
          </div>

          <Link
            href="/supplier/inventory?modal=add"
            className="inline-flex items-center justify-center rounded bg-black px-4 py-2 text-sm text-white"
          >
            Add Product
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <InventoryStatCard title="Total Products" value={totalProducts} />
          <InventoryStatCard title="Published" value={publishedProducts} />
          <InventoryStatCard title="Unpublished" value={unpublishedProducts} />
          <InventoryStatCard title="Low Stock" value={lowStockProducts} />
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-semibold">Created Products</h2>
              <p className="text-sm text-gray-500">
                These are the products currently linked to your supplier account.
              </p>
            </div>

            <form method="GET" className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Search
                </label>
                <input
                  type="text"
                  name="search"
                  defaultValue={searchText}
                  placeholder="Search product"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue={selectedCategory}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="">All categories</option>
                  {safeCategories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="low-stock">Low Stock</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-black px-4 py-2 text-sm text-white"
                >
                  Apply
                </button>

                <Link
                  href="/supplier/inventory"
                  className="rounded border px-4 py-2 text-sm"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium">Image</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">MOQ</th>
                    <th className="px-3 py-2 font-medium">Stock</th>
                    <th className="px-3 py-2 font-medium">Lead Time</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Quick Actions</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => {
                    const isLowStock =
                      Number(product.stock_available) <= Number(product.moq);

                    return (
                      <tr
                        key={product.product_id}
                        className={`border-b ${isLowStock ? "bg-red-50" : ""}`}
                      >
                        <td className="px-3 py-3">
                          {imageSrcMap.get(product.product_id) ? (
                            <img
                              src={imageSrcMap.get(product.product_id) ?? ""}
                              alt={product.product_name}
                              className="h-14 w-14 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-gray-50 text-[10px] text-gray-400">
                              No image
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-medium">{product.product_name}</div>
                          {product.description ? (
                            <div className="text-xs text-gray-500">
                              {product.description}
                            </div>
                          ) : null}
                          {isLowStock ? (
                            <div className="mt-1 text-xs font-medium text-red-600">
                              Low stock: stock is at or below MOQ
                            </div>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          {product.category_id
                            ? categoryMap.get(product.category_id) ?? "Uncategorized"
                            : "Uncategorized"}
                        </td>

                        <td className="px-3 py-3">{product.unit}</td>

                        <td className="px-3 py-3">
                          {formatCurrency(Number(product.price_per_unit))}
                        </td>

                        <td className="px-3 py-3">{product.moq}</td>

                        <td className="px-3 py-3">
                          <span className={isLowStock ? "font-semibold text-red-600" : ""}>
                            {product.stock_available}
                          </span>
                        </td>

                        <td className="px-3 py-3">{product.lead_time}</td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              product.is_published
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {product.is_published ? "Published" : "Draft"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex min-w-[220px] flex-col gap-2">
                            <form action={togglePublishStatus}>
                              <input
                                type="hidden"
                                name="product_id"
                                value={product.product_id}
                              />
                              <input
                                type="hidden"
                                name="current_value"
                                value={String(product.is_published)}
                              />
                              <button
                                type="submit"
                                className="w-full rounded border px-3 py-1 text-xs"
                              >
                                {product.is_published ? "Unpublish" : "Publish"}
                              </button>
                            </form>

                            <form action={quickUpdateStock} className="flex gap-2">
                              <input
                                type="hidden"
                                name="product_id"
                                value={product.product_id}
                              />
                              <input
                                type="number"
                                name="stock_available"
                                min="0"
                                defaultValue={product.stock_available}
                                className="w-24 rounded border px-2 py-1 text-xs"
                              />
                              <button
                                type="submit"
                                className="rounded border px-3 py-1 text-xs"
                              >
                                Update Stock
                              </button>
                            </form>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/supplier/inventory?edit=${product.product_id}`}
                              className="rounded border px-3 py-1 text-xs"
                            >
                              Edit
                            </Link>

                            <Link
                              href={`/supplier/inventory?delete=${product.product_id}`}
                              className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
                            >
                              Delete
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modal === "add" ? (
        <InventoryModal
          title="Add Product"
          description="Create a new raw material or product listing for buyers to discover."
        >
          <form action={createInventoryItem} className="space-y-5">
            <ProductFormFields categories={safeCategories} />

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/supplier/inventory"
                className="rounded border px-4 py-2 text-sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm text-white"
              >
                Save Product
              </button>
            </div>
          </form>
        </InventoryModal>
      ) : null}

      {productBeingEdited ? (
        <InventoryModal
          title="Edit Product"
          description="Update this product without leaving the inventory list."
        >
          <form action={updateInventoryItem} className="space-y-5">
            <input type="hidden" name="product_id" value={productBeingEdited.product_id} />
            <ProductFormFields
              categories={safeCategories}
              product={productBeingEdited}
              imageSrc={imageSrcMap.get(productBeingEdited.product_id) ?? null}
            />

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/supplier/inventory"
                className="rounded border px-4 py-2 text-sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm text-white"
              >
                Update Product
              </button>
            </div>
          </form>
        </InventoryModal>
      ) : null}

      {productBeingDeleted ? (
        <InventoryModal
          title="Delete Product"
          description="This action will remove the selected product from your inventory."
        >
          <div className="space-y-5">
            <div className="rounded-lg border bg-red-50 p-4 text-sm text-red-700">
              You are about to delete <span className="font-semibold">{productBeingDeleted.product_name}</span>.
              This cannot be undone.
            </div>

            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
              <p>
                <span className="font-medium">Category:</span>{" "}
                {productBeingDeleted.category_id
                  ? categoryMap.get(productBeingDeleted.category_id) ?? "Uncategorized"
                  : "Uncategorized"}
              </p>
              <p className="mt-1">
                <span className="font-medium">Unit:</span> {productBeingDeleted.unit}
              </p>
              <p className="mt-1">
                <span className="font-medium">Stock:</span>{" "}
                {productBeingDeleted.stock_available}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/supplier/inventory"
                className="rounded border px-4 py-2 text-sm"
              >
                Cancel
              </Link>
              <form action={deleteInventoryItem}>
                <input
                  type="hidden"
                  name="product_id"
                  value={productBeingDeleted.product_id}
                />
                <button
                  type="submit"
                  className="rounded bg-red-600 px-4 py-2 text-sm text-white"
                >
                  Delete Product
                </button>
              </form>
            </div>
          </div>
        </InventoryModal>
      ) : null}
    </>
  );
}
