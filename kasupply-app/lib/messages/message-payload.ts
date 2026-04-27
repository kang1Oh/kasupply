export type ParsedMessagePayload = {
  kind: "text" | "image";
  text: string;
  imageUrl: string | null;
  previewText: string;
};

const IMAGE_MESSAGE_PREFIX = "__KASUPPLY_IMAGE__:";

type SerializedImageMessage = {
  type: "image";
  imageUrl: string;
  text?: string;
};

export function serializeMessagePayload(params: {
  text?: string | null;
  imageUrl?: string | null;
}) {
  const text = String(params.text ?? "").trim();
  const imageUrl = String(params.imageUrl ?? "").trim();

  if (!imageUrl) {
    return text;
  }

  return `${IMAGE_MESSAGE_PREFIX}${JSON.stringify({
    type: "image",
    imageUrl,
    text,
  } satisfies SerializedImageMessage)}`;
}

export function parseMessagePayload(
  rawValue: string | null | undefined,
  attachmentUrl?: string | null,
): ParsedMessagePayload {
  const raw = String(rawValue ?? "");
  const directAttachmentUrl = String(attachmentUrl ?? "").trim();

  if (directAttachmentUrl) {
    return {
      kind: "image",
      text: raw,
      imageUrl: directAttachmentUrl,
      previewText: raw ? `Sent an image: ${raw}` : "Sent an image",
    };
  }

  if (!raw.startsWith(IMAGE_MESSAGE_PREFIX)) {
    return {
      kind: "text",
      text: raw,
      imageUrl: null,
      previewText: raw,
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(IMAGE_MESSAGE_PREFIX.length)) as SerializedImageMessage;
    const imageUrl = String(parsed.imageUrl ?? "").trim();
    const text = String(parsed.text ?? "").trim();

    if (!imageUrl) {
      return {
        kind: "text",
        text: raw,
        imageUrl: null,
        previewText: raw,
      };
    }

    return {
      kind: "image",
      text,
      imageUrl,
      previewText: text ? `Sent an image: ${text}` : "Sent an image",
    };
  } catch {
    return {
      kind: "text",
      text: raw,
      imageUrl: null,
      previewText: raw,
    };
  }
}
