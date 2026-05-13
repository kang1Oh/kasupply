import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils/utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const legacyAliasMap: Record<string, string> = {
    "/login": "/auth/login",
    "/sign-up": "/auth/sign-up",
    "/sign-up-success": "/auth/sign-up-success",
    "/forgot-password": "/auth/forgot-password",
    "/update-password": "/auth/update-password",
    "/auth-error": "/auth/error",
  };

  const aliasedPath = legacyAliasMap[pathname];

  if (aliasedPath) {
    const url = request.nextUrl.clone();
    url.pathname = aliasedPath;
    return NextResponse.redirect(url);
  }

  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname === "/buyer" ||
    pathname.startsWith("/buyer/search");

  if (isPublicPath || !hasEnvVars) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
