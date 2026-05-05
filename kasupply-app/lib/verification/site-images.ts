import { generateGeminiStructuredOutput } from "@/lib/verification/gemini";
import {
  fetchStreetViewForLocation,
  geocodeBusinessAddress,
} from "@/lib/verification/google-maps";
import {
  extractImageCaptureMetadata,
  SITE_IMAGE_MAX_AGE_DAYS,
} from "@/lib/verification/image-metadata";
import { downloadVerificationStorageObject } from "@/lib/verification/storage";
import type { SiteVerificationSummary } from "@/lib/verification/types";

type SupplierBusinessContext = {
  businessName: string | null;
  businessLocation: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
};

type SiteImageArtifact = {
  imageType: string;
  imageUrl: string;
};

type SiteVerificationGeminiResponse = {
  extracted_fields?: Record<string, unknown>;
  checks?: Record<string, string>;
  confidence_score?: number;
  notes?: string[];
};

type SiteImageVerificationResult = {
  status: "approved" | "rejected";
  reviewNotes: string;
  analysisResult: Record<string, unknown>;
  verifiedAt: string | null;
};

const BUSINESS_NAME_NOISE_TOKENS = new Set([
  "and",
  "by",
  "co",
  "company",
  "corp",
  "corporation",
  "enterprise",
  "enterprises",
  "general",
  "inc",
  "incorporated",
  "limited",
  "ltd",
  "llc",
  "opc",
  "pc",
  "plc",
  "services",
  "service",
  "shop",
  "store",
  "the",
  "trading",
]);

const BUSINESS_NAME_DESCRIPTOR_TOKENS = new Set([
  "bakery",
  "beverages",
  "distributor",
  "distributors",
  "enterprise",
  "enterprises",
  "factory",
  "food",
  "foods",
  "manufacturer",
  "manufacturers",
  "manufacturing",
  "product",
  "products",
  "restaurant",
  "snacks",
  "supplier",
  "suppliers",
  "supply",
  "trading",
  "wholesaler",
  "wholesalers",
]);

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeComparableText(value: unknown) {
  return normalizeComparableText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function containsWholePhrase(haystack: string, needle: string) {
  if (!haystack || !needle) {
    return false;
  }

  return (
    haystack === needle ||
    haystack.startsWith(`${needle} `) ||
    haystack.endsWith(` ${needle}`) ||
    haystack.includes(` ${needle} `)
  );
}

function getBusinessCoreTokens(value: unknown) {
  return tokenizeComparableText(value).filter(
    (token) => token.length >= 2 && !BUSINESS_NAME_NOISE_TOKENS.has(token)
  );
}

function getBusinessAnchorTokens(value: unknown) {
  return tokenizeComparableText(value).filter(
    (token) =>
      token.length >= 3 &&
      !BUSINESS_NAME_NOISE_TOKENS.has(token) &&
      !BUSINESS_NAME_DESCRIPTOR_TOKENS.has(token)
  );
}

function getTokenOverlapRatio(source: string[], target: string[]) {
  if (source.length === 0 || target.length === 0) {
    return 0;
  }

  const targetSet = new Set(target);
  const overlapCount = source.filter((token) => targetSet.has(token)).length;
  return overlapCount / source.length;
}

function buildInitialism(tokens: string[]) {
  return tokens
    .filter((token) => token.length > 0)
    .map((token) => token[0])
    .join("");
}

function matchBusinessNameForSignage(signageText: unknown, businessName: unknown) {
  const normalizedSignage = normalizeComparableText(signageText);
  const normalizedBusinessName = normalizeComparableText(businessName);

  if (!normalizedSignage || !normalizedBusinessName) {
    return {
      matched: false,
      strategy: "missing_input",
      score: 0,
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens: [] as string[],
      businessCoreTokens: [] as string[],
    };
  }

  if (
    containsWholePhrase(normalizedSignage, normalizedBusinessName) ||
    containsWholePhrase(normalizedBusinessName, normalizedSignage)
  ) {
    return {
      matched: true,
      strategy: "whole_phrase_match",
      score: 1,
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens: getBusinessCoreTokens(signageText),
      businessCoreTokens: getBusinessCoreTokens(businessName),
    };
  }

  const signageCoreTokens = getBusinessCoreTokens(signageText);
  const businessCoreTokens = getBusinessCoreTokens(businessName);
  const signageAnchorTokens = getBusinessAnchorTokens(signageText);
  const businessAnchorTokens = getBusinessAnchorTokens(businessName);

  if (signageCoreTokens.length === 0 || businessCoreTokens.length === 0) {
    return {
      matched: false,
      strategy: "missing_core_tokens",
      score: 0,
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens,
      businessCoreTokens,
    };
  }

  if (
    businessAnchorTokens.length === 1 &&
    businessAnchorTokens[0].length >= 4 &&
    signageAnchorTokens.includes(businessAnchorTokens[0])
  ) {
    return {
      matched: true,
      strategy: "dominant_anchor_token_match",
      score: 0.74,
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens,
      businessCoreTokens,
    };
  }

  const businessCoverage = getTokenOverlapRatio(businessCoreTokens, signageCoreTokens);
  const signageCoverage = getTokenOverlapRatio(signageCoreTokens, businessCoreTokens);
  const sharedTokenCount = businessCoreTokens.filter((token) =>
    signageCoreTokens.includes(token)
  ).length;

  if (
    businessCoverage >= 0.67 &&
    signageCoverage >= 0.67 &&
    sharedTokenCount >= Math.min(2, businessCoreTokens.length, signageCoreTokens.length)
  ) {
    return {
      matched: true,
      strategy: "core_token_overlap",
      score: Number(((businessCoverage + signageCoverage) / 2).toFixed(2)),
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens,
      businessCoreTokens,
    };
  }

  const businessInitialism = buildInitialism(businessCoreTokens);
  if (
    businessCoreTokens.length >= 2 &&
    signageCoreTokens.length === 1 &&
    signageCoreTokens[0] === businessInitialism
  ) {
    return {
      matched: true,
      strategy: "business_initialism_match",
      score: 0.76,
      normalizedSignage,
      normalizedBusinessName,
      signageCoreTokens,
      businessCoreTokens,
    };
  }

  return {
    matched: false,
    strategy: "insufficient_similarity",
    score: Number(((businessCoverage + signageCoverage) / 2).toFixed(2)),
    normalizedSignage,
    normalizedBusinessName,
    signageCoreTokens,
    businessCoreTokens,
  };
}

function normalizeStatusValue(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "pass" || normalized === "fail" || normalized === "uncertain") {
    return normalized;
  }

  return "uncertain";
}

