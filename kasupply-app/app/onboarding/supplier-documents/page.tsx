import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { uploadSupplierDocument } from "./actions";

type DocumentTypeRow = {
  doc_type_id: number;
  document_type_name: string;
};

type UploadedDocumentRow = {
  doc_id: number;
  doc_type_id: number;
  status: string | null;
};

const REQUIRED_DOCUMENT_NAMES = [
  "DTI Business Registration Certificate",
  "Mayor's Permit",
  "FDA Certificate",
];

export default async function SupplierDocumentsPage() {
  const status = await getUserOnboardingStatus();

  if (!status.authenticated) {
    redirect("/auth/login");
  }

  if (!status.hasBusinessProfile) {
    redirect("/onboarding");
  }

  if (status.role !== "supplier") {
    redirect("/dashboard");
  }

  if (status.hasSubmittedRequiredSupplierDocuments && !status.hasSubmittedSiteVideo) {
    redirect("/onboarding/supplier-site-video");
  }

  if (status.hasSubmittedRequiredSupplierDocuments && status.hasSubmittedSiteVideo) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: documentTypes, error: documentTypesError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .order("document_type_name", { ascending: true });

  if (documentTypesError) {
    throw new Error(documentTypesError.message || "Failed to load document types.");
  }

  const businessProfileId = status.businessProfile?.profile_id;

  if (!businessProfileId) {
    redirect("/onboarding");
  }

  const { data: uploadedDocuments, error: uploadedDocumentsError } = await supabase
    .from("business_documents")
    .select("doc_id, doc_type_id, status")
    .eq("profile_id", businessProfileId);

  if (uploadedDocumentsError) {
    throw new Error(uploadedDocumentsError.message || "Failed to load uploaded documents.");
  }

  const safeDocumentTypes = (documentTypes as DocumentTypeRow[] | null) ?? [];
  const safeUploadedDocuments = (uploadedDocuments as UploadedDocumentRow[] | null) ?? [];

  const uploadedMap = new Map<number, UploadedDocumentRow>();
  for (const doc of safeUploadedDocuments) {
    uploadedMap.set(doc.doc_type_id, doc);
  }

  const requiredDocumentTypes = safeDocumentTypes.filter((docType) =>
    REQUIRED_DOCUMENT_NAMES.includes(docType.document_type_name)
  );

  const optionalDocumentTypes = safeDocumentTypes.filter(
    (docType) => !REQUIRED_DOCUMENT_NAMES.includes(docType.document_type_name)
  );

  return (
    <div className="flex min-h-svh items-center justify-center p-6 md:p-10 bg-gray-50">
      <div className="w-full max-w-4xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Supplier Document Submission</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload the required business documents to continue supplier verification.
        </p>

        <section className="mt-6 rounded-lg border bg-gray-50 p-4">
          <h2 className="font-semibold">Required Documents</h2>
          <div className="mt-3 space-y-3">
            {requiredDocumentTypes.map((docType) => {
              const uploaded = uploadedMap.get(docType.doc_type_id);

              return (
                <div
                  key={docType.doc_type_id}
                  className="rounded-lg border bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{docType.document_type_name}</p>
                      <p className="text-sm text-gray-500">
                        Status: {uploaded?.status ?? "not uploaded"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        uploaded
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {uploaded ? "Uploaded" : "Required"}
                    </span>
                  </div>

                  <form action={uploadSupplierDocument} className="flex flex-col gap-3 md:flex-row md:items-end">
                    <input type="hidden" name="doc_type_id" value={docType.doc_type_id} />

                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">Choose file</label>
                      <input
                        name="document"
                        type="file"
                        required
                        className="w-full rounded border px-3 py-2"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded bg-black px-4 py-2 text-white"
                    >
                      {uploaded ? "Replace File" : "Upload"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-lg border bg-gray-50 p-4">
          <h2 className="font-semibold">Optional Documents</h2>
          <p className="mt-1 text-sm text-gray-500">
            These documents are optional during onboarding.
          </p>

          {optionalDocumentTypes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No optional document types found.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {optionalDocumentTypes.map((docType) => {
                const uploaded = uploadedMap.get(docType.doc_type_id);

                return (
                  <div
                    key={docType.doc_type_id}
                    className="rounded-lg border bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{docType.document_type_name}</p>
                        <p className="text-sm text-gray-500">
                          Status: {uploaded?.status ?? "not uploaded"}
                        </p>
                      </div>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        Optional
                      </span>
                    </div>

                    <form action={uploadSupplierDocument} className="flex flex-col gap-3 md:flex-row md:items-end">
                      <input type="hidden" name="doc_type_id" value={docType.doc_type_id} />

                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium">Choose file</label>
                        <input
                          name="document"
                          type="file"
                          required
                          className="w-full rounded border px-3 py-2"
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded border px-4 py-2"
                      >
                        {uploaded ? "Replace File" : "Upload"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-lg border bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-900">Progress</h2>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            {status.requiredDocumentsChecklist.map((doc) => (
              <li key={doc.name}>
                {doc.uploaded ? "✅" : "⬜"} {doc.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}