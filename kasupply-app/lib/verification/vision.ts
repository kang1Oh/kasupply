import { getGoogleCloudAccessToken } from "@/lib/verification/google-auth";

const VISION_IMAGE_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate";
const VISION_FILE_ANNOTATE_URL = "https://vision.googleapis.com/v1/files:annotate";

type VisionTextAnnotation = {
  text?: string;
};

type VisionAnnotateImageResponse = {
  fullTextAnnotation?: VisionTextAnnotation;
  error?: {
    message?: string;
  };
};

type VisionFilePageResponse = {
  fullTextAnnotation?: VisionTextAnnotation;
  error?: {
    message?: string;
  };
};

type VisionFileResponse = {
  responses?: VisionFilePageResponse[];
  error?: {
    message?: string;
  };
};

export type VisionOcrResult = {
  text: string;
  mode: "image" | "pdf";
  raw: Record<string, unknown>;
};

async function callVisionApi<TResponse>(url: string, payload: Record<string, unknown>) {
  const accessToken = await getGoogleCloudAccessToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Vision API request failed with status ${response.status}.`);
  }

  return (await response.json()) as TResponse;
}

export async function extractDocumentTextWithVision(params: {
  bytes: Buffer;
  mimeType: string;
}) {
  const content = params.bytes.toString("base64");

  if (params.mimeType === "application/pdf") {
    const data = await callVisionApi<{ responses?: VisionFileResponse[] }>(
      VISION_FILE_ANNOTATE_URL,
      {
        requests: [
          {
            inputConfig: {
              mimeType: params.mimeType,
              content,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
            pages: [1],
          },
        ],
      }
    );

    const fileResponse = data.responses?.[0];
    const joinedText = (fileResponse?.responses ?? [])
      .map((response) => response.fullTextAnnotation?.text ?? "")
      .filter(Boolean)
      .join("\n\n");

    if (fileResponse?.error?.message) {
      throw new Error(fileResponse.error.message);
    }

    return {
      text: joinedText.trim(),
      mode: "pdf" as const,
      raw: data as Record<string, unknown>,
    };
  }

  if (params.mimeType === "image/png" || params.mimeType === "image/jpeg") {
    const data = await callVisionApi<{ responses?: VisionAnnotateImageResponse[] }>(
      VISION_IMAGE_ANNOTATE_URL,
      {
        requests: [
          {
            image: {
              content,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
          },
        ],
      }
    );

    const imageResponse = data.responses?.[0];

    if (imageResponse?.error?.message) {
      throw new Error(imageResponse.error.message);
    }

    return {
      text: (imageResponse?.fullTextAnnotation?.text ?? "").trim(),
      mode: "image" as const,
      raw: data as Record<string, unknown>,
    };
  }

  return null;
}
