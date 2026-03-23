import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;
  const authAliasMap: Record<string, string> = {
    "/auth/login": "/login",
    "/auth/sign-up": "/sign-up",
    "/auth/sign-up-success": "/sign-up-success",
    "/auth/forgot-password": "/forgot-password",
    "/auth/update-password": "/update-password",
    "/auth/error": "/auth-error",
  };

  const aliasedPath = authAliasMap[pathname];

  if (aliasedPath) {
    const url = request.nextUrl.clone();
    url.pathname = aliasedPath;
    return NextResponse.redirect(url);
  }

  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/sign-up" ||
    pathname === "/sign-up-success" ||
    pathname === "/forgot-password" ||
    pathname === "/update-password" ||
    pathname === "/auth-error" ||
    pathname === "/buyer" ||
    pathname.startsWith("/buyer/search");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
