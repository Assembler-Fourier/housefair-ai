import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const legacyPrefixes = [
    "/api/ai",
    "/api/complaints",
    "/api/device",
    "/api/groceries",
    "/api/house",
    "/api/maintenance",
    "/api/money",
    "/api/notifications",
    "/api/proof",
    "/api/scheduler",
    "/api/tasks",
  ];
  if (
    process.env.LEGACY_PRIVATE_APP_ENABLED !== "true" &&
    legacyPrefixes.some((prefix) =>
      request.nextUrl.pathname.startsWith(`${prefix}/`) || request.nextUrl.pathname === prefix,
    )
  ) {
    return NextResponse.rewrite(new URL("/api/legacy-disabled", request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (request.nextUrl.pathname.startsWith("/app") || request.nextUrl.pathname.startsWith("/admin"))) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(authUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/onboarding/:path*", "/api/:path*"],
};
