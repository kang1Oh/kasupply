import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplierProfileDetails } from "./actions";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";

type SupplierProfilePageProps = {
  params: Promise<{
    supplierId: string;
  }>;
};

export default async function SupplierProfilePage({
  params,
}: SupplierProfilePageProps) {
  const { supplierId } = await params;
  const numericSupplierId = Number(supplierId);

  if (!Number.isFinite(numericSupplierId)) {
    notFound();
  }

  const supplier = await getSupplierProfileDetails(numericSupplierId);
  await getUserOnboardingStatus();

  if (!supplier) {
    notFound();
  }

  return (
    <main className="p-6 space-y-6">
      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#223654]">
                {supplier.businessName}
              </h1>

              {supplier.verifiedBadge ? (
                <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                  Verified
                </span>
              ) : null}
            </div>

            <p className="text-sm text-[#8b95a5]">
              {supplier.businessType} • {supplier.city}, {supplier.province}
            </p>

            <p className="text-sm text-[#8b95a5]">{supplier.businessLocation}</p>

            {supplier.about ? (
              <p className="max-w-3xl text-sm text-[#4a5b75]">{supplier.about}</p>
            ) : null}
          </div>

          <div className="w-full max-w-sm rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4 text-sm text-[#4a5b75]">
            <p>
              <span className="font-medium text-[#223654]">Contact Name:</span>{" "}
              {supplier.contactName ?? "Not provided"}
            </p>
            <p className="mt-2">
              <span className="font-medium text-[#223654]">Contact Number:</span>{" "}
              {supplier.contactNumber ?? "Not provided"}
            </p>
            <p className="mt-2">
              <span className="font-medium text-[#223654]">Region:</span>{" "}
              {supplier.region}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-lg font-semibold text-[#223654]">
            Business Verification Documents
          </h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            These documents help confirm that the supplier is a legitimate registered
            business.
          </p>
        </div>

        {supplier.businessDocuments.length === 0 ? (
          <p className="mt-4 text-sm text-[#8b95a5]">
            No business documents available for buyer viewing.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {supplier.businessDocuments.map((document) => (
              <div
                key={document.documentId}
                className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4"
              >
                <div className="space-y-3">
                  <div className="space-y-1 text-sm text-[#4a5b75]">
                    <p>
                      <span className="font-medium text-[#223654]">Document:</span>{" "}
                      {document.documentTypeName}
                    </p>
                    <p>
                      <span className="font-medium text-[#223654]">Status:</span>{" "}
                      {document.status}
                    </p>
                    <p>
                      <span className="font-medium text-[#223654]">Verified:</span>{" "}
                      {document.verifiedAt ?? "Not verified yet"}
                    </p>
                  </div>

                  {!document.documentUrl ? (
                    <p className="text-sm text-[#8b95a5]">Document preview unavailable.</p>
                  ) : document.isImageFile ? (
                    <a href={document.documentUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={document.documentUrl}
                        alt={document.documentTypeName}
                        className="max-h-80 rounded-lg border border-[#d7dee8] object-contain"
                      />
                    </a>
                  ) : (
                    <a
                      href={document.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-[#d7dee8] bg-white p-4 transition hover:bg-[#f8fafc]"
                    >
                      <p className="font-medium text-[#223654]">{document.fileName}</p>
                      <p className="text-sm text-[#8b95a5]">
                        {document.isPdfFile ? "Open PDF document" : "Open uploaded document"}
                      </p>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-lg font-semibold text-[#223654]">
            Supplier Certifications
          </h2>
          <p className="mt-1 text-sm text-[#8b95a5]">
            These certifications show the supplier&apos;s authority or qualification
            to handle specific goods.
          </p>
        </div>

        {supplier.certifications.length === 0 ? (
          <p className="mt-4 text-sm text-[#8b95a5]">No certifications uploaded yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {supplier.certifications.map((cert) => (
              <div
                key={cert.certificationId}
                className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4"
              >
                <div className="space-y-3">
                  <div className="space-y-1 text-sm text-[#4a5b75]">
                    <p>
                      <span className="font-medium text-[#223654]">Certification:</span>{" "}
                      {cert.certificationTypeName}
                    </p>
                    <p>
                      <span className="font-medium text-[#223654]">Status:</span> {cert.status}
                    </p>
                    <p>
                      <span className="font-medium text-[#223654]">Issued:</span>{" "}
                      {cert.issuedAt ?? "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium text-[#223654]">Expires:</span>{" "}
                      {cert.expiresAt ?? "Not provided"}
                    </p>
                  </div>

                  {!cert.documentUrl ? (
                    <p className="text-sm text-[#8b95a5]">Document preview unavailable.</p>
                  ) : cert.isImageFile ? (
                    <a href={cert.documentUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={cert.documentUrl}
                        alt={cert.certificationTypeName}
                        className="max-h-80 rounded-lg border border-[#d7dee8] object-contain"
                      />
                    </a>
                  ) : (
                    <a
                      href={cert.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-[#d7dee8] bg-white p-4 transition hover:bg-[#f8fafc]"
                    >
                      <p className="font-medium text-[#223654]">{cert.fileName}</p>
                      <p className="text-sm text-[#8b95a5]">
                        {cert.isPdfFile ? "Open PDF document" : "Open uploaded document"}
                      </p>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Products</h2>

        {supplier.products.length === 0 ? (
          <p className="mt-4 text-sm text-[#8b95a5]">No published products yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {supplier.products.map((product) => (
              <div
                key={product.productId}
                className="rounded-xl border border-[#edf1f7] bg-[#fafbfd] p-4"
              >
                {product.imageUrl ? (
                  <div className="mb-4 overflow-hidden rounded-lg border border-[#d7dee8] bg-white">
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-[#d7dee8] bg-white text-sm text-[#8b95a5]">
                    No product image available
                  </div>
                )}

                <h3 className="text-base font-semibold text-[#223654]">
                  {product.productName}
                </h3>

                <p className="mt-1 text-sm text-[#8b95a5]">{product.categoryName}</p>

                {product.description ? (
                  <p className="mt-3 text-sm text-[#4a5b75]">{product.description}</p>
                ) : null}

                <div className="mt-4 space-y-1 text-sm text-[#4a5b75]">
                  <p>
                    <span className="font-medium text-[#223654]">Price:</span> PHP{" "}
                    {product.pricePerUnit.toLocaleString()} / {product.unit}
                  </p>
                  <p>
                    <span className="font-medium text-[#223654]">MOQ:</span> {product.moq}
                  </p>
                  <p>
                    <span className="font-medium text-[#223654]">Stock:</span>{" "}
                    {product.stockAvailable ?? "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-[#223654]">Lead Time:</span>{" "}
                    {product.leadTime ?? "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-[#223654]">Max Capacity:</span>{" "}
                    {product.maxCapacity ?? "Not provided"}
                  </p>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/buyer/rfqs/new?supplierId=${supplier.supplierId}&productId=${product.productId}`}
                    className="inline-flex rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-sm font-medium text-[#223654] transition hover:border-[#223654] hover:bg-[#f8fafc]"
                  >
                    Send Request
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
