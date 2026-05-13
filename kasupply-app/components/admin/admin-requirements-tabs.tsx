"use client";

import { useState } from "react";
import type { AdminSupplierRequirementsPageData } from "@/app/admin/dashboard/actions";
import {
  createSupplierRequirementTypeAction,
  deleteSupplierRequirementTypeAction,
  saveSupplierRequirementRuleAction,
} from "@/app/admin/dashboard/actions";

type AdminRequirementsTabsProps = {
  data: AdminSupplierRequirementsPageData;
};

type TabKey = "documents" | "certifications";

export function AdminRequirementsTabs({ data }: AdminRequirementsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("documents");

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
    <section className="rounded-[22px] border border-[#e6edf6] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-[#edf2f7] pb-4">

        <div className="flex flex-wrap gap-2">
          {[
            {
              key: "documents" as const,
              label: "Onboarding Documents",
              count: data.documents.length,
            },
            {
              key: "certifications" as const,
              label: "Optional Certifications",
              count: data.certifications.length,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#223654] bg-[#223654] text-white"
                    : "border-[#d6deea] bg-white text-[#516074] hover:border-[#bfd0e6] hover:bg-[#f8fbff]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${
                    isActive ? "bg-white/15 text-white" : "bg-[#eef2f7] text-[#64748b]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "documents" ? (
        <div className="mt-5">
          <h3 className="text-lg font-semibold text-[#223654]">Onboarding Documents</h3>
          <p className="mt-1 text-sm text-[#8b95a5]">
            You can add new document types here, rename existing ones, and delete unused ones. If
            a document type already has supplier submissions, keep it inactive instead of deleting
            it.
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
                  New document types become available in supplier onboarding as soon as you save
                  them.
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
                <input
                  type="number"
                  name="display_order"
                  defaultValue={data.documents.length}
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
                    <input
                      type="checkbox"
                      name="is_required"
                      defaultChecked={requirement.isRequired}
                    />
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
        </div>
      ) : null}

      {activeTab === "certifications" ? (
        <div className="mt-5">
          <h3 className="text-lg font-semibold text-[#223654]">Optional Certifications</h3>
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
        </div>
      ) : null}
    </section>
  );
}
