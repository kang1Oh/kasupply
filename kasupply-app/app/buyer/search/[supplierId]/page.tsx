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
  const status = await getUserOnboardingStatus();

  if (!supplier) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {supplier.businessName}
              </h1>

              {supplier.verifiedBadge ? (
                <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-300">
                  Verified
                </span>
              ) : null}
            </div>

            <p className="text-sm text-gray-300">
              {supplier.businessType} • {supplier.city}, {supplier.province}
            </p>

            <p className="text-sm text-gray-400">
              {supplier.businessLocation}
            </p>

            {supplier.about ? (
              <p className="max-w-3xl text-sm text-gray-300">{supplier.about}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
                <p>
                <span className="font-medium text-white">Contact Name:</span>{" "}
                {supplier.contactName ?? "Not provided"}
                </p>
                <p className="mt-2">
                <span className="font-medium text-white">Contact Number:</span>{" "}
                {supplier.contactNumber ?? "Not provided"}
                </p>
                <p className="mt-2">
                <span className="font-medium text-white">Region:</span>{" "}
                {supplier.region}
                </p>
            </div>

            </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Certifications</h2>

        {supplier.certifications.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            No certifications uploaded yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {supplier.certifications.map((cert) => (
                <div
                    key={cert.certificationId}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                    <div className="space-y-3">
                    <div className="space-y-1 text-sm text-gray-300">
                        <p>
                        <span className="font-medium text-white">Certification:</span>{" "}
                        {cert.certificationTypeName}
                        </p>
                        <p>
                        <span className="font-medium text-white">Status:</span> {cert.status}
                        </p>
                        <p>
                        <span className="font-medium text-white">Issued:</span>{" "}
                        {cert.issuedAt ?? "Not provided"}
                        </p>
                        <p>
                        <span className="font-medium text-white">Expires:</span>{" "}
                        {cert.expiresAt ?? "Not provided"}
                        </p>
                    </div>

                    {!cert.documentUrl ? (
                        <p className="text-sm text-gray-400">Document preview unavailable.</p>
                    ) : cert.isImageFile ? (
                        <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                        >
                        <img
                            src={cert.documentUrl}
                            alt={cert.certificationTypeName}
                            className="max-h-80 rounded-lg border border-white/10 object-contain"
                        />
                        </a>
                    ) : cert.isPdfFile ? (
                        <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-white/10 p-4 hover:bg-white/5"
                        >
                        <p className="font-medium text-white">{cert.fileName}</p>
                        <p className="text-sm text-gray-400">Open PDF document</p>
                        </a>
                    ) : (
                        <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-white/10 p-4 hover:bg-white/5"
                        >
                        <p className="font-medium text-white">{cert.fileName}</p>
                        <p className="text-sm text-gray-400">Open uploaded document</p>
                        </a>
                    )}
                    </div>
                </div>
                ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Products</h2>

        {supplier.products.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            No published products yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {supplier.products.map((product) => (
              <div
                key={product.productId}
                className="rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <h3 className="text-base font-semibold text-white">
                  {product.productName}
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  {product.categoryName}
                </p>

                {product.description ? (
                  <p className="mt-3 text-sm text-gray-300">
                    {product.description}
                  </p>
                ) : null}

                <div className="mt-4 space-y-1 text-sm text-gray-300">
                  <p>
                    <span className="font-medium text-white">Price:</span> ₱
                    {product.pricePerUnit.toLocaleString()} / {product.unit}
                  </p>
                  <p>
                    <span className="font-medium text-white">MOQ:</span>{" "}
                    {product.moq}
                  </p>
                  <p>
                    <span className="font-medium text-white">Stock:</span>{" "}
                    {product.stockAvailable ?? "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-white">Lead Time:</span>{" "}
                    {product.leadTime ?? "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-white">Max Capacity:</span>{" "}
                    {product.maxCapacity ?? "Not provided"}
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/buyer/rfqs/new?supplierId=${supplier.supplierId}&productId=${product.productId}`}
                    className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                  >
                    Send Request
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
    </div>
  );
}