const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_STREET_VIEW_METADATA_URL =
  "https://maps.googleapis.com/maps/api/streetview/metadata";
const GOOGLE_STREET_VIEW_IMAGE_URL =
  "https://maps.googleapis.com/maps/api/streetview";

type GeocodeApiResponse = {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    types?: string[];
  }>;
  error_message?: string;
};

type StreetViewMetadataApiResponse = {
  status?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  pano_id?: string;
  date?: string;
  copyright?: string;
  error_message?: string;
};

export type GoogleGeocodeResult = {
  formattedAddress: string | null;
  placeId: string | null;
  location: {
    lat: number;
    lng: number;
  } | null;
  types: string[];
  raw: Record<string, unknown>;
};

export type GoogleStreetViewResult = {
  status: "available" | "unavailable" | "unknown";
  imageUrl: string | null;
  imageBytes: Buffer | null;
  captureDate: string | null;
  isOutdated: boolean;
  raw: Record<string, unknown>;
};

function getMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey?.trim()) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured.");
  }

  return apiKey.trim();
}

function buildUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function normalizeStreetViewDate(value: string | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01T00:00:00.000Z`;
  }

  if (/^\d{4}$/.test(normalized)) {
    return `${normalized}-01-01T00:00:00.000Z`;
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function isOlderThanMonths(isoDate: string | null, months: number) {
  if (!isoDate) {
    return false;
  }

  const parsedDate = Date.parse(isoDate);

  if (Number.isNaN(parsedDate)) {
    return false;
  }

  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);

  return parsedDate < threshold.getTime();
}

export async function geocodeBusinessAddress(address: string) {
  const apiKey = getMapsApiKey();
  const response = await fetch(
    buildUrl(GOOGLE_GEOCODE_URL, {
      address,
      key: apiKey,
    })
  );

  if (!response.ok) {
    throw new Error(`Google Geocoding API failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GeocodeApiResponse;
  const firstResult = data.results?.[0];

  return {
    formattedAddress: firstResult?.formatted_address ?? null,
    placeId: firstResult?.place_id ?? null,
    location:
      typeof firstResult?.geometry?.location?.lat === "number" &&
      typeof firstResult?.geometry?.location?.lng === "number"
        ? {
            lat: firstResult.geometry.location.lat,
            lng: firstResult.geometry.location.lng,
          }
        : null,
    types: firstResult?.types ?? [],
    raw: data as Record<string, unknown>,
  } satisfies GoogleGeocodeResult;
}

export async function fetchStreetViewForLocation(params: {
  lat: number;
  lng: number;
}) {
  const apiKey = getMapsApiKey();
  const location = `${params.lat},${params.lng}`;
  const metadataResponse = await fetch(
    buildUrl(GOOGLE_STREET_VIEW_METADATA_URL, {
      location,
      size: "640x640",
      source: "outdoor",
      key: apiKey,
    })
  );

  if (!metadataResponse.ok) {
    throw new Error(
      `Google Street View metadata request failed with status ${metadataResponse.status}.`
    );
  }

  const metadata = (await metadataResponse.json()) as StreetViewMetadataApiResponse;

  if (metadata.status !== "OK") {
    return {
      status:
        metadata.status === "ZERO_RESULTS" ? "unavailable" : "unknown",
      imageUrl: null,
      imageBytes: null,
      captureDate: normalizeStreetViewDate(metadata.date),
      isOutdated: false,
      raw: metadata as Record<string, unknown>,
    } satisfies GoogleStreetViewResult;
  }

  const imageUrl = buildUrl(GOOGLE_STREET_VIEW_IMAGE_URL, {
    size: "640x640",
    location,
    source: "outdoor",
    key: apiKey,
  }).toString();

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    return {
      status: "unknown",
      imageUrl,
      imageBytes: null,
      captureDate: normalizeStreetViewDate(metadata.date),
      isOutdated: false,
      raw: {
        ...metadata,
        image_fetch_status: imageResponse.status,
      } as Record<string, unknown>,
    } satisfies GoogleStreetViewResult;
  }

  const captureDate = normalizeStreetViewDate(metadata.date);

  return {
    status: "available",
    imageUrl,
    imageBytes: Buffer.from(await imageResponse.arrayBuffer()),
    captureDate,
    isOutdated: isOlderThanMonths(captureDate, 36),
    raw: metadata as Record<string, unknown>,
  } satisfies GoogleStreetViewResult;
}
