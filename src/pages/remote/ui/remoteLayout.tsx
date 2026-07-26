import type { Metadata } from "next";

import RemotePage from "./remotePage";

export const metadata: Metadata = {
  title: "รีโมท · air-remote",
};

/** `/remote` — reachable only with a valid PIN cookie (enforced in `proxy.ts`). */
export function RemoteContainer() {
  return (
    <main className="flex items-center justify-center max-h-screen overflow-hidden">
      <RemotePage />
    </main>
  );
}
