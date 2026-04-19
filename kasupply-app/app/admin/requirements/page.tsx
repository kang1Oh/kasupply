import { Suspense } from "react";
import Link from "next/link";
import {
  createSupplierRequirementTypeAction,
  deleteSupplierRequirementTypeAction,
  getAdminSupplierRequirementsPageData,
  saveSupplierRequirementRuleAction,
} from "@/app/admin/dashboard/actions";

function RequirementsPageFallback() {
  return <div>Loading supplier requirements...</div>;
}

async function RequirementsPageContent() {
  const data = await getAdminSupplierRequirementsPageData();
  const controlGridClassName =
    "grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,220px)_minmax(0,220px)_minmax(0,220px)_minmax(0,220px)] xl:items-start xl:gap-4";
  const toggleCardClassName =
    "flex min-h-[52px] items-center gap-2 rounded-xl border border-[#e6edf6] bg-white px-3 py-2 text-sm text-[#334155]";
  const orderFieldClassName =
    "space-y-1 text-xs font-medium text-[#64748b] xl:self-start";
  const orderInputClassName =
    "h-[52px] w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2 text-sm text-[#334155]";
  const textFieldClassName =
    "h-[52px] w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2 text-sm text-[#334155]";
  const textAreaClassName =
    "min-h-[96px] w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2 text-sm text-[#334155]";
  const fieldLabelClassName = "space-y-1 text-xs font-medium text-[#64748b]";
  const actionRowClassName =
    "mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,220px)_minmax(0,220px)_minmax(0,220px)_minmax(0,220px)] xl:gap-4";

  return (
    <main className="space-y-6">
      <section className="rounded-[24px] border border-[#e6edf6] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8698]">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[#223654]">
              Supplier Requirements
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#6b7280]">
              Control which business documents are required during supplier onboarding and which
              certification types remain available on supplier profiles.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="inline-flex rounded-lg border border-[#223654] px-4 py-2.5 text-sm font-semibold text-[#223654] transition hover:bg-[#f7f9fc]"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Onboarding Documents</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Documents come from `document_types`. By default they are active and required unless an
          admin rule overrides them here.
        </p>
        <p className="mt-1 text-xs text-[#9aa3b2]">
          You can add new document types here, rename existing ones, and delete unused ones. If a
          document type already has supplier submissions, keep it inactive instead of deleting it.
        </p>

        <form
          action={createSupplierRequirementTypeAction}
          className="mt-4 rounded-2xl border border-dashed border-[#d6deea] bg-[#f8fbff] p-4"
        >
          <input type="hidden" name="requirement_kind" value="document" />

          <div className={controlGridClassName}>
            <div className="space-y-3 xl:pr-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8698]">
                  Add Document Requirement
                </p>
                <label className={`${fieldLabelClassName} mt-3 block`}>
                  <span>Document name</span>
                  <input
                    type="text"
                    name="label"
                    required
                    placeholder="Example: FDA LTO Certificate"
                    className={textFieldClassName}
                  />
                </label>
              </div>
              <p className="text-sm text-[#8b95a5]">
                New document types become available in supplier onboarding as soon as you save them.
              </p>
            </div>

            <label className={toggleCardClassName}>
              <input type="checkbox" name="is_required" defaultChecked />
              Required
            </label>
            <label className={toggleCardClassName}>
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>
            <label className={toggleCardClassName}>
              <input type="checkbox" name="show_in_onboarding" defaultChecked />
              Show in onboarding
            </label>
            <label className={orderFieldClassName}>
              <span>Display order</span>
              <input type="number" name="display_order" defaultValue={data.documents.length} className={orderInputClassName} />
            </label>
          </div>

          <div className={actionRowClassName}>
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42] xl:w-auto"
            >
              Add document rule
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-4">
          {data.documents.map((requirement) => (
            <form
              key={requirement.docTypeId}
              action={saveSupplierRequirementRuleAction}
              className="rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4"
            >
              <input type="hidden" name="requirement_kind" value="document" />
              <input type="hidden" name="doc_type_id" value={requirement.docTypeId} />

              <div className={controlGridClassName}>
                <div className="space-y-3 xl:pr-4">
                  <label className={fieldLabelClassName}>
                    <span>Document name</span>
                    <input
                      type="text"
                      name="label"
                      defaultValue={requirement.label}
                      required
                      className={textFieldClassName}
                    />
                  </label>
                  <p className="mt-1 text-sm text-[#8b95a5]">
                    Used in supplier onboarding document submission.
                  </p>
                </div>

                <label className={toggleCardClassName}>
                  <input type="checkbox" name="is_required" defaultChecked={requirement.isRequired} />
                  Required
                </label>
                <label className={toggleCardClassName}>
                  <input type="checkbox" name="is_active" defaultChecked={requirement.isActive} />
                  Active
                </label>
                <label className={toggleCardClassName}>
                  <input
                    type="checkbox"
                    name="show_in_onboarding"
                    defaultChecked={requirement.showInOnboarding}
                  />
                  Show in onboarding
                </label>
                <label className={orderFieldClassName}>
                  <span>Display order</span>
                  <input
                    type="number"
                    name="display_order"
                    defaultValue={requirement.displayOrder}
                    className={orderInputClassName}
                  />
                </label>
              </div>

              <div className={actionRowClassName}>
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
                  >
                    Save document
                  </button>
                  <button
                    type="submit"
                    formAction={deleteSupplierRequirementTypeAction}
                    formNoValidate
                    className="w-full rounded-lg border border-[#e7ccd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#8a2741] transition hover:bg-[#fff5f7]"
                  >
                    Delete document
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-semibold text-[#223654]">Optional Certifications</h2>
        <p className="mt-1 text-sm text-[#8b95a5]">
          Certifications come from `certification_types` and are treated as optional supplier
          profile submissions rather than onboarding requirements.
        </p>
        <p className="mt-1 text-xs text-[#9aa3b2]">
          Use this section to add new optional certification types, edit their labels and
          descriptions, or remove unused ones before suppliers start uploading them.
        </p>

        <form
          action={createSupplierRequirementTypeAction}
          className="mt-4 rounded-2xl border border-dashed border-[#d6deea] bg-[#f8fbff] p-4"
        >
          <input type="hidden" name="requirement_kind" value="certification" />

          <div className={controlGridClassName}>
            <div className="space-y-3 xl:pr-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8698]">
                  Add Certification Requirement
                </p>
                <label className={`${fieldLabelClassName} mt-3 block`}>
                  <span>Certification name</span>
                  <input
                    type="text"
                    name="label"
                    required
                    placeholder="Example: HACCP"
                    className={textFieldClassName}
                  />
                </label>
              </div>
              <label className={fieldLabelClassName}>
                <span>Description</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Short guidance for suppliers about this certification."
                  className={textAreaClassName}
                />
              </label>
            </div>

            <label className={toggleCardClassName}>
              <input type="checkbox" checked readOnly disabled />
              Optional
            </label>
            <label className={toggleCardClassName}>
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>
            <label className={toggleCardClassName}>
              <input type="checkbox" name="allow_post_onboarding_submission" defaultChecked />
              Allow supplier uploads
            </label>
            <label className={orderFieldClassName}>
              <span>Display order</span>
              <input
                type="number"
                name="display_order"
                defaultValue={data.certifications.length}
                className={orderInputClassName}
              />
            </label>
          </div>

          <div className={actionRowClassName}>
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <div className="hidden xl:block" />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42] xl:w-auto"
            >
              Add certification rule
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-4">
          {data.certifications.map((requirement) => (
            <form
              key={requirement.certTypeId}
              action={saveSupplierRequirementRuleAction}
              className="rounded-2xl border border-[#edf2f7] bg-[#fbfcfe] p-4"
            >
              <input type="hidden" name="requirement_kind" value="certification" />
              <input type="hidden" name="cert_type_id" value={requirement.certTypeId} />

              <div className={controlGridClassName}>
                <div className="space-y-3 xl:pr-4">
                  <label className={fieldLabelClassName}>
                    <span>Certification name</span>
                    <input
                      type="text"
                      name="label"
                      defaultValue={requirement.label}
                      required
                      className={textFieldClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    <span>Description</span>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={requirement.description || ""}
                      placeholder="Optional certification available for supplier profiles."
                      className={textAreaClassName}
                    />
                  </label>
                </div>

                <label className={toggleCardClassName}>
                  <input type="checkbox" name="is_required" defaultChecked={false} disabled />
                  Optional
                </label>
                <label className={toggleCardClassName}>
                  <input type="checkbox" name="is_active" defaultChecked={requirement.isActive} />
                  Active
                </label>
                <label className={toggleCardClassName}>
                  <input
                    type="checkbox"
                    name="allow_post_onboarding_submission"
                    defaultChecked={requirement.allowPostOnboardingSubmission}
                  />
                  Allow supplier uploads
                </label>
                <label className={orderFieldClassName}>
                  <span>Display order</span>
                  <input
                    type="number"
                    name="display_order"
                    defaultValue={requirement.displayOrder}
                    className={orderInputClassName}
                  />
                </label>
              </div>

              <div className={actionRowClassName}>
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="hidden xl:block" />
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#223654] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a42]"
                  >
                    Save certification
                  </button>
                  <button
                    type="submit"
                    formAction={deleteSupplierRequirementTypeAction}
                    formNoValidate
                    className="w-full rounded-lg border border-[#e7ccd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#8a2741] transition hover:bg-[#fff5f7]"
                  >
                    Delete certification
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function AdminRequirementsPage() {
  return (
    <Suspense fallback={<RequirementsPageFallback />}>
      <RequirementsPageContent />
    </Suspense>
  );
}
