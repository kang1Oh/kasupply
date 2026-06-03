import {
  buildBnrsLookupUrlFromBusinessNameNo,
  extractBusinessNameNoFromText,
  fetchBnrsAuthorityFromUrl,
  isBnrsSearchUrl,
  parseLegacyBuyerDtiQrText,
  type BuyerDtiAuthorityFields,
  type BuyerDtiAuthorityResult,
} from "@/lib/verification/bnrs";
import { detectDocumentTestMode } from "@/lib/verification/document-test-mode";
import { downloadVerificationStorageObject } from "@/lib/verification/storage";
import { generateGeminiStructuredOutput } from "@/lib/verification/gemini";
import { decodeQrFromBuffer } from "@/lib/utils/decodeQr";
import { extractDocumentTextWithVision } from "@/lib/verification/vision";
import type { DocumentVerificationSummary } from "@/lib/verification/types";

type BuyerBusinessContext = {
  businessName: string | null;
  businessLocation: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
};

type BuyerDtiGeminiResponse = {
  extracted_fields?: Record<string, unknown>;
  qr_fields?: Record<string, unknown>;
  checks?: Record<string, string>;
  tamper_risk?: string;
  confidence_score?: number;
  notes?: string[];
};

const BUYER_DTI_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    extracted_fields: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        business_territory: { type: "string" },
        owner_name: { type: "string" },
        business_name_no: { type: "string" },
        registration_date: { type: "string" },
        status: { type: "string" },
        scope_or_location: { type: "string" },
      },
      additionalProperties: true,
    },
    qr_fields: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        business_territory: { type: "string" },
        owner_name: { type: "string" },
        business_name_no: { type: "string" },
        registration_date: { type: "string" },
        status: { type: "string" },
        scope_or_location: { type: "string" },
      },
      additionalProperties: true,
    },
    checks: {
      type: "object",
      properties: {
        ocr_readability: { type: "string" },
        qr_present: { type: "string" },
        qr_matches_visible_text: { type: "string" },
        business_name_matches_profile: { type: "string" },
        business_territory_present: { type: "string" },
        owner_name_present: { type: "string" },
        business_name_no_present: { type: "string" },
        registration_date_present: { type: "string" },
        status_present: { type: "string" },
        business_scope_present: { type: "string" },
        tamper_screen: { type: "string" },
      },
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
};

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveStatusFromBoolean(value: boolean) {
  return value ? "pass" : "fail";
}

