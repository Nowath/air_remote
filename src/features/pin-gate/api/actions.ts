"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { PIN_LENGTH } from "../config";
import {
  PIN_COOKIE,
  PIN_COOKIE_OPTIONS,
  createUnlockToken,
  isCorrectPin,
} from "../model/session";

export type PinFormState = {
  error?: string;
  /** Bumped on every rejected attempt; the form uses it to reset the keypad. */
  attempt: number;
};

/**
 * Best-effort brute-force brake. A 4-digit PIN is only 10k combinations, so the
 * gate throttles per client IP. This lives in module memory: it resets on
 * redeploy and is per-instance, which is fine for a single-instance home app —
 * move it to Redis/Postgres if this is ever deployed across several instances.
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

async function rateLimit() {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const current = attempts.get(ip);

  if (!current || now > current.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false };
  }

  current.count += 1;
  return { blocked: current.count > MAX_ATTEMPTS };
}

/**
 * Verifies the typed PIN and, on success, issues the unlock cookie and sends the
 * visitor to the remote. Wired to the form via `useActionState`.
 */
export async function unlock(
  prevState: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const pin = String(formData.get("pin") ?? "");
  const attempt = prevState.attempt + 1;

  if (pin.length !== PIN_LENGTH) {
    return { error: `กรุณากรอกรหัส ${PIN_LENGTH} หลัก`, attempt };
  }

  const { blocked } = await rateLimit();
  if (blocked) {
    return { error: "กรอกผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่", attempt };
  }

  if (!isCorrectPin(pin)) {
    // Slow every wrong answer down a little; a correct PIN returns immediately.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: "รหัสไม่ถูกต้อง", attempt };
  }

  const cookieStore = await cookies();
  cookieStore.set(PIN_COOKIE, await createUnlockToken(), PIN_COOKIE_OPTIONS);

  redirect("/remote");
}

/** Clears the unlock cookie and returns to the PIN screen. */
export async function lock() {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_COOKIE);
  redirect("/");
}
