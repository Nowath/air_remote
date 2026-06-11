import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Server-only — imports `next/headers`, so never re-export this from a
 * client-safe public API.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` was called from a Server Component, which cannot write
          // cookies. Safe to ignore when the proxy refreshes sessions.
        }
      },
    },
  });
}
