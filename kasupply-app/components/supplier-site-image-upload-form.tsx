"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountActivatedModal } from "@/components/modals/account-activated-modal";
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

function SpinnerIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42 0L3.29 9.22a1 1 0 1 1 1.42-1.408l4.04 4.075 6.54-6.59a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function isVerifyingStatus(status?: string) {
  return ["pending", "processing", "verifying"].includes(status ?? "");
}

function isFailedStatus(status?: string) {
  return ["rejected", "review_required"].includes(status ?? "");
}

function getVerificationState(status?: string) {
  if (!status) return null;

  if (isVerifyingStatus(status)) {
    return {
      cardClassName: "bg-[#f8faff]",
      badgeClassName: "bg-[#eaf2ff] text-[#1f3d67]",
      messageClassName: "text-[#1f3d67]",
      badgeText: "Verifying",
      message: "Verifying your image, please wait...",
      icon: <SpinnerIcon />,
    };
  }

  if (status === "approved") {
    return {
      cardClassName: "bg-[#f0fdf4]",
      badgeClassName: "bg-[#dcfce7] text-[#15803d]",
      messageClassName: "text-[#15803d]",
      badgeText: "Verified",
      message: "Image verified successfully",
      icon: <CheckIcon />,
    };
  }

  if (isFailedStatus(status)) {
    return {
      cardClassName: "bg-[#fff1f2]",
      badgeClassName: "bg-[#ffe4e6] text-[#dc2626]",
      messageClassName: "text-[#dc2626]",
      badgeText: "Failed",
      message:
        "We couldn't verify this image. Please resubmit a clear, unobstructed photo.",
      icon: <XIcon />,
    };
  }

  return null;
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
  const [showActivatedModal, setShowActivatedModal] = useState(false);
  const [uploadedState, setUploadedState] = useState<Record<string, ExistingImageRecord>>(
    () =>
      existingImages.reduce<Record<string, ExistingImageRecord>>((acc, image) => {
        acc[image.image_type] = image;
        return acc;
      }, {})
  );

  const allRequiredUploaded = useMemo(
    () =>
      SITE_IMAGE_REQUIREMENTS.every(
        (requirement) => uploadedState[requirement.imageType]?.status === "approved"
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
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[#223654]">
              Verification Requirement
            </h1>
            <p className="mt-0.5 text-[18px] leading-6 text-[#8b95a5]">
              KaSupply requires verification to maintain a trusted supplier network
            </p>
          </div>
          <p className="text-[16px] font-semibold text-[#223654]">
            {allRequiredUploaded ? "Step 3 of 3" : "Step 2 of 3"}
          </p>
        </div>

        <div className="mb-5 mt-5 flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f3d67] text-[11px] font-semibold text-white">
              1
            </div>
            <span className="truncate text-[15px] font-medium text-[#1f3d67]">
              Profile Setup
            </span>
          </div>
          <div className="h-px flex-1 bg-[#d7dee8]" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f3d67] text-[11px] font-semibold text-white">
              2
            </div>
            <span className="truncate text-[15px] font-medium text-[#1f3d67]">
              Verification
            </span>
          </div>
          <div className="h-px flex-1 bg-[#d7dee8]" />
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                allRequiredUploaded
                  ? "bg-[#1f3d67] text-white"
                  : "bg-[#e8ecf2] text-[#9aa5b4]"
              }`}
            >
              3
            </div>
            <span
              className={`truncate text-[15px] font-medium ${
                allRequiredUploaded ? "text-[#1f3d67]" : "text-[#9aa5b4]"
              }`}
            >
              User Verified
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <h2 className="text-[20px] font-semibold leading-tight text-[#1f3d67]">
            Site Showcase Images
          </h2>
          <p className="mt-0.5 text-[16px] text-[#8b95a5]">
            Upload a clear photo for each requirement. All images are required and will be verified automatically.
          </p>
        </div>

        <div className="space-y-3">
          {SITE_IMAGE_REQUIREMENTS.map((requirement) => {
            const selectedFile = selectedFiles[requirement.imageType];
            const uploaded = uploadedState[requirement.imageType];
            const verificationState = getVerificationState(uploaded?.status);
            const isVerifying = isVerifyingStatus(uploaded?.status);
            const isFailed = isFailedStatus(uploaded?.status);
            const isApproved = uploaded?.status === "approved";
            const isUploadDisabled =
              isVerifying || !selectedFile || isUploading[requirement.imageType];

            const uploadButtonText = isVerifying
              ? "Verifying..."
              : isUploading[requirement.imageType]
                ? "Uploading..."
                : isApproved || isFailed
                  ? "Resubmit"
                  : "Upload";

            const uploadButtonClassName = isFailed
              ? "rounded-md bg-[#e11d48] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#be1037] disabled:cursor-not-allowed disabled:bg-[#c3ccd9]"
              : "rounded-md bg-[#1f3d67] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#193354] disabled:cursor-not-allowed disabled:bg-[#c3ccd9]";

            return (
              <form
                key={requirement.imageType}
                onSubmit={(event) => handleUpload(event, requirement)}
                className={`rounded-[12px] border border-[#edf2f7] p-4 ${
                  verificationState?.cardClassName ?? "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ImageIcon />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#1f3d67]">
                        {requirement.label}
                      </p>

                      {verificationState ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${verificationState.badgeClassName}`}
                        >
                          {verificationState.badgeText}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-[1px] text-[13px] text-[#b0b8c5]">
                      {requirement.description}
                    </p>

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
                      disabled={isVerifying}
                      onChange={(event) =>
                        updateSelectedFile(
                          requirement.imageType,
                          event.target.files?.[0] ?? null
                        )
                      }
                    />

                    <label
                      htmlFor={isVerifying ? undefined : requirement.imageType}
                      aria-disabled={isVerifying}
                      className={`rounded-md border border-[#d7dee8] bg-white px-4 py-2 text-[13px] text-[#6b7280] transition hover:bg-[#f8fafc] ${
                        isVerifying
                          ? "cursor-not-allowed opacity-60 hover:bg-white"
                          : "cursor-pointer"
                      }`}
                    >
                      Choose file
                    </label>

                    <button
                      type="submit"
                      disabled={isUploadDisabled}
                      className={uploadButtonClassName}
                    >
                      {uploadButtonText}
                    </button>
                  </div>
                </div>

                {verificationState ? (
                  <div
                    className={`mt-3 flex items-center gap-1.5 text-[13px] font-medium ${verificationState.messageClassName}`}
                  >
                    {verificationState.icon}
                    <span>{verificationState.message}</span>
                  </div>
                ) : null}
              </form>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link
            href="/onboarding/supplier-documents"
            className="px-2 py-2 text-sm font-medium text-[#6b7280] transition hover:text-[#1f3d67]"
          >
            Back
          </Link>

          {allRequiredUploaded ? (
            <button
              type="button"
              onClick={() => setShowActivatedModal(true)}
              className="rounded-md bg-[#1f3d67] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193354]"
            >
              Finish
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-[#c3ccd9] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Finish
            </button>
          )}
        </div>
      </div>

      <AccountActivatedModal
        isOpen={showActivatedModal}
        title="Account activated!"
        description="Your supplier account is verified and ready. You can now start managing inventory, responding to RFQs, and growing your presence on KaSupply."
        ctaHref="/supplier/dashboard"
        ctaLabel="Go To Dashboard"
      />
    </>
  );
}