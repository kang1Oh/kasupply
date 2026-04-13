import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronRight, MessageSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { declineEngagement } from "./actions";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number | null;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  city: string | null;
  province: string | null;
};

type ProductRelation =
  | {
      product_id: number;
      product_name: string | null;
    }
  | {
      product_id: number;
      product_name: string | null;
    }[]
  | null;

type RfqRelation =
  | {
      rfq_id: number;
      buyer_id: number;
      product_id: number | null;
      requested_product_name: string | null;
      quantity: number | null;
      unit: string | null;
      target_price_per_unit: number | null;
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      created_at: string | null;
      products: ProductRelation;
    }
  | {
      rfq_id: number;
      buyer_id: number;
      product_id: number | null;
      requested_product_name: string | null;
      quantity: number | null;
      unit: string | null;
      target_price_per_unit: number | null;
      preferred_delivery_date: string | null;
      delivery_location: string | null;
      deadline: string | null;
      created_at: string | null;
      products: ProductRelation;
    }[]
  | null;

type EngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  final_quote_id: number | null;
  created_at: string | null;
  rfqs: RfqRelation;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  created_at: string | null;
};

type PurchaseOrderRow = {
  po_id: number;
  quote_id: number;
};

type DisplayStatus = "new" | "responded" | "accepted" | "closed" | "declined";

