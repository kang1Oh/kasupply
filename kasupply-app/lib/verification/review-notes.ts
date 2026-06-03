function extractStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

export function resolveStoredVerificationNotes(params: {
  reviewNotes: string | null | undefined;
  verificationAnalysis: Record<string, unknown> | null | undefined;
}) {
  const verificationAnalysis = params.verificationAnalysis ?? {};
  const candidateLists = [
    extractStringList(verificationAnalysis.notes),
    extractStringList(
      verificationAnalysis.summary &&
        typeof verificationAnalysis.summary === "object" &&
        verificationAnalysis.summary !== null
        ? (verificationAnalysis.summary as Record<string, unknown>).notes
        : null
    ),
    extractStringList(
      verificationAnalysis.gemini &&
        typeof verificationAnalysis.gemini === "object" &&
        verificationAnalysis.gemini !== null &&
        (verificationAnalysis.gemini as Record<string, unknown>).parsed &&
        typeof (verificationAnalysis.gemini as Record<string, unknown>).parsed === "object" &&
        (verificationAnalysis.gemini as Record<string, unknown>).parsed !== null
        ? (
            (verificationAnalysis.gemini as Record<string, unknown>).parsed as Record<
              string,
              unknown
            >
          ).notes
        : null
    ),
  ];

  const resolvedNotes = candidateLists.find((notes) => notes.length > 0);

  if (resolvedNotes) {
    return resolvedNotes.join(" ");
  }

  const fallbackReviewNotes = String(params.reviewNotes ?? "").trim();
  return fallbackReviewNotes || null;
}
