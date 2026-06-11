import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Supabase client for use in Client Components / the browser. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
