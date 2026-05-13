export function buildVerificationFailureUserMessage(params: {
  documentLabel: string;
  rawErrorMessage: string | null;
}) {
  const rawErrorMessage = String(params.rawErrorMessage ?? "").trim();
  const normalizedMessage = rawErrorMessage.toLowerCase();

  if (
    normalizedMessage.includes("status 429") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("resource_exhausted")
  ) {
    return `Automated verification for ${params.documentLabel} is temporarily unavailable because the Gemini API quota has been reached. This is a service-side limit, not a problem with your document. Please try again later.`;
  }

  if (
    normalizedMessage.includes("status 503") ||
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("unavailable")
  ) {
    return `Automated verification for ${params.documentLabel} is temporarily unavailable because the Gemini service is experiencing high demand right now. This is a service-side issue, not a problem with your document. Please try again later.`;
  }

  if (
    normalizedMessage.includes("status 500") ||
    normalizedMessage.includes("status 502") ||
    normalizedMessage.includes("status 504")
  ) {
    return `Automated verification for ${params.documentLabel} could not be completed because the external verification service returned a temporary server error. This appears to be service-side rather than a problem with your document. Please try again later.`;
  }

  return `Automated verification for ${params.documentLabel} could not be completed because an external verification service returned an error. This appears to be service-side rather than a problem with your document. Please try again later.`;
}
