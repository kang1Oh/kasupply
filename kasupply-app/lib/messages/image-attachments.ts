export const MESSAGE_IMAGE_BUCKET = "message-attachments";
export const MAX_MESSAGE_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MESSAGE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName) return fromName;

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function validateMessageImageFile(file: File) {
  if (!ALLOWED_MESSAGE_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_MESSAGE_IMAGE_TYPES)[number])) {
    throw new Error("Only JPG, PNG, WEBP, and GIF images can be attached.");
  }

  if (file.size > MAX_MESSAGE_IMAGE_BYTES) {
    throw new Error("Image attachments must be 5MB or smaller.");
  }
}

export async function uploadMessageImageAttachment(
  storageClient: {
    storage: {
      from: (bucket: string) => {
        upload: (
          path: string,
          file: File,
          options?: { cacheControl?: string; upsert?: boolean; contentType?: string },
        ) => Promise<{ error: { message?: string } | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
        remove: (paths: string[]) => Promise<unknown>;
      };
    };
  },
  params: {
    actorType: "buyer" | "supplier";
    actorId: number | string;
    authUserId: string;
    conversationId: number;
    file: File;
  },
) {
  validateMessageImageFile(params.file);

  const extension = getFileExtension(params.file);
  const filePath = [
    sanitizePathSegment(params.authUserId),
    "message-attachments",
    params.actorType,
    sanitizePathSegment(String(params.actorId)),
    `conversation-${sanitizePathSegment(String(params.conversationId))}`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`,
  ].join("/");

  const bucket = storageClient.storage.from(MESSAGE_IMAGE_BUCKET);
  const { error } = await bucket.upload(filePath, params.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: params.file.type,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload image attachment.");
  }

  const { data } = bucket.getPublicUrl(filePath);

  return {
    bucket: MESSAGE_IMAGE_BUCKET,
    filePath,
    publicUrl: data.publicUrl,
  };
}

export async function removeMessageImageAttachment(
  storageClient: {
    storage: {
      from: (bucket: string) => {
        remove: (paths: string[]) => Promise<unknown>;
      };
    };
  },
  bucket: string,
  filePath: string,
) {
  await storageClient.storage.from(bucket).remove([filePath]);
}
