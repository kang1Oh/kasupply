type NewRFQPageProps = {
  searchParams?: Promise<{
    supplierId?: string;
    rfqId?: string;
    productId?: string;
  }>;
};

export default async function NewRFQPage({
  searchParams,
}: NewRFQPageProps) {
  const params = (await searchParams) ?? {};

  const supplierId = params.supplierId ?? "";
  const rfqId = params.rfqId ?? "";
  const productId = params.productId ?? "";

  let entryMode = "blank";

  if (supplierId && rfqId) {
    entryMode = "reuse-rfq";
  } else if (supplierId && productId) {
    entryMode = "product-request";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create RFQ</h1>
        <p className="mt-2 text-sm text-gray-300">
          This is a placeholder page for the RFQ creation form.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <span className="font-medium text-white">Entry Mode:</span>{" "}
            {entryMode}
          </p>
          <p>
            <span className="font-medium text-white">Supplier ID:</span>{" "}
            {supplierId || "None"}
          </p>
          <p>
            <span className="font-medium text-white">RFQ ID:</span>{" "}
            {rfqId || "None"}
          </p>
          <p>
            <span className="font-medium text-white">Product ID:</span>{" "}
            {productId || "None"}
          </p>
        </div>
      </section>
    </div>
  );
}