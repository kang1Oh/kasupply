type BuyerDtiAuthoritySourceType =
  | "qr_raw_text"
  | "qr_bnrs_url"
  | "ocr_bnn_lookup";

export type BuyerDtiAuthorityFields = {
  business_name: string | null;
  owner_name: string | null;
  scope_or_location: string | null;
  validity_date: string | null;
  business_name_no: string | null;
  registration_date: string | null;
  status: string | null;
  business_territory: string | null;
};

export type BuyerDtiAuthorityResult = {
  sourceType: BuyerDtiAuthoritySourceType;
  sourceValue: string;
  resolvedUrl: string | null;
  fields: BuyerDtiAuthorityFields;
  notes: string[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 10))
    );
}

function stripTags(value: string) {
  return normalizeWhitespace(decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")));
}

function readCapture(match: RegExpMatchArray | null, index = 1) {
  return normalizeWhitespace(match?.[index] ?? "") || null;
}

export function extractBusinessNameNoFromText(text: string) {
  const patterns = [
    /business\s+name\s+no\.?\s*:?\s*([a-z0-9-]+)/i,
    /business\s+name\s+no\s+([a-z0-9-]+)/i,
    /business\s+name\s+registration\s+no\.?\s*:?\s*([a-z0-9-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  return null;
}

export function parseLegacyBuyerDtiQrText(payloadText: string) {
  const normalizedText = payloadText.replace(/\r/g, "");
  const businessName = readCapture(
    normalizedText.match(/business\s+name\s*:\s*(.+)/i)
  );
  const scope = readCapture(normalizedText.match(/scope\s*:\s*(.+)/i));
  const ownerName = readCapture(
    normalizedText.match(/business\s+owner\s*:\s*(.+)/i)
  );
  const validityDate = readCapture(
    normalizedText.match(/validity\s+date\s*:\s*(.+)/i)
  );
  const businessNameNo = readCapture(
    normalizedText.match(/business\s+name\s+no\.?\s*:?\s*(.+)/i)
  );

  const hasAnyStructuredField = Boolean(
    businessName || scope || ownerName || validityDate || businessNameNo
  );

  if (!hasAnyStructuredField) {
    return null;
  }

  return {
    sourceType: "qr_raw_text" as const,
    sourceValue: payloadText,
    resolvedUrl: null,
    fields: {
      business_name: businessName,
      owner_name: ownerName,
      scope_or_location: scope,
      validity_date: validityDate,
      business_name_no: businessNameNo,
      registration_date: null,
      status: null,
      business_territory: null,
    },
    notes: ["Legacy DTI QR payload text was parsed directly from the QR code."],
  };
}

export function isBnrsSearchUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "bnrs.dti.gov.ph" &&
      url.pathname.includes("/search")
    );
  } catch {
    return false;
  }
}

export function buildBnrsLookupUrlFromBusinessNameNo(businessNameNo: string) {
  const encoded = Buffer.from(String(businessNameNo).trim()).toString("base64");

  return `https://bnrs.dti.gov.ph/search/search_this?keyword=&keyword2=${encodeURIComponent(encoded)}`;
}

function parseBnrsSearchResultHtml(html: string) {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const noResults = /0\s+search\s+results\s+found/i.test(sanitized);

  if (noResults) {
    return null;
  }

  const rowMatch = sanitized.match(/<tr[^>]*>\s*(?:<td[\s\S]*?<\/td>\s*){7,}<\/tr>/i);

  if (!rowMatch) {
    return null;
  }

  const cells = Array.from(rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(
    (match) => stripTags(match[1] ?? "")
  );

  if (cells.length < 7) {
    return null;
  }

  return {
    business_name: cells[0] || null,
    business_territory: cells[1] || null,
    owner_name: cells[2] || null,
    business_name_no: cells[3] || null,
    registration_date: cells[4] || null,
    status: normalizeWhitespace((cells[5] || "").replace(/[↕]/g, "")) || null,
    scope_or_location: cells[6] || null,
    validity_date: null,
  };
}

export async function fetchBnrsAuthorityFromUrl(
  url: string,
  sourceType: BuyerDtiAuthoritySourceType
) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "KaSupply Verification Bot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`BNRS lookup failed with status ${response.status}.`);
  }

  const html = await response.text();
  const parsed = parseBnrsSearchResultHtml(html);

  if (!parsed) {
    throw new Error("BNRS search page did not contain a readable search result row.");
  }

  return {
    sourceType,
    sourceValue: url,
    resolvedUrl: url,
    fields: parsed,
    notes: [
      sourceType === "qr_bnrs_url"
        ? "The QR code resolved to a public BNRS search result page."
        : "The public BNRS search result page was resolved using the business name number extracted from the certificate.",
    ],
  } satisfies BuyerDtiAuthorityResult;
}
