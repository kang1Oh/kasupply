import type { VerificationProviderSnapshot } from "@/lib/verification/types";

function hasNonEmptyValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function getVerificationProviderSnapshot(): VerificationProviderSnapshot {
  const hasGeminiKey = hasNonEmptyValue(process.env.GEMINI_API_KEY);
  const hasVisionProjectId = hasNonEmptyValue(process.env.GOOGLE_CLOUD_PROJECT_ID);
  const hasVisionClientEmail = hasNonEmptyValue(process.env.GOOGLE_CLOUD_CLIENT_EMAIL);
  const hasVisionPrivateKey = hasNonEmptyValue(process.env.GOOGLE_CLOUD_PRIVATE_KEY);

  return {
    gemini: hasGeminiKey,
    vision: hasVisionProjectId && hasVisionClientEmail && hasVisionPrivateKey,
  };
}

export function getVerificationReadiness() {
  const snapshot = getVerificationProviderSnapshot();

  return {
    snapshot,
    canRunBuyerDocumentLive: snapshot.gemini && snapshot.vision,
    canRunSupplierDocumentLive: snapshot.gemini && snapshot.vision,
    isAnyProviderConfigured: snapshot.gemini || snapshot.vision,
  };
}
