import "server-only";

import { cookies } from "next/headers";

import { PIN_COOKIE, isUnlockToken } from "../model/session";

/** True when the current request carries a valid unlock cookie. */
export async function isUnlocked() {
  const cookieStore = await cookies();
  return isUnlockToken(cookieStore.get(PIN_COOKIE)?.value);
}

/**
 * Throws unless the caller is past the PIN gate.
 *
 * `proxy.ts` already blocks locked visitors, but Server Actions are reachable as
 * plain HTTP endpoints, and the ones in this app hold a service-role Supabase
 * client. Every such action calls this first so the secret key can never be
 * driven by an unauthenticated request.
 */
export async function requireUnlocked() {
  if (!(await isUnlocked())) {
    throw new Error("Locked: PIN required");
  }
}
