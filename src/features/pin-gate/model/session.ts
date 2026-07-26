// Server-only PIN session helpers (FSD `features/pin-gate`).
//
// The PIN itself never reaches the browser: it is read from `APP_PIN` (a
// server-only env var — deliberately NOT prefixed with NEXT_PUBLIC_) and only
// compared on the server. What the browser gets is an opaque HMAC token stored
// in an httpOnly cookie; `proxy.ts` re-verifies that token on every request.
//
// This module is imported by both `proxy.ts` and the Server Action, so it must
// stay free of `next/headers` — it is intentionally NOT re-exported from the
// slice barrel.

/** Name of the httpOnly cookie holding the unlock token. */
export const PIN_COOKIE = "air_unlocked";

/** Constant string signed to produce the unlock token. */
const TOKEN_PAYLOAD = "air-remote-pin-v1";

function readPin() {
  const pin = process.env.APP_PIN;
  if (!pin) {
    throw new Error(
      "APP_PIN is not set. Add APP_PIN=<your pin> to .env.local (no NEXT_PUBLIC_ prefix).",
    );
  }
  return pin;
}

/**
 * Key material for the token signature. Falls back to the PIN itself when no
 * dedicated secret is configured — a side effect being that changing the PIN
 * invalidates every issued cookie, which is what you want.
 */
function readSecret() {
  return process.env.APP_SESSION_SECRET ?? readPin();
}

/** Compare two strings without leaking their length or content via timing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Mint the unlock token. Uses Web Crypto (available in both the Node.js runtime
 * that Proxy runs on and the Server Action runtime) so one implementation
 * serves both call sites.
 */
export async function createUnlockToken() {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(readSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(TOKEN_PAYLOAD),
  );
  return toHex(signature);
}

/** True when `token` is a cookie this server issued for the current PIN. */
export async function isUnlockToken(token: string | undefined) {
  if (!token) return false;
  return safeEqual(token, await createUnlockToken());
}

/** True when the visitor typed the configured PIN. */
export function isCorrectPin(input: string) {
  return safeEqual(input, readPin());
}

/** Cookie options: a session cookie, so closing the browser forgets the unlock. */
export const PIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
