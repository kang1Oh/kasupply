import Image from "next/image";
import { cn } from "@/lib/utils/utils";

type ProfileAvatarProps = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
  alt?: string;
  sizes?: string;
  fallbackInitials?: string;
};

function getInitials(value: string | null | undefined, fallbackInitials: string) {
  const initials = String(value ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || fallbackInitials;
}

export function ProfileAvatar({
  name,
  avatarUrl,
  className,
  alt,
  sizes = "80px",
  fallbackInitials = "NA",
}: ProfileAvatarProps) {
  if (avatarUrl) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={avatarUrl}
          alt={alt ?? `${name ?? "Profile"} avatar`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      </div>
    );
  }

  return <div className={className}>{getInitials(name, fallbackInitials)}</div>;
}
