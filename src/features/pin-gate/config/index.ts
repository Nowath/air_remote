// Client-safe constants for the PIN gate. Kept out of `model/session.ts` so a
// Client Component can import them without pulling server-only code along.

/** Number of digits the PIN keypad collects. */
export const PIN_LENGTH = 4;

/** Keypad layout — `null` renders an empty cell. */
export const KEYPAD: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0];
