import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Public paths that an unauthenticated visitor is allowed to reach. */
const PUBLIC_PATHS = ["/", "/auth"];

/**
 * Paths only meaningful when signed out — signed-in users are sent to /account.
 * `/` is the login page, so a logged-in user landing there gets bounced.
 */
const AUTH_ONLY_PATHS = ["/"];

function matchesPath(paths: string[], pathname: string) {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refreshes the Supabase auth session on every request and guards protected
 * routes. Called from the root `proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: Do not run any code between `createServerClient` and
  // `getClaims()`. Use `getClaims()` (not `getSession()`) in server code — it
  // verifies the JWT instead of trusting whatever is in the cookie.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  // Signed out trying to reach a protected route → send to the login page (/).
  if (!isAuthenticated && !matchesPath(PUBLIC_PATHS, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in trying to reach a signed-out-only route (e.g. /) → /account.
  if (isAuthenticated && matchesPath(AUTH_ONLY_PATHS, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/remote";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return `supabaseResponse` as-is to keep cookies in sync. If you
  // build a different response, copy over `supabaseResponse.cookies` first.
  return supabaseResponse;
}
