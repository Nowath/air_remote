import type { ReactNode } from "react";

import { AuthProvider, type AuthUser } from "@/features/auth";
import { Toaster } from "@/shared/ui";
import { createClient } from "@/shared/api/supabase/server";

/**
 * App-wide providers (FSD `app` layer).
 *
 * Runs as an async Server Component so it can read the verified session once on
 * the server and hand it to the client `AuthProvider` as the initial value —
 * the client tree knows the user from its first render. Add further
 * cross-cutting providers (theme, TanStack Query, …) by nesting them here.
 */
export async function Providers({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  // Verify the JWT with getClaims() — never trust getSession() in server code.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const initialUser: AuthUser | null = claims
    ? {
        id: String(claims.sub),
        email: claims.email ? String(claims.email) : undefined,
      }
    : null;

  return (
    <AuthProvider initialUser={initialUser}>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
