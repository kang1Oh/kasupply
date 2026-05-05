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
    label: "DTI Business Name Registration Certificate",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "business_territory", label: "Business territory", required: true },
      { key: "owner_name", label: "Owner's name", required: true },
      { key: "business_name_no", label: "Certificate No./BNN", required: true },
      {
        key: "registration_date",
        label: "Transaction/Registration date",
        required: true,
      },
      { key: "status", label: "Status", required: true },
      { key: "scope_or_location", label: "Business scope", required: true },
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
          "Business name, business territory, owner's name, certificate number, registration date, status, and business scope should align between the QR or BNRS data and the visible document text when available.",
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
    label: "DTI Business Name Registration Certificate",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "business_territory", label: "Business territory", required: true },
      { key: "owner_name", label: "Owner's name", required: true },
      { key: "business_name_no", label: "Certificate No./BNN", required: true },
      {
        key: "registration_date",
        label: "Transaction/Registration date",
        required: true,
      },
      { key: "status", label: "Status", required: true },
      { key: "scope_or_location", label: "Business scope", required: true },
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
          "Business name, business territory, owner's name, certificate number, registration date, status, and business scope should align between the QR or BNRS data and the visible document text when available.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "dti business name registration certificate": {
    code: "dti",
    label: "DTI Business Name Registration Certificate",
    requiredFields: [
      { key: "business_name", label: "Business name", required: true },
      { key: "business_territory", label: "Business territory", required: true },
      { key: "owner_name", label: "Owner's name", required: true },
      { key: "business_name_no", label: "Certificate No./BNN", required: true },
      {
        key: "registration_date",
        label: "Transaction/Registration date",
        required: true,
      },
      { key: "status", label: "Status", required: true },
      { key: "scope_or_location", label: "Business scope", required: true },
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
          "Business name, business territory, owner's name, certificate number, registration date, status, and business scope should align between the QR or BNRS data and the visible document text when available.",
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
      { key: "permit_date", label: "Permit Issued", required: true },
      { key: "validity_period", label: "Valid Until", required: true },
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
          "The Permit Issued date and Valid Until date should indicate that the permit is current for the relevant year.",
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
      { key: "business_name", label: "Trade Name", required: true },
      { key: "taxpayer_name", label: "Name of Taxpayer", required: true },
      { key: "tin", label: "TIN", required: true },
      { key: "business_address", label: "Registered Address", required: true },
      { key: "tax_type", label: "Tax Type/s table", required: true },
      {
        key: "document_revision",
        label: "BIR Form 2303 Revised-April 2019",
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
        key: "taxpayer_name_present",
        label: "Taxpayer name present",
        description:
          "The certificate should clearly show the Name of Taxpayer field.",
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
          "The certificate should show a Tax Type/s table with one or more rows and columns for Tax Types, Form Types, Filing Start Date, Filing Frequency, and Filing Due Date.",
      },
      {
        key: "bir_form_revision_present",
        label: "BIR form revision present",
        description:
          "The top-left section should show BIR Form 2303 Revised-April 2019 or an equally clear certificate revision marker.",
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
      { key: "business_name", label: "Trade Name", required: true },
      { key: "taxpayer_name", label: "Name of Taxpayer", required: true },
      { key: "tin", label: "TIN", required: true },
      { key: "business_address", label: "Registered Address", required: true },
      { key: "tax_type", label: "Tax Type/s table", required: true },
      {
        key: "document_revision",
        label: "BIR Form 2303 Revised-April 2019",
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
        key: "taxpayer_name_present",
        label: "Taxpayer name present",
        description:
          "The certificate should clearly show the Name of Taxpayer field.",
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
          "The certificate should show a Tax Type/s table with one or more rows and columns for Tax Types, Form Types, Filing Start Date, Filing Frequency, and Filing Due Date.",
      },
      {
        key: "bir_form_revision_present",
        label: "BIR form revision present",
        description:
          "The top-left section should show BIR Form 2303 Revised-April 2019 or an equally clear certificate revision marker.",
      },
      {
        key: "tamper_screen",
        label: "Tamper screen",
        description:
          "The layout, font consistency, and text alignment should not show obvious signs of editing.",
      },
    ],
  },
  "fda license to operate certificate": {
    code: "fda_lto",
    label: "FDA License to Operate Certificate",
    requiredFields: [
      {
        key: "licensed_activity",
        label: "Business Type shown after 'LICENSE TO OPERATE as'",
        required: true,
      },
      { key: "business_name", label: "Business name", required: true },
      { key: "business_address", label: "Business address", required: true },
      { key: "owner_name", label: "Owner", required: true },
      { key: "license_number", label: "License number", required: true },
      { key: "application_type", label: "Application Type", required: true },
      { key: "issuance_date", label: "Issuance Date", required: true },
      { key: "validity_date", label: "Validity of License", required: true },
    ],
    checks: [
      {
        key: "name_matches_dti",
        label: "Business name matches DTI",
        description:
          "The establishment or business name should align with the approved DTI registration on file.",
      },
      {
        key: "address_matches_profile",
        label: "Address matches onboarding profile",
        description:
          "The FDA address should align with the submitted onboarding address.",
      },
      {
        key: "license_number_present",
        label: "License number present",
        description: "The FDA license number should be clearly visible and extractable.",
      },
      {
        key: "owner_name_present",
        label: "Owner present",
        description: "The certificate should clearly show the Owner field.",
      },
      {
        key: "application_type_present",
        label: "Application type present",
        description: "The certificate should clearly show the Application Type field.",
      },
      {
        key: "issuance_date_present",
        label: "Issuance date present",
        description: "The certificate should show a readable Issuance Date.",
      },
      {
        key: "licensed_activity_present",
        label: "Licensed activity present",
        description:
          "The license should clearly show the unlabeled business type immediately after 'LICENSE TO OPERATE as' and before the granted business name and address.",
      },
      {
        key: "validity_date_present",
        label: "Validity date present",
        description: "The license should show a readable validity or expiry date.",
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
