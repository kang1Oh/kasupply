import { createClient } from "@/lib/supabase/server";

type AdminAuditEntryInput = {
  adminUserId: string;
  actionType: string;
  targetType: "user" | "product" | "verification_run" | "profile" | "queue";
  targetId: string;
  reason?: string | null;
  details?: Record<string, unknown>;
};

export async function safeLogAdminAction({
  adminUserId,
  actionType,
  targetType,
  targetId,
  reason = null,
  details = {},
}: AdminAuditEntryInput) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("admin_action_logs").insert({
      admin_user_id: adminUserId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Unable to save admin action log.", error);
  }
}
