import type { DocumentVerificationBlueprint } from "@/lib/verification/types";

const BUYER_DTI_DOCUMENT_TYPE_ALIASES = [
  "dti business registration certificate",
  "dti certificate",
  "dti business registration",
  "dti registration certificate",
];

const DOCUMENT_BLUEPRINTS: Record<string, DocumentVerificationBlueprint> = {
  "dti business registration certificate": {
    code: "dti",
    label: "DTI Business Registration Certificate",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "owner_name", label: "Business owner name", required: true },
      { key: "owner_number", label: "Business owner number", required: true },
      { key: "scope_or_location", label: "Scope or location", required: true },
      { key: "validity_date", label: "Validity date", required: true },
    ],
    checks: [
      {
        key: "ocr_readability",
        label: "OCR readability",
        description: "The document text should be readable enough for field extraction.",
      },
      {
        key: "qr_present",
        label: "QR present",
        description: "The document should contain a readable QR code.",
      },
      {
        key: "qr_matches_visible_text",
        label: "QR matches visible text",
        description:
          "Business name, owner name, scope or location, and validity date should align between the QR payload and the visible document text.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "dti certificate": {
    code: "dti",
    label: "DTI Business Registration Certificate",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "owner_name", label: "Business owner name", required: true },
      { key: "owner_number", label: "Business owner number", required: true },
      { key: "scope_or_location", label: "Scope or location", required: true },
      { key: "validity_date", label: "Validity date", required: true },
    ],
    checks: [
      {
        key: "ocr_readability",
        label: "OCR readability",
        description: "The document text should be readable enough for field extraction.",
      },
      {
        key: "qr_present",
        label: "QR present",
        description: "The document should contain a readable QR code.",
      },
      {
        key: "qr_matches_visible_text",
        label: "QR matches visible text",
        description:
          "Business name, owner name, scope or location, and validity date should align between the QR payload and the visible document text.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "mayor's permit": {
    code: "mayors_permit",
    label: "Mayor's Permit",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "business_address", label: "Business address", required: true },
      { key: "permit_number", label: "Permit number", required: true },
      { key: "permit_date", label: "Permit date", required: true },
      { key: "validity_period", label: "Validity period", required: true },
    ],
    checks: [
      {
        key: "name_matches_dti",
        label: "Business name matches DTI",
        description:
          "The business or corporate name should align with the DTI registration already on file.",
      },
      {
        key: "address_matches_profile",
        label: "Address matches onboarding profile",
        description:
          "The permit address should align with the supplier onboarding address and the DTI document.",
      },
      {
        key: "calendar_year_validity",
        label: "Calendar-year validity",
        description:
          "The permit date and validity period should indicate that the permit is current for the relevant year.",
      },
      {
        key: "official_marks_present",
        label: "Official marks present",
        description:
          "The permit should show the city logo, Mayor's Office logo, and a Mayor or authorized officer signature.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "bir certificate": {
    code: "bir_certificate",
    label: "BIR Certificate of Registration",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "tin", label: "TIN", required: true },
      { key: "business_address", label: "Business address", required: true },
      { key: "tax_type", label: "Tax type", required: true },
      {
        key: "registered_business_activities",
        label: "Registered business activities",
        required: true,
      },
    ],
    checks: [
      {
        key: "name_matches_registration",
        label: "Business name matches registration records",
        description:
          "The BIR certificate name should align with the DTI, SEC, or CDA registration available on file.",
      },
      {
        key: "address_matches_profile",
        label: "Address matches onboarding profile",
        description:
          "The BIR certificate address should align with the submitted onboarding address.",
      },
      {
        key: "tin_present",
        label: "TIN present",
        description: "A TIN should be visible and extractable from the document.",
      },
      {
        key: "tax_profile_present",
        label: "Tax profile present",
        description:
          "The certificate should clearly show whether the business is VAT or non-VAT and list the registered activities.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "bir certificate of registration": {
    code: "bir_certificate",
    label: "BIR Certificate of Registration",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "tin", label: "TIN", required: true },
      { key: "business_address", label: "Business address", required: true },
      { key: "tax_type", label: "Tax type", required: true },
      {
        key: "registered_business_activities",
        label: "Registered business activities",
        required: true,
      },
    ],
    checks: [
      {
        key: "name_matches_registration",
        label: "Business name matches registration records",
        description:
          "The BIR certificate name should align with the DTI, SEC, or CDA registration available on file.",
      },
      {
        key: "address_matches_profile",
        label: "Address matches onboarding profile",
        description:
          "The BIR certificate address should align with the submitted onboarding address.",
      },
      {
        key: "tin_present",
        label: "TIN present",
        description: "A TIN should be visible and extractable from the document.",
      },
      {
        key: "tax_profile_present",
        label: "Tax profile present",
        description:
          "The certificate should clearly show whether the business is VAT or non-VAT and list the registered activities.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
};

export function normalizeDocumentTypeName(value: string) {
  return value.trim().toLowerCase();
}

export function getDocumentVerificationBlueprint(documentTypeName: string) {
  return DOCUMENT_BLUEPRINTS[normalizeDocumentTypeName(documentTypeName)] ?? null;
}

export function getBuyerDtiDocumentTypeMatchScore(documentTypeName: string) {
  const normalized = normalizeDocumentTypeName(documentTypeName);

  if (!normalized) {
    return 0;
  }

  if (BUYER_DTI_DOCUMENT_TYPE_ALIASES.includes(normalized)) {
    return 3;
  }

  if (getDocumentVerificationBlueprint(documentTypeName)?.code === "dti") {
    return 2;
  }

  if (normalized.includes("dti")) {
    return 1;
  }

  return 0;
}

export function isBuyerDtiDocumentTypeName(documentTypeName: string) {
  return getBuyerDtiDocumentTypeMatchScore(documentTypeName) > 0;
}

export function getAllDocumentVerificationBlueprints() {
  return Object.values(DOCUMENT_BLUEPRINTS);
}
