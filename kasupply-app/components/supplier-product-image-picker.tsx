"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PreviewImage = {
  id: string;
  url: string;
  file: File | null;
  existingId?: string;
  isExisting?: boolean;
};

type SupplierProductImagePickerProps = {
  name: string;
  existingImages?: Array<{
    id: string | number;
    url: string;
  }>;
  existingImageSrc?: string | null;
  existingImageAlt?: string;
};

function ReorderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M8 4 4 8l4 4M4 8h16M16 20l4-4-4-4M20 16H4M12 4v16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SupplierProductImagePicker({
  name,
  existingImages,
  existingImageSrc,
  existingImageAlt = "Product image",
}: SupplierProductImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<PreviewImage[]>(() => {
    if (existingImages && existingImages.length > 0) {
      return existingImages.map((image, index) => ({
        id: `existing-${image.id}-${index}`,
        url: image.url,
        file: null,
        existingId: String(image.id),
        isExisting: true,
      }));
    }

    return existingImageSrc
      ? [
          {
            id: "existing-image",
            url: existingImageSrc,
            file: null,
            existingId: "existing-image",
            isExisting: true,
          },
        ]
      : [];
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (!image.isExisting) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, [images]);

  const selectedFiles = useMemo(
    () => images.filter((image) => image.file instanceof File).map((image) => image.file as File),
    [images],
  );

  useEffect(() => {
    if (!inputRef.current) return;

    const dataTransfer = new DataTransfer();
    selectedFiles.forEach((file) => dataTransfer.items.add(file));
    inputRef.current.files = dataTransfer.files;
  }, [selectedFiles]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const nextImages: PreviewImage[] = Array.from(fileList)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(file),
        file,
      }));

    setImages((current) => [...current, ...nextImages]);
  }

  function moveImage(fromId: string, toId: string) {
    setImages((current) => {
      const fromIndex = current.findIndex((image) => image.id === fromId);
      const toIndex = current.findIndex((image) => image.id === toId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target && !target.isExisting) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#344054]">Product Images</p>

          <div className="mt-3 flex flex-nowrap items-start gap-3 overflow-x-auto pb-1">
            <label className="relative flex h-[86px] w-[86px] cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D4DAE5] bg-[#F7F8FA] text-[#98A2B3] transition hover:border-[#C2CCD9]">
              <input
                ref={inputRef}
                name={name}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="mt-1.5 text-[12px] font-medium">Add Photo</span>
            </label>

            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => setDraggingId(image.id)}
                onDragOver={(event) => {
                  if (!draggingId || draggingId === image.id) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!draggingId || draggingId === image.id) return;
                  event.preventDefault();
                  moveImage(draggingId, image.id);
                  setDraggingId(null);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`group relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[12px] border ${
                  index === 0 ? "border-[#CFE9CA]" : "border-[#E5EAF2]"
                } bg-[#ECFBE6]`}
                title={index === 0 ? "Cover image" : existingImageAlt}
              >
                <img
                  src={image.url}
                  alt={existingImageAlt}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5A36] text-[11px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {images
            .filter((image) => image.isExisting && image.existingId)
            .map((image) => (
              <input
                key={`existing-order-${image.id}`}
                type="hidden"
                name="existing_image_ids"
                value={image.existingId}
              />
            ))}

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#B0B8C5]">
            <ReorderIcon />
            Drag thumbnails to reorder
          </p>
        </div>

        <div className="pt-[3px] text-right text-[11px] text-[#98A2B3]">
          First Image = Cover · Drag To Reorder
        </div>
      </div>
    </div>
  );
}