function resolvePresenceStatus(value: unknown) {
  return normalizeComparableText(value).length > 0 ? "pass" : "fail";
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

function classifyQrPayload(payloadText: string | null) {
  if (!payloadText) {
    return "none" as const;
  }

  if (parseLegacyBuyerDtiQrText(payloadText)) {
    return "legacy_text" as const;
  }

  if (isBnrsSearchUrl(payloadText)) {
    return "bnrs_url" as const;
  }

  return "unrecognized" as const;
}

function buildAuthorityText(authority: BuyerDtiAuthorityResult | null) {
  if (!authority) {
    return "[not available]";
  }

  return [
    `Authority source type: ${authority.sourceType}`,
    `Resolved URL: ${authority.resolvedUrl ?? "[not applicable]"}`,
    `Business name: ${authority.fields.business_name ?? ""}`,
    `Business territory: ${authority.fields.business_territory ?? ""}`,
    `Owner name: ${authority.fields.owner_name ?? ""}`,
    `Certificate No./BNN: ${authority.fields.business_name_no ?? ""}`,
    `Transaction/Registration date: ${authority.fields.registration_date ?? ""}`,
    `Status: ${authority.fields.status ?? ""}`,
    `Business scope: ${authority.fields.scope_or_location ?? ""}`,
  ].join("\n");
}

function buildBuyerDtiPrompt(params: {
  ocrText: string;
  authority: BuyerDtiAuthorityResult | null;
  businessContext: BuyerBusinessContext;
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
    "You are verifying a Philippine DTI Business Registration Certificate conservatively.",
    "Use the uploaded document plus OCR text to extract fields and assess whether the document is likely authentic enough for automated buyer onboarding.",
    "Only mark a check as pass when the evidence is clear.",
    "Use fail when the evidence clearly contradicts the requirement.",
    "Use uncertain when the evidence is missing, ambiguous, blurry, or unreadable.",
    ...(params.testMode
      ? [
          "The uploaded file explicitly declares itself as a mock document for local testing.",
          "In test mode, focus on content extraction and consistency only.",
          "Ignore tamper-only concerns and do not fail the document solely for missing official formatting or QR/BNRS authority data.",
        ]
      : []),
    "The QR payload is pre-extracted by the system and provided below.",
    "Do NOT attempt to decode the QR from the image.",
    "If QR payload is provided, compare it with OCR text for consistency.",
    "If QR payload is null or missing, treat QR as unavailable (not a failure).",
    "Only fail if QR payload clearly contradicts the document content.",
    "Do not treat a DTI scope value like NATIONAL as a contradiction with a specific onboarding city or province. NATIONAL indicates business-name registration scope, not necessarily the current operating address.",
    "Extract these visible certificate fields when possible: business_name, business_territory, owner_name, business_name_no, registration_date, status, scope_or_location.",
    "The authority block below may come from either a legacy raw-text QR payload or a BNRS public search result page.",
    "Visible OCR text:",
    params.ocrText || "[empty]",
    "",
    "Authority data resolved from QR or BNRS:",
    buildAuthorityText(params.authority),
    "",
    "Onboarding business context:",
    businessContextText,
  ].join("\n");
}

function buildQrDiagnostics(params: {
  qrPayloadText: string | null;
  authority: BuyerDtiAuthorityResult | null;
  checks: Record<string, string>;
  testMode: boolean;
}) {
  const payloadType = classifyQrPayload(params.qrPayloadText);
  const qrDerivedAuthorityResolved =
    params.authority?.sourceType === "qr_raw_text" ||
    params.authority?.sourceType === "qr_bnrs_url";
  const productionRequirementSatisfied = params.testMode
    ? qrDerivedAuthorityResolved || payloadType === "legacy_text" || payloadType === "bnrs_url"
    : qrDerivedAuthorityResolved;
  const failureReasons: string[] = [];

  if (!params.qrPayloadText) {
    failureReasons.push("no_qr_payload_decoded");
  } else if (payloadType === "unrecognized") {
    failureReasons.push("qr_payload_not_recognized_as_legacy_text_or_bnrs_url");
  }

  if (params.authority?.sourceType === "ocr_bnn_lookup") {
    failureReasons.push("authority_resolved_only_from_ocr_bnn_lookup");
  }

  if (params.checks.qr_matches_visible_text === "fail") {
    failureReasons.push("qr_payload_did_not_match_visible_document_text");
  }

  if (params.checks.authoritative_source_matches_certificate === "fail") {
    failureReasons.push("qr_derived_authority_did_not_match_certificate");
  }

  if (params.checks.certificate_status_registered === "fail") {
    failureReasons.push("qr_derived_authority_did_not_confirm_registered_status");
  }

  return {
    decoded: Boolean(params.qrPayloadText),
    payloadType,
    authoritySourceType: params.authority?.sourceType ?? null,
    authorityResolved: Boolean(params.authority),
    qrDerivedAuthorityResolved,
    productionRequirementSatisfied,
    failureReasons,
  };
}

function resolveTestModeQrBehavior(params: {
  testMode: boolean;
  qrPayloadText: string | null;
  authority: BuyerDtiAuthorityResult | null;
}) {
  const hasQrPayload = Boolean(params.qrPayloadText);
  const hasQrDerivedAuthority =
    params.authority?.sourceType === "qr_raw_text" ||
    params.authority?.sourceType === "qr_bnrs_url";

  return {
    shouldBypassQrChecks: params.testMode && !(hasQrPayload && hasQrDerivedAuthority),
    preservesQrComparison: params.testMode && hasQrPayload && hasQrDerivedAuthority,
  };
}

function buildBuyerDtiFailureNotes(checks: Record<string, string>) {
  const notes: string[] = [];

  if (checks.ocr_readability !== "pass") {
    notes.push("The document image was too unclear for reliable OCR field extraction.");
  }

  if (checks.qr_present !== "pass") {
    notes.push("A readable DTI QR code could not be confirmed from the uploaded certificate.");
  }

  if (checks.qr_matches_visible_text !== "pass") {
    notes.push("The decoded QR data did not align with the visible certificate details.");
  }

  if (checks.authoritative_source_matches_certificate !== "pass") {
    notes.push("The DTI QR or BNRS authority data did not align with the visible certificate details.");
  }

  if (checks.business_name_matches_profile !== "pass") {
    notes.push("The business name on the certificate did not match the onboarding profile.");
  }

  if (checks.owner_name_present !== "pass") {
    notes.push("The document did not clearly show the business owner name.");
  }

  if (checks.business_territory_present !== "pass") {
    notes.push("The document did not clearly show the business territory.");
  }

  if (checks.business_name_no_present !== "pass") {
    notes.push("The document did not clearly show the DTI certificate number or BNN.");
  }

  if (checks.registration_date_present !== "pass") {
    notes.push("The document did not clearly show the transaction or registration date.");
  }

  if (checks.status_present !== "pass") {
    notes.push("The document did not clearly show the registration status.");
  }

  if (checks.business_scope_present !== "pass") {
    notes.push("The document did not clearly show the business scope.");
  }

  if (checks.tamper_screen !== "pass") {
    notes.push("The certificate showed possible tampering or inconsistent visual formatting.");
  }

  if (checks.certificate_status_registered === "fail") {
    notes.push("The BNRS authority data did not show the business name registration as registered.");
  }

  return notes;
}

function buildBuyerDtiUserReviewNotes(params: {
  checks: Record<string, string>;
  approved: boolean;
}) {
  if (params.approved) {
    return "Your document has been verified and approved. Click Finish to complete onboarding.";
  }

  const reasons: string[] = [];

  if (params.checks.ocr_readability !== "pass") {
    reasons.push(
      "The uploaded document was too blurry, cropped, or unclear to read reliably."
    );
  }

  if (params.checks.qr_present === "fail") {
    reasons.push(
      "The QR code could not be scanned clearly. Please upload a clearer image showing the full QR code."
    );
  }

  if (params.checks.qr_matches_visible_text === "fail") {
    reasons.push(
      "The QR code's decoded details did not match the information printed on the certificate."
    );
  }

  if (params.checks.authoritative_source_matches_certificate === "fail") {
    reasons.push(
      "The QR or BNRS verification data could not be matched confidently to this certificate."
    );
  }

  if (params.checks.business_name_matches_profile !== "pass") {
    reasons.push(
      "The business name on the document does not match the business name in your onboarding profile."
    );
  }

  if (params.checks.business_territory_present !== "pass") {
    reasons.push("The document did not clearly show the business territory.");
  }

  if (params.checks.owner_name_present !== "pass") {
    reasons.push("The document did not clearly show the owner's name.");
  }

  if (params.checks.business_name_no_present !== "pass") {
    reasons.push("The document did not clearly show the certificate number or BNN.");
  }

  if (params.checks.registration_date_present !== "pass") {
    reasons.push("The document did not clearly show the transaction or registration date.");
  }

  if (params.checks.status_present !== "pass") {
    reasons.push("The document did not clearly show the registration status.");
  }

  if (params.checks.business_scope_present !== "pass") {
    reasons.push("The document did not clearly show the business scope.");
  }

  if (params.checks.certificate_status_registered === "fail") {
    reasons.push("The registration status could not be confirmed as registered.");
  }

  if (params.checks.tamper_screen !== "pass") {
    reasons.push(
      "The document appeared edited or visually inconsistent. Please upload a clearer original copy."
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "The automated verification could not confirm the document clearly enough. Please upload a clearer copy and try again."
    );
  }

  return `We couldn't verify your document. Please review the following and upload a clearer or corrected copy: ${reasons.join(" ")}`;
}

function toCheckMap(value: Record<string, unknown> | undefined) {
  return Object.entries(value ?? {}).reduce<Record<string, string>>((result, [key, entry]) => {
    result[key] = String(entry ?? "").trim().toLowerCase();
    return result;
  }, {});
}

function compareAgainstAuthority(
  extractedFields: Record<string, unknown>,
  authorityFields: BuyerDtiAuthorityFields | null
) {
  if (!authorityFields) {
    return {
      matches: false,
      passKeys: [] as string[],
      failKeys: [] as string[],
    };
  }

  const passKeys: string[] = [];
  const failKeys: string[] = [];
  const fieldPairs = [
    ["business_name", extractedFields.business_name, authorityFields.business_name],
    ["business_territory", extractedFields.business_territory, authorityFields.business_territory],
    ["owner_name", extractedFields.owner_name, authorityFields.owner_name],
    ["registration_date", extractedFields.registration_date, authorityFields.registration_date],
    ["status", extractedFields.status, authorityFields.status],
    ["scope_or_location", extractedFields.scope_or_location, authorityFields.scope_or_location],
    ["business_name_no", extractedFields.business_name_no, authorityFields.business_name_no],
  ] as const;

  for (const [fieldKey, certificateValue, authorityValue] of fieldPairs) {
    if (!authorityValue || !certificateValue) {
      continue;
    }

    if (looselyMatchesText(certificateValue, authorityValue)) {
      passKeys.push(fieldKey);
    } else {
      failKeys.push(fieldKey);
    }
  }

  return {
    matches: failKeys.length === 0 && passKeys.length >= 3,
    passKeys,
    failKeys,
  };
}

async function resolveBuyerDtiAuthority(params: {
  qrPayloadText: string | null;
  ocrText: string;
}) {
  if (params.qrPayloadText) {
    const legacyQrData = parseLegacyBuyerDtiQrText(params.qrPayloadText);

    if (legacyQrData) {
      return legacyQrData;
    }

    if (isBnrsSearchUrl(params.qrPayloadText)) {
      return await fetchBnrsAuthorityFromUrl(params.qrPayloadText, "qr_bnrs_url");
    }
  }

  const businessNameNo = extractBusinessNameNoFromText(params.ocrText);

  if (businessNameNo) {
    return await fetchBnrsAuthorityFromUrl(
      buildBnrsLookupUrlFromBusinessNameNo(businessNameNo),
      "ocr_bnn_lookup"
    );
  }

  return null;
}

function resolveBuyerDtiSummary(params: {
  gemini: BuyerDtiGeminiResponse;
  authority: BuyerDtiAuthorityResult | null;
  qrPayloadText: string | null;
  ocrText: string;
  mimeType: string;
  businessContext: BuyerBusinessContext;
  testMode: boolean;
  testModeNotes: string[];
}) {
  const extractedFields = params.gemini.extracted_fields ?? {};
  const geminiChecks = toCheckMap(params.gemini.checks);
  const authorityComparison = compareAgainstAuthority(
    extractedFields,
    params.authority?.fields ?? null
  );
  const hasQrPayload = Boolean(params.qrPayloadText);
  const hasQrDerivedAuthority =
    params.authority?.sourceType === "qr_raw_text" ||
    params.authority?.sourceType === "qr_bnrs_url";
  const testModeQrBehavior = resolveTestModeQrBehavior({
    testMode: params.testMode,
    qrPayloadText: params.qrPayloadText,
    authority: params.authority,
  });
  const checks: Record<string, string> = {
    ...geminiChecks,
    qr_present: hasQrPayload ? "pass" : "fail",
    qr_matches_visible_text:
      hasQrDerivedAuthority
        ? resolveStatusFromBoolean(authorityComparison.matches)
        : hasQrPayload
          ? "fail"
          : "fail",
    authoritative_source_matches_certificate: hasQrDerivedAuthority
      ? resolveStatusFromBoolean(authorityComparison.matches)
      : "fail",
    business_name_matches_profile: resolveStatusFromBoolean(
      looselyMatchesText(extractedFields.business_name, params.businessContext.businessName)
    ),
    business_territory_present: resolvePresenceStatus(extractedFields.business_territory),
    owner_name_present: resolvePresenceStatus(extractedFields.owner_name),
    business_name_no_present: resolvePresenceStatus(extractedFields.business_name_no),
    registration_date_present: resolvePresenceStatus(extractedFields.registration_date),
    status_present: resolvePresenceStatus(extractedFields.status),
    business_scope_present: resolvePresenceStatus(extractedFields.scope_or_location),
    certificate_status_registered: hasQrDerivedAuthority && params.authority?.fields.status != null
        ? resolveStatusFromBoolean(
            looselyMatchesText(params.authority.fields.status, "registered")
          )
        : "fail",
  };

  if (params.testMode) {
    if (testModeQrBehavior.shouldBypassQrChecks) {
      checks.qr_present = "pass";
      checks.qr_matches_visible_text = "pass";
      checks.authoritative_source_matches_certificate = "pass";
      checks.certificate_status_registered =
        looselyMatchesText(extractedFields.status, "registered") ||
        looselyMatchesText(extractedFields.status, "active")
          ? "pass"
          : checks.status_present === "pass"
            ? "uncertain"
            : "fail";
    }

    checks.tamper_screen = "pass";
  }

  const notes = Array.isArray(params.gemini.notes)
    ? params.gemini.notes.map((note) => String(note))
    : [];
  const confidenceScore = Number(params.gemini.confidence_score ?? 0);
  const meetsConfidenceThreshold = params.testMode || confidenceScore >= 75;
  const passedChecks = Object.entries(checks)
    .filter(([, value]) => value === "pass")
    .map(([key]) => key);
  const failedChecks = Object.entries(checks)
    .filter(([, value]) => value === "fail")
    .map(([key]) => key);

  const strongPass =
    checks.ocr_readability === "pass" &&
    checks.qr_present === "pass" &&
    checks.qr_matches_visible_text === "pass" &&
    checks.authoritative_source_matches_certificate === "pass" &&
    checks.business_name_matches_profile === "pass" &&
    checks.business_territory_present === "pass" &&
    checks.owner_name_present === "pass" &&
    checks.business_name_no_present === "pass" &&
    checks.registration_date_present === "pass" &&
    checks.status_present === "pass" &&
    checks.business_scope_present === "pass" &&
    checks.tamper_screen === "pass" &&
    checks.certificate_status_registered === "pass" &&
    meetsConfidenceThreshold;

  const summary: DocumentVerificationSummary = {
    status: strongPass ? "approved" : "rejected",
    score: Number.isFinite(confidenceScore) ? confidenceScore : null,
    manualReviewRequired: false,
    extractedFields,
    failedChecks,
    passedChecks,
    notes: [
      ...params.testModeNotes,
      ...notes,
      ...(params.authority?.notes ?? []),
      ...(params.testMode
        ? ["Mock-document test mode ignored the normal Gemini confidence threshold."]
        : []),
      params.testMode
        ? testModeQrBehavior.preservesQrComparison
          ? "Mock-document test mode preserved live QR payload comparison because a decodable QR-derived authority source was available."
          : "Mock-document test mode bypassed QR/BNRS authority enforcement for this local verification because no decodable QR-derived authority source was available."
        : hasQrDerivedAuthority
        ? "Authoritative DTI/BNRS data was resolved from the QR code for certificate comparison."
        : hasQrPayload
        ? "A QR payload was decoded, but it did not resolve to a valid DTI/BNRS authority source."
        : "No QR payload could be decoded from the uploaded certificate.",
      params.ocrText
        ? `Vision OCR completed for ${params.mimeType}.`
        : `Vision OCR returned limited text for ${params.mimeType}.`,
      ...(strongPass ? [] : buildBuyerDtiFailureNotes(checks)),
      ...(!strongPass && !params.testMode && failedChecks.length === 0 && confidenceScore < 75
        ? [
            "The document content checks passed, but the overall model confidence stayed below the approval threshold.",
          ]
        : []),
      ...(strongPass
        ? []
        : [
            "DTI verification is automated. Missing QR data does not automatically cause rejection, but inconsistencies will.",
          ]),
    ],
  };

  return {
    summary,
    checks,
    userReviewNotes: buildBuyerDtiUserReviewNotes({
      checks,
      approved: strongPass,
    }),
    qrDiagnostics: buildQrDiagnostics({
      qrPayloadText: params.qrPayloadText,
      authority: params.authority,
      checks,
      testMode: params.testMode,
    }),
  };
}

export async function runBuyerDtiLiveVerification(params: {
  filePath: string;
  businessContext: BuyerBusinessContext;
}) {
  const storageFile = await downloadVerificationStorageObject(
    "business-documents",
    params.filePath
  );
  const ocrResult = await extractDocumentTextWithVision({
    bytes: storageFile.bytes,
    mimeType: storageFile.mimeType,
  });

  if (!ocrResult) {
    const summary: DocumentVerificationSummary = {
      status: "rejected",
      score: 20,
      manualReviewRequired: false,
      extractedFields: {},
      failedChecks: ["unsupported_live_file_type"],
      passedChecks: [],
      notes: [
        `Automated buyer DTI verification does not support ${storageFile.mimeType}.`,
        "Please upload the DTI certificate as PDF, JPG, or PNG.",
      ],
    };

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
        live_path: "buyer_dti",
        ocr: null,
        gemini: null,
        qr: {
          decoded: false,
          payloadText: null,
        },
      },
      ocrRawText: null,
      verifiedAt: null,
    };
  }

  const qrPayloadText = await decodeQrFromBuffer(storageFile.bytes);
  const testMode = detectDocumentTestMode(ocrResult.text);
  const authority = await resolveBuyerDtiAuthority({
    qrPayloadText,
    ocrText: ocrResult.text,
  }).catch((error) => {
    console.error("Unable to resolve buyer DTI authority source.", error);
    return null;
  });
  const geminiResult = await generateGeminiStructuredOutput<BuyerDtiGeminiResponse>({
    prompt: buildBuyerDtiPrompt({
      ocrText: ocrResult.text,
      authority,
      businessContext: params.businessContext,
      testMode: testMode.enabled,
    }),
    schema: BUYER_DTI_SCHEMA,
    inlineMedia:
      storageFile.mimeType === "application/pdf" ||
      storageFile.mimeType === "image/png" ||
      storageFile.mimeType === "image/jpeg"
        ? [
            {
              mimeType: storageFile.mimeType,
              bytes: storageFile.bytes,
            },
          ]
        : [],
  });
  const resolved = resolveBuyerDtiSummary({
    gemini: geminiResult.parsed,
    authority,
    qrPayloadText,
    ocrText: ocrResult.text,
    mimeType: storageFile.mimeType,
    businessContext: params.businessContext,
    testMode: testMode.enabled,
    testModeNotes: testMode.notes,
  });
  const normalizedProfileName = normalizeComparableText(params.businessContext.businessName);
  const normalizedExtractedName = normalizeComparableText(
    (geminiResult.parsed.extracted_fields ?? {}).business_name
  );

  if (
    resolved.summary.status === "approved" &&
    normalizedProfileName &&
    normalizedExtractedName &&
    !normalizedExtractedName.includes(normalizedProfileName) &&
    !normalizedProfileName.includes(normalizedExtractedName)
  ) {
    resolved.summary.status = "rejected";
    resolved.summary.manualReviewRequired = false;
    resolved.summary.failedChecks.push("business_name_alignment_guard");
    resolved.summary.notes.push(
      "The extracted business name did not align closely enough with the onboarding profile."
    );
  }

  return {
    summary: resolved.summary,
    reviewNotes: resolved.userReviewNotes,
    metadataAnalysis: {
      mode: "live",
      file: {
        mimeType: storageFile.mimeType,
        sizeBytes: storageFile.bytes.length,
      },
      qr: {
        decoded: Boolean(qrPayloadText),
        authorityResolved: Boolean(authority),
        qrDerivedAuthorityResolved:
          authority?.sourceType === "qr_raw_text" || authority?.sourceType === "qr_bnrs_url",
        payloadType: classifyQrPayload(qrPayloadText),
      },
      test_mode: testMode.enabled,
    },
    verificationAnalysis: {
      mode: "live",
      live_path: "buyer_dti",
      test_mode: testMode.enabled,
      test_mode_notes: testMode.notes,
      checks: resolved.checks,
      ocr: {
        mode: ocrResult.mode,
        raw: ocrResult.raw,
      },
      gemini: {
        parsed: geminiResult.parsed,
        raw: geminiResult.raw,
      },
      qr: {
        decoded: Boolean(qrPayloadText),
        payloadText: qrPayloadText,
        diagnostics: resolved.qrDiagnostics,
      },
      authority: authority
        ? {
            sourceType: authority.sourceType,
            sourceValue: authority.sourceValue,
            resolvedUrl: authority.resolvedUrl,
            fields: authority.fields,
          }
        : null,
    },
    ocrRawText: ocrResult.text,
    verifiedAt: resolved.summary.status === "approved" ? new Date().toISOString() : null,
  };
}
