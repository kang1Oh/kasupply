"use client";

import { useEffect, useState } from "react";
import { RemoveSavedSupplierModal } from "@/components/modals";

type SavedSupplier = {
  supplierId: number;
  avatarUrl: string | null;
  businessName: string;
  businessType: string;
  city: string;
  province: string;
};

type BuyerSavedSuppliersSectionProps = {
  suppliers: SavedSupplier[];
};

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatBusinessType(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "Not provided";

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocation(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function SavedSupplierItem({
  avatarUrl,
  initials,
  name,
  subtitle,
  onRemove,
}: {
  avatarUrl: string | null;
  initials: string;
  name: string;
  subtitle: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf2f7] px-5 py-4 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`${name} avatar`}
            className="h-9 w-9 shrink-0 rounded-xl border border-[#e6edf6] object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[13px] font-semibold text-[#5f7adf]">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[#223654]">{name}</p>
          <p className="truncate text-[12px] text-[#8b95a5]">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md border border-[#e5ebf3] bg-[#fafbfd] px-3 py-1.5 text-[12px] text-[#7f8ca1] transition hover:border-[#d7e1ee] hover:text-[#223654]"
      >
        Remove
      </button>
    </div>
  );
}

export function BuyerSavedSuppliersSection({
  suppliers,
}: BuyerSavedSuppliersSectionProps) {
  const [visibleSuppliers, setVisibleSuppliers] = useState(suppliers);
  const [pendingRemoval, setPendingRemoval] = useState<SavedSupplier | null>(null);

  useEffect(() => {
    setVisibleSuppliers(suppliers);
  }, [suppliers]);

  const handleConfirmRemove = () => {
    if (!pendingRemoval) return;

    setVisibleSuppliers((current) =>
      current.filter((supplier) => supplier.supplierId !== pendingRemoval.supplierId)
    );
    setPendingRemoval(null);
  };

  return (
    <>
      {visibleSuppliers.length === 0 ? (
        <div className="px-5 py-6 text-[13px] text-[#8b95a5]">
          No saved suppliers yet.
        </div>
      ) : (
        visibleSuppliers.map((supplier) => (
          <SavedSupplierItem
            key={supplier.supplierId}
            avatarUrl={supplier.avatarUrl}
            initials={getInitials(supplier.businessName)}
            name={supplier.businessName}
            subtitle={`${formatBusinessType(supplier.businessType)} - ${formatLocation([
              supplier.city,
              supplier.province,
            ])}`}
            onRemove={() => setPendingRemoval(supplier)}
          />
        ))
      )}

      <RemoveSavedSupplierModal
        open={pendingRemoval != null}
        supplierName={pendingRemoval?.businessName ?? null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
}
