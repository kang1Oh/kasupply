type DocumentTestModeResult = {
  enabled: boolean;
  notes: string[];
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

export function detectDocumentTestMode(ocrText: string): DocumentTestModeResult {
  const normalized = normalizeText(ocrText);
  const declaresMockDocument = includesAny(normalized, [
    "this is a mock-document for testing",
    "this is a mock document for testing",
  ]);
  const contentOnlyInstruction = includesAny(normalized, [
    "only test for document content",
    "treat it as if it s a legitimate one only test for document content",
  ]);
  const skipTamperInstruction = includesAny(normalized, [
    "does not need to undergo tampering checks",
    "doesnt need to undergo tampering checks",
    "does not need tampering checks",
    "no need for tampering checks",
  ]);

  if (!declaresMockDocument) {
    return {
      enabled: false,
      notes: [],
    };
  }

  const explicitlyEnabled = process.env.ENABLE_DOCUMENT_VERIFICATION_TEST_MODE === "true";

  if (process.env.NODE_ENV === "production" && !explicitlyEnabled) {
    return {
      enabled: false,
      notes: [
        "A mock-document marker was detected, but document test mode is disabled in production unless ENABLE_DOCUMENT_VERIFICATION_TEST_MODE is true.",
      ],
    };
  }

  if (!contentOnlyInstruction && !skipTamperInstruction) {
    return {
      enabled: false,
      notes: [
        "A mock-document marker was detected, but the content-only test instruction was incomplete.",
      ],
    };
  }

  return {
    enabled: true,
    notes: [
      "Document test mode was activated from the mock-document marker in the upload text.",
      "Content fields were evaluated while authenticity-format and tamper-only checks were relaxed for local testing.",
    ],
  };
}