type RfqCard = {
  engagementId: number;
  rfqId: number;
  product: string;
  buyer: string;
  buyerSubtitle: string;
  initials: string;
  initialsClassName: string;
  status: DisplayStatus;
  statusLabel: string;
  statusClassName: string;
  rfqNumber: string;
  timeLabel: string;
  quantityLabel: string;
  targetPriceLabel: string;
  deliverByLabel: string;
  locationLabel: string;
  actionLabel: string;
  actionClassName: string;
  actionDisabled: boolean;
  actionHref: string | null;
  showDecline: boolean;
  sortTime: number;
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[12px] w-[12px]" fill="none" aria-hidden="true">
      <path
        d="M12 6.75v5l3 1.75m5.25-1.5a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function getSingleRfq(rfqs: RfqRelation) {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

function getProductName(rfq: ReturnType<typeof getSingleRfq>) {
  if (!rfq) return "Unnamed RFQ";
  const product = Array.isArray(rfq.products) ? rfq.products[0] : rfq.products;
  return product?.product_name || rfq.requested_product_name?.trim() || `RFQ #${rfq.rfq_id}`;
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not set";
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Received just now";
  if (diffHours < 24) return `Received ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getInitialsColors(index: number) {
  const variants = [
    "bg-[#F0FCF4] text-[#2B8A57]",
    "bg-[#FFF1E7] text-[#FF7A1A]",
    "bg-[#FDEBFF] text-[#C75BD8]",
    "bg-[#ECFDFF] text-[#0EA5B7]",
  ];
  return variants[index % variants.length] ?? variants[0];
}

function getDisplayStatus(
  engagement: EngagementRow,
  hasQuotation: boolean,
  hasPurchaseOrder: boolean,
): DisplayStatus {
  const rawStatus = String(engagement.status ?? "").toLowerCase();
  if (hasPurchaseOrder) return "closed";
  if (rawStatus === "rejected" || rawStatus === "withdrawn" || rawStatus === "declined") {
    return "declined";
  }
  if (rawStatus === "accepted") return "accepted";
  if (hasQuotation || rawStatus === "quoted") return "responded";
  return "new";
}

function getStatusPresentation(status: DisplayStatus) {
  switch (status) {
    case "new":
      return {
        label: "NEW REQUEST",
        className: "bg-[#FFF0E5] text-[#FF7A1A]",
        actionLabel: "Send Quote",
        actionClassName: "bg-[#223F68] text-white hover:bg-[#1C3455]",
        actionDisabled: false,
        showDecline: true,
      };
    case "responded":
      return {
        label: "RESPONDED",
        className: "bg-[#EAF0FF] text-[#3B82F6]",
        actionLabel: "View Quote",
        actionClassName: "bg-[#2F6DF6] text-white hover:bg-[#2458CB]",
        actionDisabled: false,
        showDecline: false,
      };
    case "accepted":
      return {
        label: "ACCEPTED",
        className: "bg-[#EAF8EF] text-[#2E8B57]",
        actionLabel: "View Details",
        actionClassName: "bg-[#1F7A47] text-white hover:bg-[#176239]",
        actionDisabled: false,
        showDecline: false,
      };
    case "closed":
      return {
        label: "CLOSED",
        className: "bg-[#EEF2F6] text-[#8A94A6]",
        actionLabel: "View Details",
        actionClassName: "bg-[#EEF2F6] text-[#B0B9C8]",
        actionDisabled: true,
        showDecline: false,
      };
    case "declined":
    default:
      return {
        label: "DECLINED",
        className: "bg-[#FFF0EE] text-[#FF5B49]",
        actionLabel: "View Details",
        actionClassName: "bg-[#EEF2F6] text-[#B0B9C8]",
        actionDisabled: true,
        showDecline: false,
      };
  }
}

export default async function SupplierRfqPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = String(resolvedSearchParams.status || "all").toLowerCase();

  const onboarding = await getUserOnboardingStatus();
  if (!onboarding.authenticated) redirect("/auth/login");
  if (onboarding.role !== "supplier") redirect("/dashboard");

  const supabase = await createClient();
  const supplierProfileId = onboarding.businessProfile?.profile_id;
  if (!supplierProfileId) redirect("/dashboard");

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", supplierProfileId)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error(supplierProfileError?.message || "Supplier profile not found.");
  }

  const { data: engagements, error: engagementsError } = await supabase
    .from("rfq_engagements")
    .select(
      `
      engagement_id,
      rfq_id,
      supplier_id,
      status,
      final_quote_id,
      created_at,
      rfqs (
        rfq_id,
        buyer_id,
        product_id,
        requested_product_name,
        quantity,
        unit,
        target_price_per_unit,
        preferred_delivery_date,
        delivery_location,
        deadline,
        created_at,
        products!rfqs_product_id_fkey (
          product_id,
          product_name
        )
      )
    `,
    )
    .eq("supplier_id", supplierProfile.supplier_id)
    .order("created_at", { ascending: false });

  if (engagementsError) {
    throw new Error(engagementsError.message || "Failed to load RFQ engagements.");
  }

  const safeEngagements = (engagements as EngagementRow[] | null) ?? [];
  const buyerIds = Array.from(
    new Set(
      safeEngagements
        .map((engagement) => getSingleRfq(engagement.rfqs)?.buyer_id)
        .filter((value): value is number => typeof value === "number"),
    ),
  );

  const { data: buyerProfiles, error: buyerProfilesError } = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .in("buyer_id", buyerIds);

  if (buyerProfilesError) {
    throw new Error(buyerProfilesError.message || "Failed to load buyer profiles.");
  }

  const buyerProfileRows = (buyerProfiles as BuyerProfileRow[] | null) ?? [];
  const businessProfileIds = buyerProfileRows
    .map((row) => row.profile_id)
    .filter((value): value is number => typeof value === "number");

  const { data: buyerBusinesses, error: buyerBusinessesError } = businessProfileIds.length
    ? await supabase
        .from("business_profiles")
        .select("profile_id, business_name, business_type, business_location, city, province")
        .in("profile_id", businessProfileIds)
    : { data: [], error: null };

  if (buyerBusinessesError) {
    throw new Error(
      buyerBusinessesError.message || "Failed to load buyer business profiles.",
    );
  }

  const profileIdByBuyerId = new Map<number, number>();
  for (const row of buyerProfileRows) {
    if (typeof row.profile_id === "number") {
      profileIdByBuyerId.set(row.buyer_id, row.profile_id);
    }
  }

  const businessByProfileId = new Map<number, BusinessProfileRow>();
  for (const row of (buyerBusinesses as BusinessProfileRow[] | null) ?? []) {
    businessByProfileId.set(row.profile_id, row);
  }

  const engagementIds = safeEngagements.map((engagement) => engagement.engagement_id);
  const { data: quotations, error: quotationsError } = engagementIds.length
    ? await supabase
        .from("quotations")
        .select("quote_id, engagement_id, created_at")
        .in("engagement_id", engagementIds)
    : { data: [], error: null };

  if (quotationsError) {
    throw new Error(quotationsError.message || "Failed to load quotations.");
  }

  const quotationRows = (quotations as QuotationRow[] | null) ?? [];
  const quoteIds = quotationRows.map((row) => row.quote_id);
  const { data: purchaseOrders, error: purchaseOrdersError } = quoteIds.length
    ? await supabase.from("purchase_orders").select("po_id, quote_id").in("quote_id", quoteIds)
    : { data: [], error: null };

  if (purchaseOrdersError) {
    throw new Error(purchaseOrdersError.message || "Failed to load purchase orders.");
  }

  const quotationByEngagement = new Map<number, QuotationRow>();
  for (const row of quotationRows) {
    const current = quotationByEngagement.get(row.engagement_id);
    if (!current) {
      quotationByEngagement.set(row.engagement_id, row);
      continue;
    }
    const currentTime = current.created_at ? new Date(current.created_at).getTime() : 0;
    const nextTime = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (nextTime > currentTime) quotationByEngagement.set(row.engagement_id, row);
  }

  const purchaseOrdersByQuoteId = new Map<number, PurchaseOrderRow>();
  for (const row of (purchaseOrders as PurchaseOrderRow[] | null) ?? []) {
    purchaseOrdersByQuoteId.set(row.quote_id, row);
  }

  const cards: RfqCard[] = safeEngagements.map((engagement, index) => {
    const rfq = getSingleRfq(engagement.rfqs);
    const buyerProfileId = rfq?.buyer_id ? profileIdByBuyerId.get(rfq.buyer_id) : undefined;
    const buyerBusiness = buyerProfileId != null ? businessByProfileId.get(buyerProfileId) : null;
    const latestQuotation = quotationByEngagement.get(engagement.engagement_id) ?? null;
    const purchaseOrder = latestQuotation
      ? purchaseOrdersByQuoteId.get(latestQuotation.quote_id) ?? null
      : null;
    const displayStatus = getDisplayStatus(engagement, !!latestQuotation, !!purchaseOrder);
    const presentation = getStatusPresentation(displayStatus);
    const buyerName = buyerBusiness?.business_name || (rfq?.buyer_id ? `Buyer #${rfq.buyer_id}` : "Unknown buyer");
    const buyerSubtitle = buyerBusiness
      ? [buyerBusiness.business_type, buyerBusiness.city ? `${buyerBusiness.city}, ${buyerBusiness.province ?? ""}`.replace(/,\s*$/, "") : buyerBusiness.business_location]
          .filter(Boolean)
          .join(" · ")
      : "Buyer";
    const quantity = typeof rfq?.quantity === "number" ? `${rfq.quantity} ${rfq?.unit ?? ""}`.trim() : "Not set";
    const targetPrice =
      typeof rfq?.target_price_per_unit === "number"
        ? `${formatMoney(rfq.target_price_per_unit)} / ${rfq?.unit ?? "unit"}`
        : "Not set";
    const location =
      rfq?.delivery_location?.trim() ||
      [buyerBusiness?.business_location, buyerBusiness?.city, buyerBusiness?.province]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(", ") ||
      "Location not set";

    return {
      engagementId: engagement.engagement_id,
      rfqId: engagement.rfq_id,
      product: getProductName(rfq),
      buyer: buyerName,
      buyerSubtitle,
      initials: getInitials(buyerName || "Buyer"),
      initialsClassName: getInitialsColors(index),
      status: displayStatus,
      statusLabel: presentation.label,
      statusClassName: presentation.className,
      rfqNumber: `RFQ-${String(engagement.rfq_id).padStart(3, "0")}`,
      timeLabel: formatRelativeDate(rfq?.created_at ?? engagement.created_at),
      quantityLabel: quantity,
      targetPriceLabel: targetPrice,
      deliverByLabel: formatDate(rfq?.preferred_delivery_date ?? rfq?.deadline),
      locationLabel: location,
      actionLabel: presentation.actionLabel,
      actionClassName: presentation.actionClassName,
      actionDisabled: presentation.actionDisabled,
      actionHref: presentation.actionDisabled ? null : `/supplier/rfq/${engagement.engagement_id}`,
      showDecline: presentation.showDecline,
      sortTime: rfq?.created_at ? new Date(rfq.created_at).getTime() : 0,
    };
  });

  const filteredCards =
    selectedStatus === "all"
      ? cards
      : cards.filter((card) => card.status === selectedStatus);

  const totalRfqs = cards.length;
  const newCount = cards.filter((card) => card.status === "new").length;
  const pendingCount = cards.filter((card) => card.status === "responded").length;
  const acceptedCount = cards.filter((card) => card.status === "accepted").length;

  return (
    <main className="-m-6 min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-[#DCE5F1] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-[8px] text-[12px]">
            <span className="font-medium text-[#A5AEBB]">KaSupply</span>
            <ChevronRight className="h-[14px] w-[14px] text-[#B6BEC9]" />
            <span className="font-semibold text-[#2B4368]">RFQs</span>
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
            >
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Messages"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-[#F9FBFD] text-[#A6B0BF] transition hover:border-[#D6DFEA] hover:text-[#4D5E75]"
            >
              <MessageSquare className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="px-[28px] py-[18px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-[16px]">
            <h1 className="text-[17px] font-semibold text-[#223654]">RFQ Requests</h1>
            <p className="mt-[2px] text-[12px] text-[#94A3B8]">
              {filteredCards.length} incoming requests from buyers
            </p>
          </div>

          <section className="grid gap-[16px] md:grid-cols-4">
            {[
              ["TOTAL RFQs", totalRfqs, "#A855F7"],
              ["NEW", newCount, "#2563EB"],
              ["PENDING", pendingCount, "#FF7A1A"],
              ["ACCEPTED", acceptedCount, "#1F7A47"],
            ].map(([label, value, accent]) => (
              <div
                key={String(label)}
                className="overflow-hidden rounded-[16px] border border-[#E3EAF2] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.02)]"
              >
                <div className="flex">
                  <span className="w-[3px]" style={{ backgroundColor: String(accent) }} />
                  <div className="flex-1 px-[18px] py-[16px]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#A0A9B9]">
                      {label}
                    </p>
                    <p className="mt-[10px] text-[20px] font-semibold text-[#223654]">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="mt-[18px] flex flex-wrap items-center gap-[18px]">
            {[
              ["all", "All"],
              ["new", "New"],
              ["responded", "Responded"],
              ["accepted", "Accepted"],
              ["closed", "Closed"],
              ["declined", "Declined"],
            ].map(([value, label]) => {
              const isActive = selectedStatus === value;
              return (
                <Link
                  key={value}
                  href={value === "all" ? "/supplier/rfq" : `/supplier/rfq?status=${value}`}
                  className={
                    isActive
                      ? "inline-flex h-[28px] items-center rounded-full bg-[#223F68] px-[14px] text-[12px] font-medium text-white"
                      : "text-[12px] font-medium text-[#94A3B8] transition hover:text-[#223654]"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <section className="mt-[18px] space-y-[14px]">
            {filteredCards.length === 0 ? (
              <div className="rounded-[18px] border border-[#E3EAF2] bg-white px-[22px] py-[26px] text-[14px] text-[#94A3B8] shadow-[0_6px_16px_rgba(15,23,42,0.03)]">
                No RFQ requests found for this status.
              </div>
            ) : (
              filteredCards.map((card) => (
                <article
                  key={card.engagementId}
                  className="rounded-[18px] border border-[#E3EAF2] bg-white px-[22px] py-[22px] shadow-[0_6px_16px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-start justify-between gap-[18px]">
                    <div className="flex min-w-0 items-start gap-[14px]">
                      <div
                        className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[14px] text-[20px] font-medium ${card.initialsClassName}`}
                      >
                        {card.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-[8px]">
                          <h2 className="text-[15px] font-semibold text-[#223654]">{card.product}</h2>
                          <span className={`inline-flex rounded-full px-[8px] py-[3px] text-[10px] font-medium ${card.statusClassName}`}>
                            {card.statusLabel}
                          </span>
                        </div>
                        <p className="mt-[3px] text-[13px] text-[#94A3B8]">{card.buyer}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex rounded-full bg-[#F3F4F6] px-[12px] py-[5px] text-[12px] font-medium text-[#6B7280]">
                        {card.rfqNumber}
                      </span>
                      <p className="mt-[8px] inline-flex items-center gap-[5px] text-[12px] text-[#94A3B8]">
                        <ClockIcon />
                        {card.timeLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-[18px] border-t border-[#EDF2F7] pt-[18px]">
                    <div className="grid gap-y-[16px] md:grid-cols-4">
                      {[
                        ["QUANTITY", card.quantityLabel],
                        ["TARGET PRICE", card.targetPriceLabel],
                        ["DELIVER BY", card.deliverByLabel],
                        ["LOCATION", card.locationLabel],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#A0A9B9]">
                            {label}
                          </p>
                          <p className="mt-[6px] text-[14px] font-medium text-[#223654]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-[18px] flex flex-wrap gap-[10px] border-t border-[#EDF2F7] pt-[18px]">
                    {card.actionHref ? (
                      <Link
                        href={card.actionHref}
                        className={`inline-flex h-[44px] flex-1 items-center justify-center rounded-[8px] px-[18px] text-[13px] font-medium transition ${card.actionClassName}`}
                      >
                        {card.actionLabel}
                      </Link>
                    ) : (
                      <span
                        className={`inline-flex h-[44px] flex-1 items-center justify-center rounded-[8px] px-[18px] text-[13px] font-medium ${card.actionClassName}`}
                      >
                        {card.actionLabel}
                      </span>
                    )}

                    {card.showDecline ? (
                      <form action={declineEngagement} className="min-w-[140px]">
                        <input type="hidden" name="engagement_id" value={card.engagementId} />
                        <input type="hidden" name="return_to" value="/supplier/rfq" />
                        <button
                          type="submit"
                          className="inline-flex h-[44px] w-full items-center justify-center rounded-[8px] border border-[#D9E2EE] bg-white px-[18px] text-[13px] font-medium text-[#516074] transition hover:bg-[#F8FAFC]"
                        >
                          Decline
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </section>

          <div className="mt-[18px] flex flex-col gap-[12px] text-[12px] text-[#94A3B8] md:flex-row md:items-center md:justify-between">
            <p>Showing 1-{Math.min(filteredCards.length, 45)} of {filteredCards.length} results</p>
            <div className="flex items-center gap-[14px]">
              <span className="text-[#B0B9C8]">← Previous</span>
              <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#223F68] text-white">1</span>
              <span className="text-[#223654]">2</span>
              <span className="text-[#223654]">3</span>
              <span className="text-[#223654]">…</span>
              <span className="text-[#223654]">44</span>
              <span className="text-[#223654]">45</span>
              <span className="text-[#223654]">Next →</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
