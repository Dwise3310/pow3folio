import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const FIFTEEN_DAYS = 60 * 60 * 24 * 15;
const AUTH_TIMEOUT_MS = 2500;

function isAuthPath(path: string) {
  return (
    path === "/login" ||
    path === "/signup" ||
    path.startsWith("/dashboard") ||
    path.startsWith("/dash") ||
    path.startsWith("/auth")
  );
}

async function getUserFast(
  supabase: ReturnType<typeof createServerClient>
) {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth-timeout")), AUTH_TIMEOUT_MS)
      ),
    ]);
    return result.data.user ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Old shortcut people still type / bookmark.
  if (path === "/dash" || path.startsWith("/dash/")) {
    const url = request.nextUrl.clone();
    url.pathname = path.replace(/^\/dash/, "/dashboard") || "/dashboard";
    return NextResponse.redirect(url);
  }

  // Public pages never talk to Supabase in Edge middleware.
  // A paused or slow project used to hang every request until Vercel 504.
  if (!isAuthPath(path)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            maxAge: FIFTEEN_DAYS,
          })
        );
      },
    },
  });

  const user = await getUserFast(supabase);

  if (user && (path === "/login" || path === "/signup")) {
    const next = request.nextUrl.clone();
    next.pathname = "/dashboard";
    return NextResponse.redirect(next);
  }

  if (!user && path.startsWith("/dashboard")) {
    const next = request.nextUrl.clone();
    next.pathname = "/login";
    return NextResponse.redirect(next);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/login", "/signup", "/dashboard/:path*", "/dash", "/dash/:path*", "/auth/:path*"],
};
