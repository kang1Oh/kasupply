import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SupplierRequirementRuleRow = {
  requirement_id: number;
  requirement_kind: string;
  doc_type_id: number | null;
  cert_type_id: number | null;
  is_required: boolean;
  is_active: boolean;
  show_in_onboarding: boolean;
  allow_post_onboarding_submission: boolean;
  display_order: number;
};

type DocumentTypeRow = {
  doc_type_id: number;
  document_type_name: string;
};

type CertificationTypeRow = {
  cert_type_id: number;
  certification_type_name: string;
  description: string | null;
};

export type SupplierDocumentRequirement = {
  requirementId: number | null;
  docTypeId: number;
  label: string;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  showInOnboarding: boolean;
  allowPostOnboardingSubmission: boolean;
  displayOrder: number;
};

export type SupplierCertificationRequirement = {
  requirementId: number | null;
  certTypeId: number;
  label: string;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  showInOnboarding: boolean;
  allowPostOnboardingSubmission: boolean;
  displayOrder: number;
};

function sortByOrderThenLabel<T extends { displayOrder: number; label: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    return left.label.localeCompare(right.label);
  });
}

export async function getSupplierDocumentRequirements(
  supabase: SupabaseServerClient
): Promise<SupplierDocumentRequirement[]> {
  const [documentTypesResult, rulesResult] = await Promise.all([
    supabase
      .from("document_types")
      .select("doc_type_id, document_type_name")
      .order("document_type_name", { ascending: true }),
    supabase
      .from("supplier_requirement_rules")
      .select(
        "requirement_id, requirement_kind, doc_type_id, cert_type_id, is_required, is_active, show_in_onboarding, allow_post_onboarding_submission, display_order"
      )
      .eq("requirement_kind", "document"),
  ]);

  if (documentTypesResult.error) {
    throw new Error(documentTypesResult.error.message || "Failed to load document types.");
  }

  if (rulesResult.error) {
    throw new Error(rulesResult.error.message || "Failed to load supplier document rules.");
  }

  const documentTypes = (documentTypesResult.data as DocumentTypeRow[] | null) ?? [];
  const rules = (rulesResult.data as SupplierRequirementRuleRow[] | null) ?? [];
  const ruleByDocTypeId = new Map<number, SupplierRequirementRuleRow>();

  for (const rule of rules) {
    if (rule.doc_type_id) {
      ruleByDocTypeId.set(rule.doc_type_id, rule);
    }
  }

  return sortByOrderThenLabel(
    documentTypes.map((documentType, index) => {
      const rule = ruleByDocTypeId.get(documentType.doc_type_id) ?? null;

      return {
        requirementId: rule?.requirement_id ?? null,
        docTypeId: documentType.doc_type_id,
        label: documentType.document_type_name,
        description: null,
        isRequired: rule?.is_required ?? true,
        isActive: rule?.is_active ?? true,
        showInOnboarding: rule?.show_in_onboarding ?? true,
        allowPostOnboardingSubmission: rule?.allow_post_onboarding_submission ?? false,
        displayOrder: rule?.display_order ?? index,
      };
    })
  );
}

export async function getSupplierCertificationRequirements(
  supabase: SupabaseServerClient
): Promise<SupplierCertificationRequirement[]> {
  const [certificationTypesResult, rulesResult] = await Promise.all([
    supabase
      .from("certification_types")
      .select("cert_type_id, certification_type_name, description")
      .order("certification_type_name", { ascending: true }),
    supabase
      .from("supplier_requirement_rules")
      .select(
        "requirement_id, requirement_kind, doc_type_id, cert_type_id, is_required, is_active, show_in_onboarding, allow_post_onboarding_submission, display_order"
      )
      .eq("requirement_kind", "certification"),
  ]);

  if (certificationTypesResult.error) {
    throw new Error(
      certificationTypesResult.error.message || "Failed to load certification types."
    );
  }

  if (rulesResult.error) {
    throw new Error(rulesResult.error.message || "Failed to load supplier certification rules.");
  }

  const certificationTypes =
    (certificationTypesResult.data as CertificationTypeRow[] | null) ?? [];
  const rules = (rulesResult.data as SupplierRequirementRuleRow[] | null) ?? [];
  const ruleByCertTypeId = new Map<number, SupplierRequirementRuleRow>();

  for (const rule of rules) {
    if (rule.cert_type_id) {
      ruleByCertTypeId.set(rule.cert_type_id, rule);
    }
  }

  return sortByOrderThenLabel(
    certificationTypes.map((certificationType, index) => {
      const rule = ruleByCertTypeId.get(certificationType.cert_type_id) ?? null;

      return {
        requirementId: rule?.requirement_id ?? null,
        certTypeId: certificationType.cert_type_id,
        label: certificationType.certification_type_name,
        description: certificationType.description?.trim() || null,
        isRequired: rule?.is_required ?? false,
        isActive: rule?.is_active ?? true,
        showInOnboarding: rule?.show_in_onboarding ?? false,
        allowPostOnboardingSubmission: rule?.allow_post_onboarding_submission ?? true,
        displayOrder: rule?.display_order ?? index,
      };
    })
  );
}
