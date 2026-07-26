import type { Metadata } from "next";

import { PinForm } from "@/features/pin-gate";

export const metadata: Metadata = {
  title: "ใส่รหัส · air-remote",
};

/** App root — the PIN screen. `proxy.ts` sends unlocked visitors to /remote. */
export function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <PinForm />
    </main>
  );
}
