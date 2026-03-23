type BuyerAccessStatus = {
  authenticated: boolean;
  role: string | null;
  hasBusinessProfile: boolean;
  hasSubmittedBuyerDocuments: boolean;
};

type BuyerAccessRequirement = "authenticated" | "profile" | "documents";

type BuyerAccessRedirectOptions = {
  requirement: BuyerAccessRequirement;
  targetPath: string;
  reason?: string | null;
};

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getBuyerAccessRedirect(
  status: BuyerAccessStatus,
  options: BuyerAccessRedirectOptions,
) {
  const { requirement, targetPath, reason } = options;

  if (!status.authenticated) {
    const params = new URLSearchParams();
    params.set("next", targetPath);
    return withQuery("/login", params);
  }

  if (status.role !== "buyer") {
    return "/dashboard";
  }

  if (
    (requirement === "profile" || requirement === "documents") &&
    !status.hasBusinessProfile
  ) {
    const params = new URLSearchParams();

    if (reason) {
      params.set("required", reason);
    }

    params.set("next", targetPath);
    return withQuery("/onboarding/buyer", params);
  }

  if (requirement === "documents" && !status.hasSubmittedBuyerDocuments) {
    const params = new URLSearchParams();

    if (reason) {
      params.set("required", reason);
    }

    params.set("next", targetPath);
    return withQuery("/onboarding/buyer-documents", params);
  }

  return null;
}
