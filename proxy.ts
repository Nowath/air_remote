import { NextResponse, type NextRequest } from "next/server";

import { PIN_COOKIE, isUnlockToken } from "@/features/pin-gate/model/session";

/** The PIN screen itself — reachable while locked. */
const UNLOCK_PATH = "/";

/**
 * Gate every route behind the PIN. Proxy runs on the Node.js runtime in
 * Next.js 16, so the Web Crypto verification in `isUnlockToken` works here.
 */
export async function proxy(request: NextRequest) {
  const unlocked = await isUnlockToken(request.cookies.get(PIN_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  // Locked and heading somewhere protected → back to the PIN screen.
  if (!unlocked && pathname !== UNLOCK_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = UNLOCK_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Already unlocked → no reason to show the PIN screen again.
  if (unlocked && pathname === UNLOCK_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = "/remote";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and common image assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
