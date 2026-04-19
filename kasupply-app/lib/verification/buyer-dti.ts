import {
  buildBnrsLookupUrlFromBusinessNameNo,
  extractBusinessNameNoFromText,
  fetchBnrsAuthorityFromUrl,
  isBnrsSearchUrl,
  parseLegacyBuyerDtiQrText,
  type BuyerDtiAuthorityFields,
  type BuyerDtiAuthorityResult,
} from "@/lib/verification/bnrs";
import { downloadVerificationStorageObject } from "@/lib/verification/storage";
import { generateGeminiStructuredOutput } from "@/lib/verification/gemini";
import { tryDecodeQrPayloadFromImageBytes } from "@/lib/verification/qr";
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
        owner_name: { type: "string" },
        business_name_no: { type: "string" },
        scope_or_location: { type: "string" },
        validity_date: { type: "string" },
      },
      additionalProperties: true,
    },
    qr_fields: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        owner_name: { type: "string" },
        business_name_no: { type: "string" },
        scope_or_location: { type: "string" },
        validity_date: { type: "string" },
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
        owner_name_present: { type: "string" },
        business_name_no_present: { type: "string" },
        validity_date_present: { type: "string" },
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
  return normalizeComparableText(value).length > 0 ? "pass" : "uncertain";
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

function buildAuthorityText(authority: BuyerDtiAuthorityResult | null) {
  if (!authority) {
    return "[not available]";
  }

  return [
    `Authority source type: ${authority.sourceType}`,
    `Resolved URL: ${authority.resolvedUrl ?? "[not applicable]"}`,
    `Business name: ${authority.fields.business_name ?? ""}`,
    `Owner name: ${authority.fields.owner_name ?? ""}`,
    `Scope or location: ${authority.fields.scope_or_location ?? ""}`,
    `Business name no: ${authority.fields.business_name_no ?? ""}`,
    `Validity date: ${authority.fields.validity_date ?? ""}`,
    `Registration date: ${authority.fields.registration_date ?? ""}`,
    `Status: ${authority.fields.status ?? ""}`,
    `Business territory: ${authority.fields.business_territory ?? ""}`,
  ].join("\n");
}

function buildBuyerDtiPrompt(params: {
  ocrText: string;
  authority: BuyerDtiAuthorityResult | null;
  businessContext: BuyerBusinessContext;
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
    "If QR payload text is absent, mark qr_present as uncertain unless the document image clearly shows a readable QR code.",
    "Do not treat a DTI scope value like NATIONAL as a contradiction with a specific onboarding city or province. NATIONAL indicates business-name registration scope, not necessarily the current operating address.",
    "Extract these visible certificate fields when possible: business_name, owner_name, business_name_no, scope_or_location, validity_date.",
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
    ["owner_name", extractedFields.owner_name, authorityFields.owner_name],
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
  ocrText: string;
  mimeType: string;
  businessContext: BuyerBusinessContext;
}) {
  const extractedFields = params.gemini.extracted_fields ?? {};
  const geminiChecks = toCheckMap(params.gemini.checks);
  const authorityComparison = compareAgainstAuthority(
    extractedFields,
    params.authority?.fields ?? null
  );
  const checks: Record<string, string> = {
    ...geminiChecks,
    qr_present: params.authority ? "pass" : "uncertain",
    qr_matches_visible_text:
      params.authority?.sourceType === "qr_raw_text" || params.authority?.sourceType === "qr_bnrs_url"
        ? resolveStatusFromBoolean(authorityComparison.matches)
        : geminiChecks.qr_matches_visible_text ??
          (params.authority ? "uncertain" : "uncertain"),
    authoritative_source_matches_certificate: params.authority
      ? resolveStatusFromBoolean(authorityComparison.matches)
      : "uncertain",
    business_name_matches_profile: resolveStatusFromBoolean(
      looselyMatchesText(extractedFields.business_name, params.businessContext.businessName)
    ),
    owner_name_present: resolvePresenceStatus(extractedFields.owner_name),
    business_name_no_present: resolvePresenceStatus(extractedFields.business_name_no),
    validity_date_present: resolvePresenceStatus(extractedFields.validity_date),
    certificate_status_registered:
      params.authority?.fields.status != null
        ? resolveStatusFromBoolean(
            looselyMatchesText(params.authority.fields.status, "registered")
          )
        : "uncertain",
  };
  const notes = Array.isArray(params.gemini.notes)
    ? params.gemini.notes.map((note) => String(note))
    : [];
  const confidenceScore = Number(params.gemini.confidence_score ?? 0);
  const passedChecks = Object.entries(checks)
    .filter(([, value]) => value === "pass")
    .map(([key]) => key);
  const failedChecks = Object.entries(checks)
    .filter(([, value]) => value === "fail")
    .map(([key]) => key);

  const strongPass =
    checks.ocr_readability === "pass" &&
    checks.business_name_matches_profile === "pass" &&
    checks.owner_name_present === "pass" &&
    checks.business_name_no_present === "pass" &&
    checks.validity_date_present === "pass" &&
    checks.tamper_screen === "pass" &&
    checks.authoritative_source_matches_certificate === "pass" &&
    (checks.certificate_status_registered === "pass" ||
      checks.certificate_status_registered === "uncertain") &&
    confidenceScore >= 75;

  const summary: DocumentVerificationSummary = {
    status: strongPass ? "approved" : "review_required",
    score: Number.isFinite(confidenceScore) ? confidenceScore : null,
    manualReviewRequired: !strongPass,
    extractedFields,
    failedChecks,
    passedChecks,
    notes: [
      ...notes,
      ...(params.authority?.notes ?? []),
      params.authority
        ? "Authoritative DTI/BNRS data was resolved for certificate comparison."
        : "No authoritative QR or BNRS data was resolved automatically.",
      params.ocrText
        ? `Vision OCR completed for ${params.mimeType}.`
        : `Vision OCR returned limited text for ${params.mimeType}.`,
    ],
  };

  return {
    summary,
    checks,
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
      status: "review_required",
      score: 20,
      manualReviewRequired: true,
      extractedFields: {},
      failedChecks: ["unsupported_live_file_type"],
      passedChecks: [],
      notes: [
        `Live buyer DTI verification does not yet support ${storageFile.mimeType}.`,
        "Please upload the DTI certificate as PDF, JPG, or PNG for automated verification.",
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

  const qrPayloadText = await tryDecodeQrPayloadFromImageBytes(
    storageFile.bytes,
    storageFile.mimeType
  );
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
    ocrText: ocrResult.text,
    mimeType: storageFile.mimeType,
    businessContext: params.businessContext,
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
    resolved.summary.status = "review_required";
    resolved.summary.manualReviewRequired = true;
    resolved.summary.failedChecks.push("business_name_alignment_guard");
    resolved.summary.notes.push(
      "The extracted business name did not align closely enough with the onboarding profile for automatic approval."
    );
  }

  return {
    summary: resolved.summary,
    reviewNotes: resolved.summary.notes.join(" "),
    metadataAnalysis: {
      mode: "live",
      file: {
        mimeType: storageFile.mimeType,
        sizeBytes: storageFile.bytes.length,
      },
      qr: {
        decoded: Boolean(qrPayloadText),
        authorityResolved: Boolean(authority),
      },
    },
    verificationAnalysis: {
      mode: "live",
      live_path: "buyer_dti",
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
