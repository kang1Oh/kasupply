import { createClient } from "@/lib/supabase/server";

type SupplierProfileRow = {
  supplier_id: number;
  profile_id: number;
};

type BuyerProfileRow = {
  buyer_id: number;
  profile_id: number;
};

type BusinessProfileRow = {
  profile_id: number;
  business_name: string | null;
  user_id: string;
};

type UserRow = {
  user_id: string;
  name: string | null;
};

type RfqRow = {
  rfq_id: number;
  buyer_id: number;
  category_id: number | null;
  product_name: string;
  quantity: number;
  unit: string | null;
  specifications: string | null;
  deadline: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EngagementRow = {
  engagement_id: number;
  rfq_id: number;
  supplier_id: number;
  status: string | null;
  viewed_at: string | null;
  initiated_at: string | null;
  final_quote_id: number | null;
  created_at: string | null;
  rfqs: RfqRow | RfqRow[] | null;
};

type RequestMatchRow = {
  match_id: number;
  rfq_id: number;
  supplier_id: number;
  match_score: number | null;
  match_reason: string | null;
  is_visible: boolean | null;
  notified_at: string | null;
};

type QuotationRow = {
  quote_id: number;
  engagement_id: number;
  supplier_id: number;
  price_per_unit: number;
  quantity: number;
  moq: number;
  lead_time: string | null;
  notes: string | null;
  status: string | null;
  valid_until: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function getSingleRfq(rfqs: EngagementRow["rfqs"]): RfqRow | null {
  if (!rfqs) return null;
  return Array.isArray(rfqs) ? rfqs[0] ?? null : rfqs;
}

async function getCurrentSupplierContext() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id, profile_id")
    .eq("profile_id", businessProfile.profile_id)
    .single<SupplierProfileRow>();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  return {
    supabase,
    appUserId: String(appUser.user_id),
    supplierProfile,
  };
}

async function getBuyerDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerId: number,
) {
  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("buyer_id, profile_id")
    .eq("buyer_id", buyerId)
    .maybeSingle<BuyerProfileRow>();

  if (!buyerProfile?.profile_id) {
    return {
      businessName: `Buyer #${buyerId}`,
      contactName: null,
    };
  }

  const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select("profile_id, business_name, user_id")
    .eq("profile_id", buyerProfile.profile_id)
    .maybeSingle<BusinessProfileRow>();

  if (!businessProfile) {
    return {
      businessName: `Buyer #${buyerId}`,
      contactName: null,
    };
  }

  const { data: buyerUser } = await supabase
    .from("users")
    .select("user_id, name")
    .eq("user_id", businessProfile.user_id)
    .maybeSingle<UserRow>();

  return {
    businessName: businessProfile.business_name ?? `Buyer #${buyerId}`,
    contactName: buyerUser?.name ?? null,
  };
}

export async function getSupplierRfqEngagementDetail(engagementId: number) {
  const { supabase, supplierProfile, appUserId } =
    await getCurrentSupplierContext();

  const { data: engagement, error: engagementError } = await supabase
    .from("rfq_engagements")
    .select(`
      engagement_id,
      rfq_id,
      supplier_id,
      status,
      viewed_at,
      initiated_at,
      final_quote_id,
      created_at,
      rfqs (
        rfq_id,
        buyer_id,
        category_id,
        product_name,
        quantity,
        unit,
        specifications,
        deadline,
        status,
        visibility,
        created_at,
        updated_at
      )
    `)
    .eq("engagement_id", engagementId)
    .eq("supplier_id", supplierProfile.supplier_id)
    .maybeSingle<EngagementRow>();

  if (engagementError) {
    throw new Error(engagementError.message || "Failed to load RFQ engagement.");
  }

  if (!engagement) {
    return null;
  }

  const rfq = getSingleRfq(engagement.rfqs);

  const { data: match } = await supabase
    .from("request_matches")
    .select(`
      match_id,
      rfq_id,
      supplier_id,
      match_score,
      match_reason,
      is_visible,
      notified_at
    `)
    .eq("rfq_id", engagement.rfq_id)
    .eq("supplier_id", supplierProfile.supplier_id)
    .maybeSingle<RequestMatchRow>();

  const { data: offers, error: offersError } = await supabase
    .from("negotiation_offers")
    .select(`
      offer_id,
      engagement_id,
      offered_by,
      offer_round,
      price_per_unit,
      quantity,
      lead_time,
      moq,
      notes,
      status,
      created_at
    `)
    .eq("engagement_id", engagementId)
    .order("offer_round", { ascending: false });

  if (offersError) {
    throw new Error(offersError.message || "Failed to load negotiation history.");
  }

  let latestQuotation: QuotationRow | null = null;

  if (engagement.final_quote_id) {
    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .select("*")
      .eq("quote_id", engagement.final_quote_id)
      .eq("supplier_id", supplierProfile.supplier_id)
      .maybeSingle<QuotationRow>();

    if (quotationError) {
      throw new Error(quotationError.message || "Failed to load quotation.");
    }

    latestQuotation = quotation ?? null;
  } else {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("*")
      .eq("engagement_id", engagementId)
      .eq("supplier_id", supplierProfile.supplier_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<QuotationRow>();

    latestQuotation = quotation ?? null;
  }

  const buyer =
    rfq?.buyer_id != null
      ? await getBuyerDetails(supabase, rfq.buyer_id)
      : {
          businessName: "Unknown buyer",
          contactName: null,
        };

  return {
    currentAppUserId: appUserId,
    engagement,
    rfq,
    match: match ?? null,
    buyer,
    offers: offers ?? [],
    latestQuotation,
  };
}
