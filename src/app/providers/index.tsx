import type { ReactNode } from "react";

import { Toaster } from "@/shared/ui";

/**
 * App-wide providers (FSD `app` layer).
 *
 * Access control lives entirely in `proxy.ts` (PIN cookie), so there is no auth
 * context to seed here. Add further cross-cutting providers (theme, TanStack
 * Query, …) by nesting them around `children`.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-center" />
    </>
  );
}
