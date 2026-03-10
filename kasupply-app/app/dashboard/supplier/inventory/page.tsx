import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createInventoryItem } from "./actions";

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

export default async function SupplierInventoryPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/auth/login");
  }

  // 1. Get app user
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id, name")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  // 2. Get business profile
  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id, business_name")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    redirect("/onboarding");
  }

  // 3. Get supplier profile
  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  // 4. Load categories
  const { data: categories, error: categoriesError } = await supabase
    .from("product_categories")
    .select("category_id, category_name")
    .order("category_name", { ascending: true });

  if (categoriesError) {
    throw new Error(categoriesError.message || "Failed to load categories.");
  }

  // 5. Load supplier products
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      product_id,
      category_id,
      product_name,
      description,
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

  const totalProducts = safeProducts.length;
  const publishedProducts = safeProducts.filter((p) => p.is_published).length;
  const unpublishedProducts = safeProducts.filter((p) => !p.is_published).length;
  const lowStockProducts = safeProducts.filter(
    (p) => Number(p.stock_available) <= Number(p.moq)
  ).length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-gray-600">
          Manage your products, stock availability, and publish status.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Products</p>
          <h2 className="mt-2 text-2xl font-bold">{totalProducts}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Published</p>
          <h2 className="mt-2 text-2xl font-bold">{publishedProducts}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unpublished</p>
          <h2 className="mt-2 text-2xl font-bold">{unpublishedProducts}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Low Stock</p>
          <h2 className="mt-2 text-2xl font-bold">{lowStockProducts}</h2>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Categories</h2>

        {safeCategories.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No categories found.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            {safeCategories.map((category) => (
              <li key={category.category_id}>{category.category_name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Add Product</h2>
          <p className="text-sm text-gray-500">
            Add a new raw material or product listing for buyers to discover.
          </p>
        </div>

        <form action={createInventoryItem} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Product Name</label>
            <input
              name="product_name"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. Cocoa Powder"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              name="category_id"
              required
              className="w-full rounded border px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select category
              </option>
              {safeCategories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={4}
              className="w-full rounded border px-3 py-2"
              placeholder="Enter product description"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Unit</label>
            <input
              name="unit"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. kg, sack, pack"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Price Per Unit</label>
            <input
              name="price_per_unit"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">MOQ</label>
            <input
              name="moq"
              type="number"
              min="0"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="Minimum order quantity"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Max Capacity</label>
            <input
              name="max_capacity"
              type="number"
              min="0"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="Maximum production capacity"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Lead Time</label>
            <input
              name="lead_time"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. 7 days"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Stock Available</label>
            <input
              name="stock_available"
              type="number"
              min="0"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="Available stock"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="is_published"
              name="is_published"
              type="checkbox"
              className="h-4 w-4"
            />
            <label htmlFor="is_published" className="text-sm font-medium">
              Publish this product immediately
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Save Product
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">My Products</h2>
          <p className="text-sm text-gray-500">
            These are the products currently linked to your supplier account.
          </p>
        </div>

        {safeProducts.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">MOQ</th>
                  <th className="px-3 py-2 font-medium">Stock</th>
                  <th className="px-3 py-2 font-medium">Lead Time</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {safeProducts.map((product) => (
                  <tr key={product.product_id} className="border-b">
                    <td className="px-3 py-3">
                      <div className="font-medium">{product.product_name}</div>
                      {product.description ? (
                        <div className="text-xs text-gray-500">
                          {product.description}
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

                    <td className="px-3 py-3">{product.stock_available}</td>

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}