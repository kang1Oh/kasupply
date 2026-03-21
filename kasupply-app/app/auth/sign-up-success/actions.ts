"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function chooseAccountRole(roleName: "buyer" | "supplier") {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("Please sign in before choosing an account role.");
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("role_id")
    .eq("role_name", roleName)
    .single();

  if (roleError || !role) {
    throw new Error("Unable to find the selected role.");
  }

  const displayName =
    String(authUser.user_metadata?.full_name || "").trim() ||
    authUser.email?.split("@")[0] ||
    "KaSupply User";

  const { data: existingAppUser, error: existingUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(existingUserError.message || "Failed to check account setup.");
  }

  const userPayload = {
    auth_user_id: authUser.id,
    role_id: role.role_id,
    name: displayName,
    email: authUser.email ?? null,
    status: "active",
    updated_at: new Date().toISOString(),
  };

  const { error: saveError } = existingAppUser
    ? await supabase
        .from("users")
        .update(userPayload)
        .eq("auth_user_id", authUser.id)
    : await supabase.from("users").insert(userPayload);

  if (saveError) {
    throw new Error(saveError.message || "Failed to save selected role.");
  }

  if (roleName === "supplier") {
    redirect("/onboarding");
  }

  redirect("/buyer");
}