function toCheckMap(value: Record<string, unknown> | undefined) {
  return Object.entries(value ?? {}).reduce<Record<string, string>>((result, [key, entry]) => {
    result[key] = normalizeStatusValue(entry);
    return result;
  }, {});
}

function buildBusinessAddressLabel(context: SupplierBusinessContext) {
  return [
    context.businessLocation,
    context.city,
    context.province,
    context.region,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildSiteSchema() {
  return {
    type: "object",
    properties: {
      extracted_fields: {
        type: "object",
        properties: {
          signage_text: { type: "string" },
          exterior_summary: { type: "string" },
          signage_summary: { type: "string" },
          shared_landmarks: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: true,
      },
      checks: {
        type: "object",
        properties: {
          exterior_image_quality: { type: "string" },
          signage_image_quality: { type: "string" },
          storefront_visible: { type: "string" },
          signage_text_visible: { type: "string" },
          signage_matches_business_name: { type: "string" },
          signage_belongs_to_storefront: { type: "string" },
          exterior_matches_street_view: { type: "string" },
          tamper_screen: { type: "string" },
        },
        additionalProperties: true,
      },
      confidence_score: { type: "number" },
      notes: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["extracted_fields", "checks", "confidence_score", "notes"],
    additionalProperties: false,
  } satisfies Record<string, unknown>;
}

function buildMetadataText(metadata: ReturnType<typeof extractImageCaptureMetadata>) {
  return [
    `Captured at: ${metadata.capturedAt ?? "[missing]"}`,
    `Metadata source: ${metadata.source ?? "[missing]"}`,
    `Age in days: ${metadata.ageDays ?? "[unknown]"}`,
    `Recent enough (<= ${SITE_IMAGE_MAX_AGE_DAYS} days): ${metadata.isRecent ? "yes" : "no"}`,
  ].join("\n");
}

function buildSitePrompt(params: {
  businessContext: SupplierBusinessContext;
  normalizedAddress: string | null;
  streetViewStatus: "available" | "unavailable" | "unknown";
  streetViewOutdated: boolean;
  streetViewCaptureDate: string | null;
  exteriorMetadata: ReturnType<typeof extractImageCaptureMetadata>;
  signageMetadata: ReturnType<typeof extractImageCaptureMetadata>;
}) {
  return [
    "You are verifying supplier establishment images for automated onboarding.",
    "The flow is binary: only approve when the evidence is clear and reliable.",
    "Use pass only when the evidence clearly supports the check.",
    "Use fail when the evidence clearly contradicts the check or the required evidence is missing.",
    "Use uncertain when the image is blurry, partially obstructed, cropped, or ambiguous.",
    "The required uploaded images are: one exterior image and one storefront signage image.",
    "The supplier may be an SME with a small stall, kiosk, or a unit inside a commercial building.",
    "Do not require a standalone building, warehouse facade, or a Google Maps listing.",
    "The signage image must show readable signage that aligns with the registered business name.",
    "Minor formatting differences, legal suffix differences, and short abbreviations can still pass when they clearly refer to the same business name.",
    "A shortened storefront brand can still pass when it clearly uses the distinctive anchor name from the registered business name, such as the owner-brand portion before generic words like Food Products or Trading.",
    "A materially different business name should fail.",
    "Compare the exterior and signage images against each other first.",
    "Check whether the signage photo appears to belong to the same storefront or stall shown in the exterior photo by comparing visible landmarks, facade details, colors, neighboring structures, shutters, counters, columns, awnings, or unit markers.",
    "If Google Street View is missing or outdated, do not fail the establishment solely for that reason. Treat Google evidence as optional support only.",
    "Assess these checks: exterior_image_quality, signage_image_quality, storefront_visible, signage_text_visible, signage_matches_business_name, signage_belongs_to_storefront, exterior_matches_street_view, tamper_screen.",
    "Extract signage_text when visible. Extract shared_landmarks as short phrases when possible.",
    "",
    "Business context:",
    `Business name: ${params.businessContext.businessName ?? ""}`,
    `Submitted address: ${buildBusinessAddressLabel(params.businessContext)}`,
    `Google normalized address: ${params.normalizedAddress ?? "[not available]"}`,
    "",
    "Google Street View context:",
    `Street View status: ${params.streetViewStatus}`,
    `Street View capture date: ${params.streetViewCaptureDate ?? "[unknown]"}`,
    `Street View flagged as outdated: ${params.streetViewOutdated ? "yes" : "no"}`,
    "",
    "Uploaded exterior metadata:",
    buildMetadataText(params.exteriorMetadata),
    "",
    "Uploaded signage metadata:",
    buildMetadataText(params.signageMetadata),
  ].join("\n");
}

function buildOverallFailureNotes(checks: Record<string, string>) {
  const notes: string[] = [];

  if (checks.exterior_image_quality !== "pass") {
    notes.push("The exterior photo was too blurry, cropped, dark, or unclear.");
  }

  if (checks.storefront_visible !== "pass") {
    notes.push("The exterior photo did not clearly show the storefront or establishment exterior.");
  }

  if (checks.signage_image_quality !== "pass") {
    notes.push("The signage photo was too blurry, cropped, dark, or unclear.");
  }

  if (checks.signage_text_visible !== "pass") {
    notes.push("The storefront signage was not readable enough for verification.");
  }

  if (checks.signage_matches_business_name !== "pass") {
    notes.push("The visible signage did not match or clearly correspond to the registered business name.");
  }

  if (checks.signage_belongs_to_storefront !== "pass") {
    notes.push(
      "The signage photo did not clearly appear to belong to the same storefront or stall shown in the exterior photo."
    );
  }

  if (checks.exterior_metadata_recency !== "pass") {
    notes.push(
      `The exterior photo did not include recent original capture metadata within ${SITE_IMAGE_MAX_AGE_DAYS} days.`
    );
  }

  if (checks.signage_metadata_recency !== "pass") {
    notes.push(
      `The signage photo did not include recent original capture metadata within ${SITE_IMAGE_MAX_AGE_DAYS} days.`
    );
  }

  if (checks.street_view_alignment_required === "fail") {
    notes.push(
      "Google Street View was available but did not align closely enough with the submitted exterior image."
    );
  }

  if (checks.tamper_screen !== "pass") {
    notes.push("The uploaded images showed signs of editing, overlays, or inconsistent visual evidence.");
  }

  return notes;
}

function buildPerImageReviewNotes(checks: Record<string, string>) {
  const exteriorNotes: string[] = [];
  const signageNotes: string[] = [];

  if (checks.exterior_image_quality !== "pass") {
    exteriorNotes.push("Retake the exterior photo with a clearer, brighter full-building view.");
  }

  if (checks.storefront_visible !== "pass") {
    exteriorNotes.push(
      "Retake the exterior photo so the storefront, stall front, or business entrance is fully visible."
    );
  }

  if (checks.exterior_metadata_recency !== "pass") {
    exteriorNotes.push(
      `Retake the exterior photo with original capture metadata dated within ${SITE_IMAGE_MAX_AGE_DAYS} days.`
    );
  }

  if (checks.street_view_alignment_required === "fail") {
    exteriorNotes.push(
      "The submitted exterior did not align with the available Google Street View location for the business address."
    );
  }

  if (checks.signage_image_quality !== "pass") {
    signageNotes.push("Retake the signage photo with a clearer, closer view of the storefront sign.");
  }

  if (checks.signage_text_visible !== "pass") {
    signageNotes.push("Retake the signage photo so the business name on the sign is readable.");
  }

  if (checks.signage_matches_business_name !== "pass") {
    signageNotes.push(
      "The storefront sign must match or clearly correspond to the registered business name in the profile."
    );
  }

  if (checks.signage_belongs_to_storefront !== "pass") {
    exteriorNotes.push(
      "Retake the exterior photo so the same sign or nearby landmarks visible in the signage photo are also visible."
    );
    signageNotes.push(
      "Retake the signage photo from an angle that still shows enough of the storefront or nearby landmarks to tie it to the exterior photo."
    );
  }

  if (checks.signage_metadata_recency !== "pass") {
    signageNotes.push(
      `Retake the signage photo with original capture metadata dated within ${SITE_IMAGE_MAX_AGE_DAYS} days.`
    );
  }

  if (checks.tamper_screen !== "pass") {
    exteriorNotes.push("Upload an original unedited exterior photo.");
    signageNotes.push("Upload an original unedited signage photo.");
  }

  return {
    exterior: exteriorNotes,
    signage: signageNotes,
  };
}

function formatRejectedImageReviewNotes(imageType: "exterior" | "signage", notes: string[]) {
  const guidance =
    imageType === "signage"
      ? "Your photo was declined. Please make sure that your business name is legible in your signage photo and that the sign can be tied to the same storefront."
      : "Your photo was declined. Please make sure that your storefront or stall exterior is clearly visible and matches the same establishment shown in your signage photo.";

  return notes.length > 0 ? `${guidance} ${notes.join(" ")}` : guidance;
}

function buildRejectedSiteSummary(params: {
  notes: string[];
  deliverabilityStatus: SiteVerificationSummary["deliverabilityStatus"];
  streetViewStatus: SiteVerificationSummary["streetViewStatus"];
}) {
  return {
    status: "rejected",
    similarityScore: null,
    deliverabilityStatus: params.deliverabilityStatus,
    streetViewStatus: params.streetViewStatus,
    manualReviewRequired: false,
    notes: params.notes,
  } satisfies SiteVerificationSummary;
}

export async function runSiteVerificationLive(params: {
  businessContext: SupplierBusinessContext;
  siteImages: SiteImageArtifact[];
}) {
  const exteriorImage = params.siteImages.find((image) => image.imageType === "exterior");
  const signageImage = params.siteImages.find((image) => image.imageType === "signage");

  if (!exteriorImage || !signageImage) {
    const summary = buildRejectedSiteSummary({
      notes: [
        "Both exterior and storefront signage images are required for automated site verification.",
      ],
      deliverabilityStatus: "unknown",
      streetViewStatus: "unknown",
    });

    return {
      summary,
      reviewNotes: summary.notes.join(" "),
      imageResults: {
        exterior: {
          status: "rejected",
          reviewNotes: "An exterior image is required for verification.",
          analysisResult: {},
          verifiedAt: null,
        },
        signage: {
          status: "rejected",
          reviewNotes: "A signage image is required for verification.",
          analysisResult: {},
          verifiedAt: null,
        },
      } satisfies Record<string, SiteImageVerificationResult>,
      siteVerificationCheck: {
        submittedAddress: buildBusinessAddressLabel(params.businessContext),
        normalizedAddress: null,
        geocodePayload: {},
        streetViewMetadata: {},
        streetViewImageUrl: null,
        comparisonPayload: {},
        similarityScore: null,
        deliverabilityStatus: summary.deliverabilityStatus,
        streetViewStatus: summary.streetViewStatus,
        verifiedAt: null,
      },
    };
  }

  const [exteriorStorageFile, signageStorageFile] = await Promise.all([
    downloadVerificationStorageObject("site-verification-images", exteriorImage.imageUrl),
    downloadVerificationStorageObject("site-verification-images", signageImage.imageUrl),
  ]);

  const exteriorMetadata = extractImageCaptureMetadata({
    bytes: exteriorStorageFile.bytes,
    mimeType: exteriorStorageFile.mimeType,
  });
  const signageMetadata = extractImageCaptureMetadata({
    bytes: signageStorageFile.bytes,
    mimeType: signageStorageFile.mimeType,
  });
  const addressLabel = buildBusinessAddressLabel(params.businessContext);
  const geocodeResult = await geocodeBusinessAddress(addressLabel).catch((error) => {
    console.error("Unable to geocode supplier business address.", error);
    return null;
  });
  const streetViewResult =
    geocodeResult?.location != null
      ? await fetchStreetViewForLocation(geocodeResult.location).catch((error) => {
          console.error("Unable to fetch Google Street View data.", error);
          return null;
        })
      : null;

  const geocodeDeliverable = geocodeResult?.location ? "pass" : "uncertain";
  const exteriorMetadataStatus = exteriorMetadata.isRecent ? "pass" : "fail";
  const signageMetadataStatus = signageMetadata.isRecent ? "pass" : "fail";

  const geminiResult = await generateGeminiStructuredOutput<SiteVerificationGeminiResponse>({
    prompt: buildSitePrompt({
      businessContext: params.businessContext,
      normalizedAddress: geocodeResult?.formattedAddress ?? null,
      streetViewStatus: streetViewResult?.status ?? "unknown",
      streetViewOutdated: streetViewResult?.isOutdated ?? false,
      streetViewCaptureDate: streetViewResult?.captureDate ?? null,
      exteriorMetadata,
      signageMetadata,
    }),
    schema: buildSiteSchema(),
    inlineMedia: [
      {
        mimeType: exteriorStorageFile.mimeType,
        bytes: exteriorStorageFile.bytes,
      },
      {
        mimeType: signageStorageFile.mimeType,
        bytes: signageStorageFile.bytes,
      },
      ...(streetViewResult?.imageBytes
        ? [
            {
              mimeType: "image/jpeg",
              bytes: streetViewResult.imageBytes,
            },
          ]
        : []),
    ],
  });

  const extractedFields = geminiResult.parsed.extracted_fields ?? {};
  const geminiChecks = toCheckMap(geminiResult.parsed.checks);
  const signageText = String(extractedFields.signage_text ?? "").trim();
  const businessNameMatch = matchBusinessNameForSignage(
    signageText,
    params.businessContext.businessName
  );
  const checks: Record<string, string> = {
    ...geminiChecks,
    geocode_deliverable: geocodeDeliverable,
    exterior_metadata_recency: exteriorMetadataStatus,
    signage_metadata_recency: signageMetadataStatus,
    signage_matches_business_name: signageText
      ? businessNameMatch.matched
        ? "pass"
        : normalizeStatusValue(geminiChecks.signage_matches_business_name)
      : "fail",
  };

  checks.exterior_image_quality = normalizeStatusValue(checks.exterior_image_quality);
  checks.signage_image_quality = normalizeStatusValue(checks.signage_image_quality);
  checks.storefront_visible = normalizeStatusValue(checks.storefront_visible);
  checks.signage_text_visible = normalizeStatusValue(checks.signage_text_visible);
  checks.signage_belongs_to_storefront = normalizeStatusValue(
    checks.signage_belongs_to_storefront
  );
  checks.tamper_screen = normalizeStatusValue(checks.tamper_screen);

  if (
    streetViewResult?.status === "available" &&
    !streetViewResult.isOutdated
  ) {
    checks.street_view_alignment_required =
      normalizeStatusValue(checks.exterior_matches_street_view) === "pass"
        ? "pass"
        : "fail";
  } else {
    checks.street_view_alignment_required = "pass";
  }

  const confidenceScore = Number(geminiResult.parsed.confidence_score ?? 0);
  const failedCriticalChecks = [
    "exterior_image_quality",
    "signage_image_quality",
    "storefront_visible",
    "signage_text_visible",
    "signage_matches_business_name",
    "signage_belongs_to_storefront",
    "exterior_metadata_recency",
    "signage_metadata_recency",
    "street_view_alignment_required",
    "tamper_screen",
  ].filter((key) => checks[key] !== "pass");

  const approved = failedCriticalChecks.length === 0 && confidenceScore >= 75;
  const perImageReviewNotes = buildPerImageReviewNotes(checks);
  const overallFailureNotes = buildOverallFailureNotes(checks);
  const summary: SiteVerificationSummary = {
    status: approved ? "approved" : "rejected",
    similarityScore:
      streetViewResult?.status === "available" && !streetViewResult.isOutdated
        ? confidenceScore
        : null,
    deliverabilityStatus: geocodeResult?.location ? "deliverable" : "undeliverable",
    streetViewStatus: streetViewResult?.status ?? "unknown",
    manualReviewRequired: false,
    notes: approved
      ? [
          ...(Array.isArray(geminiResult.parsed.notes)
            ? geminiResult.parsed.notes.map((note) => String(note))
            : []),
          streetViewResult?.status === "available" && !streetViewResult.isOutdated
            ? "Google Street View was available and aligned with the submitted establishment images."
            : "Google Street View was unavailable or outdated, so approval relied primarily on the uploaded images and metadata.",
        ]
      : [
          ...(Array.isArray(geminiResult.parsed.notes)
            ? geminiResult.parsed.notes.map((note) => String(note))
            : []),
          ...overallFailureNotes,
          "Site verification is automated and binary. Any failed critical image, metadata, or cross-image consistency check results in rejection.",
        ],
  };
  const verifiedAt = approved ? new Date().toISOString() : null;

  return {
    summary,
    reviewNotes: summary.notes.join(" "),
    imageResults: {
      exterior: {
        status: approved ? "approved" : "rejected",
        reviewNotes: approved
          ? "Exterior image verified successfully."
          : formatRejectedImageReviewNotes("exterior", perImageReviewNotes.exterior),
        analysisResult: {
          imageType: "exterior",
          metadata: exteriorMetadata,
          checks: {
            geocode_deliverable: checks.geocode_deliverable,
            exterior_image_quality: checks.exterior_image_quality,
            storefront_visible: checks.storefront_visible,
            exterior_metadata_recency: checks.exterior_metadata_recency,
            street_view_alignment_required: checks.street_view_alignment_required,
            tamper_screen: checks.tamper_screen,
          },
        },
        verifiedAt,
      },
      signage: {
        status: approved ? "approved" : "rejected",
        reviewNotes: approved
          ? "Storefront signage image verified successfully."
          : formatRejectedImageReviewNotes("signage", perImageReviewNotes.signage),
        analysisResult: {
          imageType: "signage",
          metadata: signageMetadata,
          extracted_fields: {
            signage_text: signageText,
            shared_landmarks: extractedFields.shared_landmarks ?? [],
          },
          business_name_match: businessNameMatch,
          checks: {
            signage_image_quality: checks.signage_image_quality,
            signage_text_visible: checks.signage_text_visible,
            signage_matches_business_name: checks.signage_matches_business_name,
            signage_belongs_to_storefront: checks.signage_belongs_to_storefront,
            signage_metadata_recency: checks.signage_metadata_recency,
            tamper_screen: checks.tamper_screen,
          },
        },
        verifiedAt,
      },
    } satisfies Record<string, SiteImageVerificationResult>,
    siteVerificationCheck: {
      submittedAddress: addressLabel,
      normalizedAddress: geocodeResult?.formattedAddress ?? null,
      geocodePayload: geocodeResult?.raw ?? {},
      streetViewMetadata: {
        ...(streetViewResult?.raw ?? {}),
        normalized_capture_date: streetViewResult?.captureDate ?? null,
        flagged_outdated: streetViewResult?.isOutdated ?? false,
      },
      streetViewImageUrl: streetViewResult?.imageUrl ?? null,
      comparisonPayload: {
        checks,
        extracted_fields: extractedFields,
        gemini: {
          parsed: geminiResult.parsed,
          raw: geminiResult.raw,
        },
        business_name_match: businessNameMatch,
        uploaded_metadata: {
          exterior: exteriorMetadata,
          signage: signageMetadata,
        },
      },
      similarityScore: summary.similarityScore,
      deliverabilityStatus: summary.deliverabilityStatus,
      streetViewStatus: summary.streetViewStatus,
      verifiedAt,
    },
  };
}
