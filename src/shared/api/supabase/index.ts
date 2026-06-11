// Public API for the Supabase integration (FSD `shared/api` segment).
//
// Only client-safe exports belong here. The server client lives in `./server`
// (imports `next/headers`) and the proxy helper in `./middleware` — import those
// directly from their modules so server-only code never leaks into the client
// bundle.
export { createClient } from "./client";
export { SUPABASE_URL, SUPABASE_KEY } from "./config";
