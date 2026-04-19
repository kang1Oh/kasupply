import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function inferMimeTypeFromPath(filePath: string) {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".doc")) return "application/msword";
  if (lowerPath.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

export async function downloadVerificationStorageObject(bucket: string, filePath: string) {
  const adminClient = createAdminClient();

  if (adminClient) {
    const { data, error } = await adminClient.storage.from(bucket).download(filePath);

    if (error) {
      throw new Error(error.message || "Failed to download verification file from storage.");
    }

    return {
      bytes: Buffer.from(await data.arrayBuffer()),
      mimeType: data.type || inferMimeTypeFromPath(filePath),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).download(filePath);

  if (error) {
    throw new Error(
      `${error.message || "Failed to download verification file from storage."} Add SUPABASE_SERVICE_ROLE_KEY to .env.local if you want automated verification and admin reprocessing to work without the uploader's session.`
    );
  }

  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    mimeType: data.type || inferMimeTypeFromPath(filePath),
  };
}
