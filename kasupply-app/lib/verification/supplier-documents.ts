import { runBuyerDtiLiveVerification } from "@/lib/verification/buyer-dti";
import { detectDocumentTestMode } from "@/lib/verification/document-test-mode";
import { getDocumentVerificationBlueprint } from "@/lib/verification/document-rules";
import { generateGeminiStructuredOutput } from "@/lib/verification/gemini";
import { downloadVerificationStorageObject } from "@/lib/verification/storage";
import { extractDocumentTextWithVision } from "@/lib/verification/vision";
import type { DocumentVerificationSummary } from "@/lib/verification/types";

type SupplierBusinessContext = {
  businessName: string | null;
  businessLocation: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
};

type SupplierDtiAnchor = {
  docId: number;
  extractedFields: Record<string, unknown>;
  verificationAnalysis: Record<string, unknown> | null;
};

type SupplierGeminiResponse = {
  extracted_fields?: Record<string, unknown>;
  checks?: Record<string, string>;
  tamper_risk?: string;
  confidence_score?: number;
  notes?: string[];
};

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeStatusValue(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "pass" || normalized === "fail" || normalized === "uncertain") {
    return normalized;
  }

  return "uncertain";
}

function looselyMatchesText(left: unknown, right: unknown) {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function buildProfileAddressLabel(context: SupplierBusinessContext) {
  return [
    context.businessLocation,
    context.city,
    context.province,
    context.region,
  ]
    .filter(Boolean)
    .join(", ");
}

function looksLikeNationalScope(value: unknown) {
  const normalized = normalizeComparableText(value);
  return normalized === "national" || normalized.includes("national");
}

function resolvePresenceStatus(value: unknown) {
  return normalizeComparableText(value).length > 0 ? "pass" : "fail";
}

function resolveMatchStatus(left: unknown, right: unknown) {
  return looselyMatchesText(left, right) ? "pass" : "fail";
}

function resolveAddressStatus(address: unknown, context: SupplierBusinessContext) {
  const profileAddress = buildProfileAddressLabel(context);

  if (!normalizeComparableText(address) || !normalizeComparableText(profileAddress)) {
    return "fail";
  }

  return looselyMatchesText(address, profileAddress) ? "pass" : "fail";
}

function toCheckMap(value: Record<string, unknown> | undefined) {
  return Object.entries(value ?? {}).reduce<Record<string, string>>((result, [key, entry]) => {
    result[key] = normalizeStatusValue(entry);
    return result;
  }, {});
}

function buildSupplierSchema(fieldKeys: string[], checkKeys: string[]) {
  return {
    type: "object",
    properties: {
      extracted_fields: {
        type: "object",
        properties: fieldKeys.reduce<Record<string, unknown>>((result, key) => {
          result[key] = { type: "string" };
          return result;
        }, {}),
        additionalProperties: true,
      },
      checks: {
        type: "object",
        properties: checkKeys.reduce<Record<string, unknown>>((result, key) => {
          result[key] = { type: "string" };
          return result;
        }, {}),
        additionalProperties: true,
      },
      tamper_risk: { type: "string" },
      confidence_score: { type: "number" },
      notes: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["extracted_fields", "checks", "tamper_risk", "confidence_score", "notes"],
    additionalProperties: false,
  } satisfies Record<string, unknown>;
}

function buildDtiAnchorText(anchor: SupplierDtiAnchor | null) {
  if (!anchor) {
    return "No approved DTI anchor document is available yet.";
  }

  const authorityFields = (() => {
    const rawAuthority =
      anchor.verificationAnalysis &&
      typeof anchor.verificationAnalysis === "object" &&
      "authority" in anchor.verificationAnalysis
        ? anchor.verificationAnalysis.authority
        : null;

    if (!rawAuthority || typeof rawAuthority !== "object") {
      return null;
    }

    return "fields" in rawAuthority &&
      rawAuthority.fields &&
      typeof rawAuthority.fields === "object"
      ? (rawAuthority.fields as Record<string, unknown>)
      : null;
  })();

  return [
    `Approved DTI document id: ${anchor.docId}`,
    `DTI business name: ${String(anchor.extractedFields.business_name ?? "")}`,
    `DTI business territory: ${String(anchor.extractedFields.business_territory ?? "")}`,
    `DTI owner name: ${String(anchor.extractedFields.owner_name ?? "")}`,
    `DTI certificate no./BNN: ${String(anchor.extractedFields.business_name_no ?? "")}`,
    `DTI transaction/registration date: ${String(anchor.extractedFields.registration_date ?? "")}`,
    `DTI status: ${String(anchor.extractedFields.status ?? "")}`,
    `DTI business scope: ${String(anchor.extractedFields.scope_or_location ?? "")}`,
    `DTI authority status: ${String(authorityFields?.status ?? "")}`,
    `DTI authority business territory: ${String(authorityFields?.business_territory ?? "")}`,
  ].join("\n");
}

function buildSupplierDocumentPrompt(params: {
  documentTypeLabel: string;
  requiredFieldLabels: string[];
  checkDescriptions: Array<{ key: string; description: string }>;
  ocrText: string;
  businessContext: SupplierBusinessContext;
  dtiAnchor: SupplierDtiAnchor | null;
  testMode: boolean;
}) {
  const businessContextText = [
    `Onboarding business name: ${params.businessContext.businessName ?? ""}`,
    `Onboarding business location: ${params.businessContext.businessLocation ?? ""}`,
    `Onboarding city: ${params.businessContext.city ?? ""}`,
    `Onboarding province: ${params.businessContext.province ?? ""}`,
    `Onboarding region: ${params.businessContext.region ?? ""}`,
  ].join("\n");

  return [
    `You are verifying a Philippine ${params.documentTypeLabel} for automated supplier onboarding.`,
    "This flow is binary. Use pass only when the evidence is clear and reliable.",
    "Use fail when the evidence clearly contradicts the requirement or a required detail is missing.",
    "Use uncertain when the evidence is blurry, cropped, ambiguous, or unreadable.",
    ...(params.testMode
      ? [
          "The uploaded file explicitly declares itself as a mock document for local testing.",
          "In test mode, focus on content extraction and cross-document consistency only.",
          "Ignore tamper-only concerns and do not fail the document solely for missing seals, logos, signatures, or other official-format cues.",
        ]
      : []),
    "Extract the visible document fields conservatively.",
    "Assess whether the document appears authentic, untampered, and consistent with the onboarding profile and approved DTI anchor.",
    "If the approved DTI anchor is unavailable, any DTI cross-check dependent check should be fail.",
    "Do not treat a DTI scope value like NATIONAL as a contradiction with a specific operating address.",
    `Required visible fields to extract: ${params.requiredFieldLabels.join(", ") || "none"}.`,
    "Verification checks to assess:",
    ...params.checkDescriptions.map((check) => `- ${check.key}: ${check.description}`),
    "",
    "Visible OCR text:",
    params.ocrText || "[empty]",
    "",
    "Approved DTI anchor:",
    buildDtiAnchorText(params.dtiAnchor),
    "",
    "Onboarding business context:",
    businessContextText,
  ].join("\n");
}

function buildRejectedSummary(params: {
  failedChecks: string[];
  extractedFields?: Record<string, unknown>;
  notes: string[];
  score?: number | null;
}) {
  return {
    status: "rejected",
    score: params.score ?? null,
    manualReviewRequired: false,
    extractedFields: params.extractedFields ?? {},
    failedChecks: params.failedChecks,
    passedChecks: [],
    notes: params.notes,
  } satisfies DocumentVerificationSummary;
}

function finalizeBinarySummary(params: {
  extractedFields: Record<string, unknown>;
  checks: Record<string, string>;
  notes: string[];
  confidenceScore: number;
  testMode: boolean;
}) {
  const failedChecks = Object.entries(params.checks)
    .filter(([, status]) => status !== "pass")
    .map(([key]) => key);
  const passedChecks = Object.entries(params.checks)
    .filter(([, status]) => status === "pass")
    .map(([key]) => key);
  const approved =
    failedChecks.length === 0 && (params.testMode || params.confidenceScore >= 75);

  return {
    status: approved ? "approved" : "rejected",
    score: Number.isFinite(params.confidenceScore) ? params.confidenceScore : null,
    manualReviewRequired: false,
    extractedFields: params.extractedFields,
    failedChecks,
    passedChecks,
    notes: approved
      ? params.notes
      : [
          ...params.notes,
          ...(!params.testMode && failedChecks.length === 0 && params.confidenceScore < 75
            ? [
                "The document content checks passed, but the overall model confidence stayed below the approval threshold.",
              ]
            : []),
          "Supplier document verification is binary. Any failed or uncertain automated check results in rejection.",
        ],
  } satisfies DocumentVerificationSummary;
}

function buildSupplierUserReviewNotes(params: {
  documentLabel: string;
  documentCode: "mayors_permit" | "bir_certificate" | "fda_lto";
  checks: Record<string, string>;
  approved: boolean;
}) {
  if (params.approved) {
    return `Your ${params.documentLabel} has been verified and approved.`;
  }

  const reasons: string[] = [];

  if (params.checks.ocr_readability !== "pass") {
    reasons.push(
      "The uploaded document was too blurry, cropped, or unclear to read reliably."
    );
  }

  if (params.checks.tamper_screen !== "pass") {
    reasons.push(
      "The document appeared edited or visually inconsistent. Please upload a clearer original copy."
    );
  }

  if (params.documentCode === "mayors_permit") {
    if (params.checks.field_business_name_present !== "pass") {
      reasons.push("The permit did not clearly show the business name.");
    }
    if (params.checks.field_business_address_present !== "pass") {
      reasons.push("The permit did not clearly show the business address.");
    }
    if (params.checks.field_permit_number_present !== "pass") {
      reasons.push("The permit number was not clearly visible.");
    }
    if (params.checks.field_permit_date_present !== "pass") {
      reasons.push("The Permit Issued date was not clearly visible.");
    }
    if (params.checks.field_validity_period_present !== "pass") {
      reasons.push("The Valid Until date was not clearly visible.");
    }
    if (params.checks.name_matches_dti !== "pass") {
      reasons.push("The business name did not match the approved DTI document.");
    }
    if (params.checks.address_matches_profile !== "pass") {
      reasons.push("The business address did not match the onboarding profile.");
    }
  }

  if (params.documentCode === "bir_certificate") {
    if (params.checks.field_business_name_present !== "pass") {
      reasons.push("The Trade Name was not clearly visible.");
    }
    if (params.checks.field_taxpayer_name_present !== "pass") {
      reasons.push("The Name of Taxpayer was not clearly visible.");
    }
    if (params.checks.field_tin_present !== "pass") {
      reasons.push("The TIN was not clearly visible.");
    }
    if (params.checks.field_business_address_present !== "pass") {
      reasons.push("The Registered Address was not clearly visible.");
    }
    if (params.checks.field_tax_type_present !== "pass") {
      reasons.push("The Tax Type/s table was missing or unclear.");
    }
    if (params.checks.field_document_revision_present !== "pass") {
      reasons.push("The BIR Form 2303 revision marker was missing or unclear.");
    }
    if (params.checks.name_matches_registration !== "pass") {
      reasons.push("The Trade Name did not match the approved DTI document.");
    }
    if (params.checks.address_matches_profile !== "pass") {
      reasons.push("The Registered Address did not match the onboarding profile.");
    }
  }

  if (params.documentCode === "fda_lto") {
    if (params.checks.field_licensed_activity_present !== "pass") {
      reasons.push(
        "The business type shown after 'LICENSE TO OPERATE as' was missing or unclear."
      );
    }
    if (params.checks.field_business_name_present !== "pass") {
      reasons.push("The business name was not clearly visible.");
    }
    if (params.checks.field_business_address_present !== "pass") {
      reasons.push("The business address was not clearly visible.");
    }
    if (params.checks.field_owner_name_present !== "pass") {
      reasons.push("The owner name was not clearly visible.");
    }
    if (params.checks.field_license_number_present !== "pass") {
      reasons.push("The license number was not clearly visible.");
    }
    if (params.checks.field_application_type_present !== "pass") {
      reasons.push("The Application Type was not clearly visible.");
    }
    if (params.checks.field_issuance_date_present !== "pass") {
      reasons.push("The Issuance Date was not clearly visible.");
    }
    if (params.checks.field_validity_date_present !== "pass") {
      reasons.push("The Validity of License was not clearly visible.");
    }
    if (params.checks.name_matches_dti !== "pass") {
      reasons.push("The business name did not match the approved DTI document.");
    }
    if (params.checks.address_matches_profile !== "pass") {
      reasons.push("The business address did not match the onboarding profile.");
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      "The automated verification could not confirm the document clearly enough. Please upload a clearer copy and try again."
    );
  }

  return `Your ${params.documentLabel} was denied. It might be due to the following: ${reasons.join(" ")}`;
}

function resolveSupplierChecks(params: {
  documentCode: "mayors_permit" | "bir_certificate" | "fda_lto";
  extractedFields: Record<string, unknown>;
  geminiChecks: Record<string, string>;
  businessContext: SupplierBusinessContext;
  dtiAnchor: SupplierDtiAnchor | null;
  ocrText: string;
  testMode: boolean;
}) {
  const checks: Record<string, string> = {
    ...params.geminiChecks,
  };

  checks.ocr_readability =
    checks.ocr_readability ?? (params.ocrText.trim().length >= 80 ? "pass" : "fail");
  checks.tamper_screen = checks.tamper_screen ?? "uncertain";

  const dtiBusinessName = params.dtiAnchor?.extractedFields.business_name;

  if (params.documentCode === "mayors_permit") {
    checks.field_business_name_present = resolvePresenceStatus(
      params.extractedFields.business_name
    );
    checks.field_business_address_present = resolvePresenceStatus(
      params.extractedFields.business_address
    );
    checks.field_permit_number_present = resolvePresenceStatus(
      params.extractedFields.permit_number
    );
    checks.field_permit_date_present = resolvePresenceStatus(
      params.extractedFields.permit_date
    );
    checks.field_validity_period_present = resolvePresenceStatus(
      params.extractedFields.validity_period
    );
    checks.name_matches_dti = params.dtiAnchor
      ? resolveMatchStatus(params.extractedFields.business_name, dtiBusinessName)
      : "fail";
    checks.address_matches_profile = resolveAddressStatus(
      params.extractedFields.business_address,
      params.businessContext
    );

    if (params.testMode) {
      checks.official_marks_present = "pass";
    }
  }

  if (params.documentCode === "bir_certificate") {
    checks.field_business_name_present = resolvePresenceStatus(
      params.extractedFields.business_name
    );
    checks.field_taxpayer_name_present = resolvePresenceStatus(
      params.extractedFields.taxpayer_name
    );
    checks.field_tin_present = resolvePresenceStatus(params.extractedFields.tin);
    checks.field_business_address_present = resolvePresenceStatus(
      params.extractedFields.business_address
    );
    checks.field_tax_type_present = resolvePresenceStatus(params.extractedFields.tax_type);
    checks.field_document_revision_present = resolvePresenceStatus(
      params.extractedFields.document_revision
    );
    checks.name_matches_registration = params.dtiAnchor
      ? resolveMatchStatus(params.extractedFields.business_name, dtiBusinessName)
      : "fail";
    checks.address_matches_profile = resolveAddressStatus(
      params.extractedFields.business_address,
      params.businessContext
    );
    checks.taxpayer_name_present = resolvePresenceStatus(
      params.extractedFields.taxpayer_name
    );
    checks.tin_present = resolvePresenceStatus(params.extractedFields.tin);
    checks.tax_profile_present =
      resolvePresenceStatus(params.extractedFields.tax_type) === "pass" ? "pass" : "fail";
    checks.bir_form_revision_present = resolvePresenceStatus(
      params.extractedFields.document_revision
    );
  }

  if (params.documentCode === "fda_lto") {
    checks.field_licensed_activity_present = resolvePresenceStatus(
      params.extractedFields.licensed_activity
    );
    checks.field_business_name_present = resolvePresenceStatus(
      params.extractedFields.business_name
    );
    checks.field_business_address_present = resolvePresenceStatus(
      params.extractedFields.business_address
    );
    checks.field_owner_name_present = resolvePresenceStatus(
      params.extractedFields.owner_name
    );
    checks.field_license_number_present = resolvePresenceStatus(
      params.extractedFields.license_number
    );
    checks.field_application_type_present = resolvePresenceStatus(
      params.extractedFields.application_type
    );
    checks.field_issuance_date_present = resolvePresenceStatus(
      params.extractedFields.issuance_date
    );
    checks.field_validity_date_present = resolvePresenceStatus(
      params.extractedFields.validity_date
    );
    checks.name_matches_dti = params.dtiAnchor
      ? resolveMatchStatus(params.extractedFields.business_name, dtiBusinessName)
      : "fail";
    checks.address_matches_profile = resolveAddressStatus(
      params.extractedFields.business_address,
      params.businessContext
    );
    checks.license_number_present = resolvePresenceStatus(
      params.extractedFields.license_number
    );
    checks.owner_name_present = resolvePresenceStatus(params.extractedFields.owner_name);
    checks.application_type_present = resolvePresenceStatus(
      params.extractedFields.application_type
    );
    checks.issuance_date_present = resolvePresenceStatus(
      params.extractedFields.issuance_date
    );
    checks.validity_date_present = resolvePresenceStatus(
      params.extractedFields.validity_date
    );
    checks.licensed_activity_present = resolvePresenceStatus(
      params.extractedFields.licensed_activity
    );
  }

  if (params.testMode) {
    checks.tamper_screen = "pass";
  }

  return checks;
}

function coerceSupplierDtiResult(
  result: Awaited<ReturnType<typeof runBuyerDtiLiveVerification>>
) {
  if (result.summary.status === "approved") {
    return result;
  }

  const summary: DocumentVerificationSummary = {
    ...result.summary,
    status: "rejected",
    manualReviewRequired: false,
    notes: [
      ...result.summary.notes,
      "Supplier document verification is binary. The DTI certificate was rejected because the automated checks did not reach approval confidence.",
    ],
  };

  return {
    ...result,
    summary,
    reviewNotes: summary.notes.join(" "),
    verifiedAt: null,
    verificationAnalysis: {
      ...result.verificationAnalysis,
      binary_supplier_policy: "reject_on_non_approval",
    },
  };
}

export async function runSupplierDocumentLiveVerification(params: {
  filePath: string;
  documentTypeName: string;
  businessContext: SupplierBusinessContext;
  dtiAnchor: SupplierDtiAnchor | null;
}) {
  const blueprint = getDocumentVerificationBlueprint(params.documentTypeName);

  if (!blueprint) {
    const summary = buildRejectedSummary({
      failedChecks: ["unsupported_document_type"],
      notes: [
        `No supplier verification blueprint exists for ${params.documentTypeName}.`,
        "This required document type cannot be automatically approved yet, so it has been rejected for supplier onboarding.",
      ],
      score: 0,
    });

    return {
      summary,
      reviewNotes: summary.notes.join(" "),
      metadataAnalysis: {
        mode: "live",
        file: null,
      },
      verificationAnalysis: {
        mode: "live",
        live_path: "supplier_document",
        blueprint: null,
      },
      ocrRawText: null,
      verifiedAt: null,
    };
  }

  if (blueprint.code === "dti") {
    return coerceSupplierDtiResult(
      await runBuyerDtiLiveVerification({
        filePath: params.filePath,
        businessContext: params.businessContext,
      })
    );
  }

  if (!params.dtiAnchor) {
    const summary = buildRejectedSummary({
      failedChecks: ["approved_dti_anchor_required"],
      notes: [
        `${blueprint.label} requires an approved DTI document first.`,
        "Upload and pass DTI verification before the remaining required supplier documents can be approved.",
      ],
      score: 0,
    });

    return {
      summary,
      reviewNotes: summary.notes.join(" "),
      metadataAnalysis: {
        mode: "live",
        file: null,
      },
      verificationAnalysis: {
        mode: "live",
        live_path: "supplier_document",
        blueprint: blueprint.code,
        dti_anchor_present: false,
      },
      ocrRawText: null,
      verifiedAt: null,
    };
  }

  const storageFile = await downloadVerificationStorageObject(
    "business-documents",
    params.filePath
  );
  const ocrResult = await extractDocumentTextWithVision({
    bytes: storageFile.bytes,
    mimeType: storageFile.mimeType,
  });

  if (!ocrResult) {
    const summary = buildRejectedSummary({
      failedChecks: ["unsupported_live_file_type"],
      notes: [
        `Automated supplier verification does not support ${storageFile.mimeType}.`,
        `Please upload ${blueprint.label} as PDF, JPG, or PNG.`,
      ],
      score: 10,
    });

    return {
      summary,
      reviewNotes: summary.notes.join(" "),
      metadataAnalysis: {
        mode: "live",
        file: {
          mimeType: storageFile.mimeType,
          sizeBytes: storageFile.bytes.length,
        },
      },
      verificationAnalysis: {
        mode: "live",
        live_path: "supplier_document",
        blueprint: blueprint.code,
        ocr: null,
        gemini: null,
      },
      ocrRawText: null,
      verifiedAt: null,
    };
  }

  const testMode = detectDocumentTestMode(ocrResult.text);

  const geminiResult = await generateGeminiStructuredOutput<SupplierGeminiResponse>({
    prompt: buildSupplierDocumentPrompt({
      documentTypeLabel: blueprint.label,
      requiredFieldLabels: blueprint.requiredFields.map((field) => field.label),
      checkDescriptions: blueprint.checks.map((check) => ({
        key: check.key,
        description: check.description,
      })),
      ocrText: ocrResult.text,
      businessContext: params.businessContext,
      dtiAnchor: params.dtiAnchor,
      testMode: testMode.enabled,
    }),
    schema: buildSupplierSchema(
      blueprint.requiredFields.map((field) => field.key),
      ["ocr_readability", ...blueprint.checks.map((check) => check.key)]
    ),
    inlineMedia: [
      {
        mimeType: storageFile.mimeType,
        bytes: storageFile.bytes,
      },
    ],
  });

  const extractedFields = geminiResult.parsed.extracted_fields ?? {};
  const checks = resolveSupplierChecks({
    documentCode: blueprint.code,
    extractedFields,
    geminiChecks: toCheckMap(geminiResult.parsed.checks),
    businessContext: params.businessContext,
    dtiAnchor: params.dtiAnchor,
    ocrText: ocrResult.text,
    testMode: testMode.enabled,
  });

  for (const check of blueprint.checks) {
    checks[check.key] = normalizeStatusValue(checks[check.key]);
  }

  const confidenceScore = Number(geminiResult.parsed.confidence_score ?? 0);
  const summary = finalizeBinarySummary({
    extractedFields,
    checks,
    confidenceScore,
    testMode: testMode.enabled,
    notes: [
      ...testMode.notes,
      ...(Array.isArray(geminiResult.parsed.notes)
        ? geminiResult.parsed.notes.map((note) => String(note))
        : []),
      `Vision OCR completed for ${storageFile.mimeType}.`,
      "Approved DTI data was used as the cross-document anchor for supplier verification.",
      ...(testMode.enabled
        ? [
            "Mock-document test mode ignored the normal Gemini confidence threshold.",
            "Mock-document test mode relaxed authenticity-format checks for this local verification.",
          ]
        : []),
    ],
  });

  return {
    summary,
    reviewNotes: buildSupplierUserReviewNotes({
      documentLabel: blueprint.label,
      documentCode: blueprint.code,
      checks,
      approved: summary.status === "approved",
    }),
    metadataAnalysis: {
      mode: "live",
      file: {
        mimeType: storageFile.mimeType,
        sizeBytes: storageFile.bytes.length,
      },
      dti_anchor_doc_id: params.dtiAnchor.docId,
      test_mode: testMode.enabled,
    },
    verificationAnalysis: {
      mode: "live",
      live_path: "supplier_document",
      test_mode: testMode.enabled,
      test_mode_notes: testMode.notes,
      blueprint: blueprint.code,
      checks,
      ocr: {
        mode: ocrResult.mode,
        raw: ocrResult.raw,
      },
      gemini: {
        parsed: geminiResult.parsed,
        raw: geminiResult.raw,
      },
      dti_anchor: {
        doc_id: params.dtiAnchor.docId,
        extracted_fields: params.dtiAnchor.extractedFields,
      },
    },
    ocrRawText: ocrResult.text,
    verifiedAt: summary.status === "approved" ? new Date().toISOString() : null,
  };
}
