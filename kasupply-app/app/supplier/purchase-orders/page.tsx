import Link from "next/link";
import { getSupplierPurchaseOrders } from "./data";

function formatCurrency(value: number | null) {
  if (value === null) return "Not available";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_transit":
      return "bg-blue-100 text-blue-800";
    case "delivered":
      return "bg-indigo-100 text-indigo-800";
    case "paid":
      return "bg-emerald-100 text-emerald-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function SummaryCard({
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

export default async function SupplierPurchaseOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = String(resolvedSearchParams.status || "").trim().toLowerCase();

  const { orders, allOrders } = await getSupplierPurchaseOrders(selectedStatus);

  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter((order) => order.status === "pending").length;
  const inTransitOrders = allOrders.filter((order) => order.status === "in_transit").length;
  const deliveredOrders = allOrders.filter((order) => order.status === "delivered").length;
  const paidOrders = allOrders.filter((order) => order.status === "paid").length;
  const completedOrders = allOrders.filter((order) => order.status === "completed").length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-gray-600">
          Manage confirmed buyer orders, delivery and payment tracking, and invoice handling in one supplier workspace.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard title="Total Orders" value={totalOrders} />
        <SummaryCard title="Pending" value={pendingOrders} />
        <SummaryCard title="In Transit" value={inTransitOrders} />
        <SummaryCard title="Delivered" value={deliveredOrders} />
        <SummaryCard title="Paid" value={paidOrders} />
        <SummaryCard title="Completed" value={completedOrders} />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold">Purchase Orders List</h2>
            <p className="text-sm text-gray-500">
              Review buyer purchase orders and open each one for invoice and payment details.
            </p>
          </div>

          <form method="GET" className="flex gap-2">
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm text-white"
            >
              Apply
            </button>

            <Link
              href="/supplier/purchase-orders"
              className="rounded border px-4 py-2 text-sm"
            >
              Reset
            </Link>
          </form>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">PO Number</th>
                  <th className="px-3 py-2 font-medium">Buyer</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Total Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payment Proof</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.poId} className="border-b">
                    <td className="px-3 py-3 font-medium">{order.poNumber}</td>
                    <td className="px-3 py-3">{order.buyer}</td>
                    <td className="px-3 py-3">{order.product}</td>
                    <td className="px-3 py-3">{order.quantity}</td>
                    <td className="px-3 py-3">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getStatusBadgeClasses(order.status)}`}
                      >
                        {toTitleCase(order.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {order.paymentProof ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                          Uploaded
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                          Not uploaded
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/supplier/purchase-orders/${order.poId}`}
                        className="rounded border px-3 py-1 text-xs"
                      >
                        Open
                      </Link>
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
