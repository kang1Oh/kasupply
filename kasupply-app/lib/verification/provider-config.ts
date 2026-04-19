import type { VerificationProviderSnapshot } from "@/lib/verification/types";

function hasNonEmptyValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function getVerificationProviderSnapshot(): VerificationProviderSnapshot {
  const hasGeminiKey = hasNonEmptyValue(process.env.GEMINI_API_KEY);
  const hasMapsKey = hasNonEmptyValue(process.env.GOOGLE_MAPS_API_KEY);
  const hasVisionProjectId = hasNonEmptyValue(process.env.GOOGLE_CLOUD_PROJECT_ID);
  const hasVisionClientEmail = hasNonEmptyValue(process.env.GOOGLE_CLOUD_CLIENT_EMAIL);
  const hasVisionPrivateKey = hasNonEmptyValue(process.env.GOOGLE_CLOUD_PRIVATE_KEY);

  return {
    gemini: hasGeminiKey,
    maps: hasMapsKey,
    vision: hasVisionProjectId && hasVisionClientEmail && hasVisionPrivateKey,
  };
}

export function getVerificationReadiness() {
  const snapshot = getVerificationProviderSnapshot();

  return {
    snapshot,
    canRunBuyerDocumentLive: snapshot.gemini && snapshot.vision,
    canRunSupplierDocumentLive: snapshot.gemini && snapshot.vision,
    canRunSiteVerificationLive: snapshot.gemini && snapshot.maps,
    isAnyProviderConfigured: snapshot.gemini || snapshot.maps || snapshot.vision,
  };
}
