import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export async function requireAdminUser() {
  const { user, error } = await getCurrentAppUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  if (user.roles?.role_name?.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
