// Public API for the PIN gate (FSD `features/pin-gate`).
//
// `model/session.ts` is deliberately NOT re-exported: it reads the server-only
// `APP_PIN` env var and is imported directly by `proxy.ts`.
export { PinForm } from "./ui/pin-form";
export { unlock, lock, type PinFormState } from "./api/actions";
export { PIN_LENGTH } from "./config";
