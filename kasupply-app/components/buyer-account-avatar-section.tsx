"use client";

import { useState } from "react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

type BuyerAccountAvatarSectionProps = {
  displayName: string;
  avatarUrl?: string | null;
};

export function BuyerAccountAvatarSection({
  displayName,
  avatarUrl,
}: BuyerAccountAvatarSectionProps) {
  const [selectedAvatarFileName, setSelectedAvatarFileName] = useState("");

  return (
    <section className="rounded-[12px] border border-[#e4e9f1] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            fallbackInitials="BU"
            sizes="60px"
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#DDF7E8] text-[17px] font-medium text-[#2E7D5B]"
          />

          <div className="min-w-0">
            <p className="truncate text-[17px] font-medium text-[#4A5B73]">
              {displayName}
            </p>
            <p className="mt-[5px] text-[14px] text-[#A7B0BE]">
              {selectedAvatarFileName || "JPG or PNG. Max 5MB."}
            </p>
          </div>
        </div>

        <label className="inline-flex h-[40px] cursor-pointer items-center justify-center rounded-[10px] border border-[#D8E1ED] bg-white px-[18px] text-[15px] font-medium text-[#42536B] transition hover:bg-[#F8FAFC]">
          Change photo
          <input
            name="avatar_file"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="sr-only"
            onChange={(event) =>
              setSelectedAvatarFileName(event.target.files?.[0]?.name ?? "")
            }
          />
        </label>
      </div>
    </section>
  );
}
