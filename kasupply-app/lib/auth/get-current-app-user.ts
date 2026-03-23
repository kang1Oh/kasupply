import { createClient } from "@/lib/supabase/server";

export type CurrentAppUser = {
  user_id: string;
  auth_user_id: string;
  role_id: number;
  name: string;
  email: string;
  roles: {
    role_id: number;
    role_name: string;
  } | null;
};

export async function getCurrentAppUser(): Promise<{
  user: CurrentAppUser | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { user: null, error: "Not authenticated" };
  }

  const { data: appUserRow, error: appUserError } = await supabase
    .from("users")
    .select("user_id, auth_user_id, role_id, name, email")
    .eq("auth_user_id", authUser.id)
    .single<Pick<CurrentAppUser, "user_id" | "auth_user_id" | "role_id" | "name" | "email">>();

  if (appUserError || !appUserRow) {
    return { user: null, error: "User record not found in public.users" };
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("role_id, role_name")
    .eq("role_id", appUserRow.role_id)
    .maybeSingle<NonNullable<CurrentAppUser["roles"]>>();

  if (roleError) {
    return { user: null, error: roleError.message || "Failed to load user role." };
  }

  return {
    user: {
      ...appUserRow,
      roles: role ?? null,
    },
    error: null,
  };
}
