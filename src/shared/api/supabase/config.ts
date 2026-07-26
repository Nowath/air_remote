// Centralized Supabase env config (FSD `shared` layer — infrastructure only).
//
// Since the app talks to Supabase only from the server (Server Actions holding
// the secret key), no Supabase credential is inlined into the client bundle any
// more. The URL is read from either name so an existing `.env.local` written for
// the browser client keeps working.

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Secret (service-role) key. Bypasses RLS, so it must never reach the browser:
 * no `NEXT_PUBLIC_` prefix, and only `admin.ts` may read it.
 */
export const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
