"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SITE_IMAGE_REQUIREMENTS } from "@/lib/verification/site-image-types";

type ExistingImageRecord = {
  image_id: number;
  image_type: string;
  image_url: string;
  status: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function ImageIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#edf1f7] bg-[#f8fafc] text-[#b7beca]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.75 4A1.75 1.75 0 0 0 4 5.75v12.5C4 19.22 4.78 20 5.75 20h12.5c.97 0 1.75-.78 1.75-1.75V5.75C20 4.78 19.22 4 18.25 4H5.75Zm0 1.5h12.5c.14 0 .25.11.25.25v8.11l-2.54-2.54a1.75 1.75 0 0 0-2.47 0l-.88.88-2.13-2.13a1.75 1.75 0 0 0-2.47 0L5.5 12.58V5.75c0-.14.11-.25.25-.25Zm12.5 13h-12.5a.25.25 0 0 1-.25-.25v-3.55l3.57-3.57a.25.25 0 0 1 .35 0l2.66 2.66a.75.75 0 0 0 1.06 0l1.41-1.41a.25.25 0 0 1 .35 0l3.6 3.6v2.27a.25.25 0 0 1-.25.25ZM8.75 7.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
        />
      </svg>
    </div>
  );
}

export function SupplierSiteImageUploadForm({
  existingImages,
}: {
  existingImages: ExistingImageRecord[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [errorByType, setErrorByType] = useState<Record<string, string>>({});
  const [uploadedState, setUploadedState] = useState<Record<string, ExistingImageRecord>>(
    () =>
      existingImages.reduce<Record<string, ExistingImageRecord>>((acc, image) => {
        acc[image.image_type] = image;
        return acc;
      }, {})
  );

  const allRequiredUploaded = useMemo(
    () =>
      SITE_IMAGE_REQUIREMENTS.every((requirement) =>
        Boolean(uploadedState[requirement.imageType]?.image_url)
      ),
    [uploadedState]
  );

  const updateSelectedFile = (imageType: string, file: File | null) => {
    setSelectedFiles((current) => ({ ...current, [imageType]: file }));
    setErrorByType((current) => ({ ...current, [imageType]: "" }));
  };

  async function handleUpload(
    event: React.FormEvent<HTMLFormElement>,
    requirement: (typeof SITE_IMAGE_REQUIREMENTS)[number]
  ) {
    event.preventDefault();

    const file = selectedFiles[requirement.imageType];

    if (!file) {
      setErrorByType((current) => ({
        ...current,
        [requirement.imageType]: "Please choose a file first.",
      }));
      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isAllowedType =
      (file.type &&
        requirement.allowedMimeTypes.includes(
          file.type as (typeof requirement.allowedMimeTypes)[number]
        )) ||
      requirement.allowedExtensions.includes(
        fileExtension as (typeof requirement.allowedExtensions)[number]
      );

    if (!isAllowedType) {
      setErrorByType((current) => ({
        ...current,
        [requirement.imageType]:
          "Invalid file type. Please upload a supported image file.",
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorByType((current) => ({
        ...current,
        [requirement.imageType]: "File is too large. Maximum allowed size is 5MB.",
      }));
      return;
    }

    try {
      setIsUploading((current) => ({ ...current, [requirement.imageType]: true }));
      setErrorByType((current) => ({ ...current, [requirement.imageType]: "" }));

      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();

      if (authUserError || !authUser) {
        throw new Error("You must be logged in to upload verification images.");
      }

      const safeExtension = fileExtension || "jpg";
      const fileName = `${requirement.imageType}-${Date.now()}.${safeExtension}`;
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-verification-images")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload file.");
      }

      const previousFilePath = uploadedState[requirement.imageType]?.image_url ?? null;

      const response = await fetch("/api/onboarding/supplier-site-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageType: requirement.imageType,
          filePath,
          previousFilePath,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await supabase.storage.from("site-verification-images").remove([filePath]);
        throw new Error(result.error || "Failed to save uploaded image.");
      }

      setUploadedState((current) => ({
        ...current,
        [requirement.imageType]: {
          image_id: result.image.image_id,
          image_type: result.image.image_type,
          image_url: result.image.image_url,
          status: result.image.status,
        },
      }));
      setSelectedFiles((current) => ({ ...current, [requirement.imageType]: null }));
      router.refresh();
    } catch (error) {
      setErrorByType((current) => ({
        ...current,
        [requirement.imageType]:
          error instanceof Error ? error.message : "Upload failed.",
      }));
    } finally {
      setIsUploading((current) => ({ ...current, [requirement.imageType]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-[#223654]">
                Verification Requirement
              </h1>
              <p className="mt-1 text-sm text-[#8b95a5]">
                KaSupply requires verification to maintain a trusted supplier network
              </p>
            </div>
            <p className="text-sm font-semibold text-[#223654]">Step 2 of 3</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f3d67] text-[11px] font-semibold text-white">
                1
              </div>
              <span className="truncate text-sm font-medium text-[#1f3d67]">
                Profile Setup
              </span>
            </div>
            <div className="h-px flex-1 bg-[#1f3d67]" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f3d67] text-[11px] font-semibold text-white">
                2
              </div>
              <span className="truncate text-sm font-medium text-[#1f3d67]">
                Verification
              </span>
            </div>
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e5e7eb] text-[11px] font-semibold text-[#b8bec8]">
                3
              </div>
              <span className="truncate text-sm font-medium text-[#c7ccd5]">
                User Verified
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-[22px] font-semibold text-[#223654]">
              Site Showcase Images
            </h2>
            <p className="mt-1 text-sm text-[#8b95a5]">
              Upload a clear photo for each requirement. All images are required and will be verified automatically.
            </p>
          </div>

          <div className="space-y-3">
            {SITE_IMAGE_REQUIREMENTS.map((requirement) => {
              const selectedFile = selectedFiles[requirement.imageType];
              const uploaded = uploadedState[requirement.imageType];

              return (
                <form
                  key={requirement.imageType}
                  onSubmit={(event) => handleUpload(event, requirement)}
                  className="rounded-[14px] border border-[#e4e9f1] bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <ImageIcon />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#294773]">
                        {requirement.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#b0b8c5]">
                        {requirement.description}
                      </p>
                      {uploaded ? (
                        <p className="mt-1 text-xs font-medium text-[#15803d]">
                          Uploaded - {uploaded.status}
                        </p>
                      ) : null}
                      {selectedFile ? (
                        <p className="mt-1 text-xs text-[#64748b]">
                          Selected: {selectedFile.name}
                        </p>
                      ) : null}
                      {errorByType[requirement.imageType] ? (
                        <p className="mt-1 text-xs text-[#dc2626]">
                          {errorByType[requirement.imageType]}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id={requirement.imageType}
                        type="file"
                        accept={requirement.accept}
                        className="hidden"
                        onChange={(event) =>
                          updateSelectedFile(
                            requirement.imageType,
                            event.target.files?.[0] ?? null
                          )
                        }
                      />
                      <label
                        htmlFor={requirement.imageType}
                        className="cursor-pointer rounded-md border border-[#d7dee8] bg-[#f8fafc] px-4 py-2 text-sm text-[#475569] transition hover:bg-[#f1f5f9]"
                      >
                        Choose file
                      </label>
                      <button
                        type="submit"
                        disabled={!selectedFile || isUploading[requirement.imageType]}
                        className="rounded-md bg-[#8a9ab1] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#7385a1] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUploading[requirement.imageType] ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                  </div>
                </form>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-4">
        <Link
          href="/onboarding/supplier-documents"
          className="text-sm font-medium text-[#aab3c2]"
        >
          Back
        </Link>
        {allRequiredUploaded ? (
          <Link
            href="/supplier/dashboard"
            className="rounded-md bg-[#8a9ab1] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7385a1]"
          >
            Finish
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md bg-[#c5cedb] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
