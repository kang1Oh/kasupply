import { createClient } from "@/lib/supabase/server";

export type CurrentAppUser = {
  user_id: string;
  auth_user_id: string;
  role_id: number;
  name: string;
  email: string;
  phone: string | null;
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

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select(`
      user_id,
      auth_user_id,
      role_id,
      name,
      email,
      phone,
      roles!users_role_id_fkey (
        role_id,
        role_name
      )
    `)
    .eq("auth_user_id", authUser.id)
    .single<CurrentAppUser>();

  if (appUserError || !appUser) {
    return { user: null, error: "User record not found in public.users" };
  }

  return { user: appUser, error: null };
}