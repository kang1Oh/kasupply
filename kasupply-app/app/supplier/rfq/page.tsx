import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronRight, MessageSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import {
  SUPPLIER_CARD_ACTION_ROW_CLASS,
  SUPPLIER_CARD_PRIMARY_ACTION_CLASS,
  SUPPLIER_CARD_SECONDARY_ACTION_CLASS,
} from "../shared/card-actions";
import {
  SUPPLIER_CARD_METADATA_LABEL_CLASS,
  SUPPLIER_CARD_METADATA_VALUE_CLASS,
} from "../shared/card-metadata";
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

type DisplayStatus =
  | "new"
  | "responded"
  | "accepted"
  | "closed"
  | "declined";

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
  if (diffDays === 1) return "Received yesterday";
  return `Received ${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatRfqReferenceCode(rfqId: number, createdAt: string | null | undefined) {
  const createdDate = createdAt ? new Date(createdAt) : null;
  const year =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.getFullYear()
      : new Date().getFullYear();

  return `RFQ-${year}-${String(rfqId).padStart(3, "0")}`;
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
        className: "bg-[#EEF2F6] text-[#4F5D73]",
        actionLabel: "View Details",
        actionClassName: "bg-[#223F68] text-white hover:bg-[#1C3455]",
        actionDisabled: false,
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
      rfqNumber: formatRfqReferenceCode(
        engagement.rfq_id,
        rfq?.created_at ?? engagement.created_at,
      ),
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
  const acceptedCount = cards.filter((card) => card.status === "accepted").length;
  const closedCount = cards.filter((card) => card.status === "closed").length;

  return (
    <main className="-m-6 min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-[#DCE5F1] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-[8px] text-[12px]">
            <span className="font-normal text-[#A5AEBB]">KaSupply</span>
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

      <div className="px-[36px] py-[28px]">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[24px]">
            <h1 className="text-[23px] font-semibold text-[#223654]">RFQ Requests</h1>
            <p className="mt-[6px] text-[16px] text-[#94A3B8]">
              {filteredCards.length} incoming requests from buyers
            </p>
          </div>

          <section className="grid gap-[20px] md:grid-cols-4">
            {[
              ["TOTAL RFQs", totalRfqs, "#A855F7"],
              ["NEW", newCount, "#2563EB"],
              ["ACCEPTED", acceptedCount, "#1F7A47"],
              ["CLOSED", closedCount, "#4F5D73"],
            ].map(([label, value, accent]) => (
              <div
                key={String(label)}
                className="rounded-[22px] border border-[#EDF1F6] border-l-[4px] bg-white px-[24px] py-[22px] shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
                style={{ borderLeftColor: String(accent) }}
              >
                <p className="text-[13px] font-normal uppercase tracking-[0.04em] text-[#A0A8B7]">
                  {label}
                </p>
                <p className="mt-[16px] text-[34px] font-semibold leading-none text-[#27344C]">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <div className="mt-[28px] flex flex-wrap items-center gap-[30px]">
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
                      ? "inline-flex h-[40px] items-center rounded-full bg-[#223F68] px-[22px] text-[15px] font-medium text-white"
                      : "text-[16px] font-normal text-[#94A3B8] transition hover:text-[#223654]"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <section className="mt-[24px] space-y-[18px]">
            {filteredCards.length === 0 ? (
              <div className="rounded-[22px] border border-[#E3EAF2] bg-white px-[24px] py-[34px] text-[15px] text-[#94A3B8] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                No RFQ requests found for this status.
              </div>
            ) : (
              filteredCards.map((card) => (
                <article
                  key={card.engagementId}
                  className="rounded-[24px] border border-[#E3EAF2] bg-white px-[22px] py-[22px] shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-[20px]">
                    <div className="flex min-w-0 items-start gap-[14px]">
                      <div
                        className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[14px] text-[24px] font-medium ${card.initialsClassName}`}
                      >
                        {card.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-[12px]">
                          <h2 className="text-[18px] font-semibold leading-none text-[#223654]">{card.product}</h2>
                          <span className={`inline-flex h-[24px] items-center rounded-[8px] px-[10px] text-[11px] font-semibold ${card.statusClassName}`}>
                            {card.statusLabel}
                          </span>
                        </div>
                        <p className="mt-[6px] text-[16px] font-medium text-[#6C788B]">{card.buyer}</p>
                        <p className="mt-[4px] text-[14px] font-normal text-[#A5AFBD]">{card.buyerSubtitle}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex justify-end">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex rounded-full bg-[#F2F4F7] px-[18px] py-[10px] text-[14px] font-medium text-[#667085]">
                          {card.rfqNumber}
                        </span>
                        <p className="mt-[12px] inline-flex items-center gap-[6px] text-[14px] text-[#98A2B3]">
                          <ClockIcon />
                          {card.timeLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-[20px] border-t border-[#EDF2F7] pt-[18px]">
                    <div className="grid gap-x-[24px] gap-y-[16px] md:grid-cols-4">
                      {[
                        ["QUANTITY", card.quantityLabel],
                        ["TARGET PRICE", card.targetPriceLabel],
                        ["DELIVER BY", card.deliverByLabel],
                        ["LOCATION", card.locationLabel],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className={`${SUPPLIER_CARD_METADATA_LABEL_CLASS} text-[12px]`}>
                            {label}
                          </p>
                          <p className={`${SUPPLIER_CARD_METADATA_VALUE_CLASS} mt-[8px] text-[16px]`}>
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`${SUPPLIER_CARD_ACTION_ROW_CLASS} mt-[20px] border-t border-[#EDF2F7] pt-[20px]`}>
                    {card.actionHref ? (
                      <Link
                        href={card.actionHref}
                        className={`${SUPPLIER_CARD_PRIMARY_ACTION_CLASS} h-[50px] rounded-[10px] text-[15px] ${card.actionClassName}`}
                      >
                        {card.actionLabel}
                      </Link>
                    ) : (
                      <span
                        className={`${SUPPLIER_CARD_PRIMARY_ACTION_CLASS} h-[50px] rounded-[10px] text-[15px] ${card.actionClassName}`}
                      >
                        {card.actionLabel}
                      </span>
                    )}

                    {card.showDecline ? (
                      <form action={declineEngagement} className="flex-1">
                        <input type="hidden" name="engagement_id" value={card.engagementId} />
                        <input type="hidden" name="return_to" value="/supplier/rfq" />
                        <button
                          type="submit"
                          className={`${SUPPLIER_CARD_SECONDARY_ACTION_CLASS} h-[50px] w-full rounded-[10px] text-[15px]`}
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

          <div className="mt-[18px] flex flex-col gap-[12px] text-[13px] text-[#94A3B8] md:flex-row md:items-center md:justify-between">
            <p>Showing 1-{Math.min(filteredCards.length, 45)} of {filteredCards.length} results</p>
            <div className="flex items-center gap-[14px] text-[13px]">
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
