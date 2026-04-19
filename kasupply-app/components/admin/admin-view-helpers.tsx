export function DashboardCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#E5EBF3] bg-white px-[16px] py-[16px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <p className="text-[13px] font-medium text-[#6A707C]">{title}</p>
      <h2 className="mt-[8px] text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#40434A]">
        {value}
      </h2>
      <p className="mt-[10px] text-[12px] leading-[1.5] text-[#A1AAB8]">{subtitle}</p>
    </div>
  );
}

export function formatDate(value: string | null) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function toTitleCase(value: string | null | undefined) {
  const safeValue = String(value ?? "").trim();
  if (!safeValue) return "Unknown";

  return safeValue
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function getStatusPillClasses(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "approved" || normalized === "active" || normalized === "published") {
    return "border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d]";
  }

  if (normalized === "review_required" || normalized === "warned") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#b45309]";
  }

  if (normalized === "restricted" || normalized === "suspended" || normalized === "failed") {
    return "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]";
  }

  if (normalized === "banned" || normalized === "rejected") {
    return "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
  }

  if (normalized === "queued" || normalized === "processing" || normalized === "submitted") {
    return "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]";
  }

  return "border-[#dbe2ea] bg-[#f8fafc] text-[#475569]";
}
