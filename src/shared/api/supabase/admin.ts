import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

/**
 * Supabase client for server-side data access.
 *
 * Uses the secret (service-role) key, which **bypasses RLS** — every caller must
 * therefore prove the visitor is past the PIN gate first (see `requireUnlocked`
 * in `@/features/pin-gate/api/guard`). The `server-only` import makes the build
 * fail loudly if this module is ever pulled into a Client Component.
 *
 * Intentionally NOT re-exported from the slice barrel.
 */
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (!SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to .env.local (Supabase Dashboard → Project Settings → API keys → secret key).",
    );
  }

  adminClient ??= createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
