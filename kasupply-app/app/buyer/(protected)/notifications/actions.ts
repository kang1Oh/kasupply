"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import { getBuyerNotificationById } from "@/lib/buyer/notifications";

function revalidateBuyerNotificationPaths() {
  revalidatePath("/buyer", "layout");
  revalidatePath("/buyer/notifications");
}

async function getCurrentBuyerAppUserId() {
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    throw new Error("You must be logged in.");
  }

  const role = user.roles?.role_name?.toLowerCase() ?? null;

  if (role !== "buyer") {
    throw new Error("Buyer access is required.");
  }

  return user.user_id;
}

function parseNotificationId(formData: FormData) {
  const notificationId = Number(formData.get("notificationId")?.toString() ?? "");

  if (!notificationId || Number.isNaN(notificationId)) {
    throw new Error("Invalid notification.");
  }

  return notificationId;
}

export async function markBuyerNotificationRead(formData: FormData) {
  const supabase = await createClient();
  const userId = await getCurrentBuyerAppUserId();
  const notificationId = parseNotificationId(formData);

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("notification_id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Failed to update notification.");
  }

  revalidateBuyerNotificationPaths();
}

export async function markAllBuyerNotificationsRead() {
  const supabase = await createClient();
  const userId = await getCurrentBuyerAppUserId();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message || "Failed to update notifications.");
  }

  revalidateBuyerNotificationPaths();
}

export async function openBuyerNotification(formData: FormData) {
  const supabase = await createClient();
  await getCurrentBuyerAppUserId();
  const notificationId = parseNotificationId(formData);
  const notification = await getBuyerNotificationById(notificationId);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (!notification.isRead) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", notificationId)
      .eq("user_id", notification.userId);

    if (error) {
      throw new Error(error.message || "Failed to update notification.");
    }
  }

  revalidateBuyerNotificationPaths();
  redirect(notification.targetPath ?? "/buyer/notifications");
}
