import type { NextRequest } from "next/server";

import { updateSession } from "@/shared/api/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and common image assets
     * Always run on API/auth routes so sessions stay fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
