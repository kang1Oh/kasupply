"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SupplierSiteVideoUploadForm({
  profileId,
  existingFilePath,
}: {
  profileId: number;
  existingFilePath?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [progressMessage, setProgressMessage] = useState("");

  const fileSummary = useMemo(() => {
    if (!file) return null;

    return {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "Unknown",
    };
  }, [file]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setProgressMessage("");

    if (!file) {
      setErrorMessage("Please select a site showcase video.");
      return;
    }

    const allowedTypes = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      setErrorMessage("Please upload an MP4, MOV, WEBM, or MKV file.");
      return;
    }

    const maxSizeInBytes = 50 * 1024 * 1024; // 50 MB for Supabase free plan
    if (file.size > maxSizeInBytes) {
      setErrorMessage(
        "Video is too large. Maximum allowed size is 50 MB on the current storage plan. Please upload a compressed MP4 file."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setProgressMessage("Uploading video to storage...");

      const fileExt = file.name.split(".").pop() || "mp4";
      const safeExt = fileExt.toLowerCase();
      const fileName = `site-showcase-${Date.now()}.${safeExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-showcase-videos")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || "video/mp4",
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload video file.");
      }

      setProgressMessage("Saving video record...");

      const response = await fetch("/api/onboarding/supplier-site-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath,
          previousFilePath: existingFilePath ?? null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await supabase.storage.from("site-showcase-videos").remove([filePath]);
        throw new Error(result.error || "Failed to save site showcase video.");
      }

      setSuccessMessage("Video uploaded successfully.");
      setProgressMessage("Upload complete. Redirecting...");
      router.push(result.redirectTo || "/dashboard");
      router.refresh();
    } catch (error) {
      setProgressMessage("");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to upload site showcase video."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Upload site showcase video
        </label>
        <input
          name="site_video"
          type="file"
          required
          accept="video/mp4,video/mov,video/quicktime,video/webm,video/x-matroska"
          className="w-full rounded border px-3 py-2"
          onChange={(e) => {
            setErrorMessage("");
            setSuccessMessage("");
            setProgressMessage("");
            setFile(e.target.files?.[0] ?? null);
          }}
        />
        <p className="mt-2 text-xs text-gray-500">
          Allowed: MP4, MOV, WEBM, MKV. Maximum size: 50 MB. Recommended: 1–2
          minute compressed MP4 in 720p for faster upload.
        </p>
      </div>

      {fileSummary ? (
        <div className="rounded-lg border bg-gray-50 p-3 text-sm">
          <p>
            <span className="font-medium">File:</span> {fileSummary.name}
          </p>
          <p>
            <span className="font-medium">Size:</span> {fileSummary.size}
          </p>
          <p>
            <span className="font-medium">Type:</span> {fileSummary.type}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-900">
        <p className="font-medium">Upload tips</p>
        <ul className="mt-2 space-y-1 text-blue-800">
          <li>• Use MP4 if possible</li>
          <li>• Keep the video around 1–2 minutes only</li>
          <li>• Use 720p or compressed 1080p</li>
          <li>• Show office/warehouse, signage, operations, safety, and map/sketch</li>
        </ul>
      </div>

      {progressMessage ? (
        <div className="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {progressMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isSubmitting
          ? "Uploading..."
          : existingFilePath
          ? "Replace Video"
          : "Submit Video"}
      </button>
    </form>
  );
}