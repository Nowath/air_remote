// Centralized Supabase env config (FSD `shared` layer — infrastructure only).
// `process.env.NEXT_PUBLIC_*` must be referenced literally so Next.js can inline
// the values into the client bundle at build time.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Prefer the new publishable key; fall back to the legacy anon key for
// compatibility. Set one of these in `.env.local`.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
