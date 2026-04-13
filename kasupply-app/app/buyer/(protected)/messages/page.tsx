import { redirect } from "next/navigation";
import { getBuyerAccessRedirect } from "@/lib/auth/buyer-access";
import { getUserOnboardingStatus } from "@/lib/auth/get-user-onboarding-status";
import { createClient } from "@/lib/supabase/server";
import { ensureBuyerConversationForSupplier } from "@/lib/messages/ensure-buyer-conversation";
import { getBuyerMessagesData } from "./data";
import { BuyerMessagesClient } from "./messages-client";

export default async function BuyerMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    conversation?: string;
    conversationId?: string;
    supplierId?: string;
    engagementId?: string;
    filter?: string;
    q?: string;
  }>;
}) {
  const status = await getUserOnboardingStatus();
  const redirectPath = getBuyerAccessRedirect(status, {
    requirement: "profile",
    targetPath: "/buyer/messages",
    reason: "messages",
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createClient();
  const supplierId = resolvedSearchParams.supplierId
    ? Number(resolvedSearchParams.supplierId)
    : null;
  const engagementId = resolvedSearchParams.engagementId
    ? Number(resolvedSearchParams.engagementId)
    : null;
  const rawConversationId =
    resolvedSearchParams.conversationId ?? resolvedSearchParams.conversation ?? null;
  let conversationId = rawConversationId ? Number(rawConversationId) : null;

  if ((!conversationId || Number.isNaN(conversationId)) && supplierId && !Number.isNaN(supplierId)) {
    if (!status.appUser) {
      redirect("/login?source=buyer-messages");
    }

    const { data: businessProfile, error: businessProfileError } = await supabase
      .from("business_profiles")
      .select("profile_id")
      .eq("user_id", status.appUser.user_id)
      .single();

    if (businessProfileError || !businessProfile) {
      throw new Error("Business profile not found.");
    }

    const { data: buyerProfile, error: buyerProfileError } = await supabase
      .from("buyer_profiles")
      .select("buyer_id")
      .eq("profile_id", businessProfile.profile_id)
      .single<{ buyer_id: number }>();

    if (buyerProfileError || !buyerProfile) {
      throw new Error("Buyer profile not found.");
    }

    conversationId = await ensureBuyerConversationForSupplier(supabase, {
      buyerId: buyerProfile.buyer_id,
      supplierId,
      initiatedBy: status.appUser.user_id,
      engagementId: engagementId && !Number.isNaN(engagementId) ? engagementId : null,
    });
  }

  const data = await getBuyerMessagesData({
    conversationId: conversationId && !Number.isNaN(conversationId) ? conversationId : null,
    supplierId: supplierId && !Number.isNaN(supplierId) ? supplierId : null,
    engagementId: engagementId && !Number.isNaN(engagementId) ? engagementId : null,
    filter: resolvedSearchParams.filter ?? null,
    query: resolvedSearchParams.q ?? null,
  });

  return <BuyerMessagesClient initialData={data} />;
}
