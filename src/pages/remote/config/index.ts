import type { IconType } from "react-icons"
import { FaSnowflake, FaDroplet, FaFan } from "react-icons/fa6"

export type IMode = "fan" | "dry" | "cool"

/** Temperature range the remote allows, and the value used when none is known. */
export const MIN_TEMP = 20
export const MAX_TEMP = 30
export const DEFAULT_TEMP = 25

/**
 * Fan mode blows air without cooling, so there is no target temperature to set
 * — the pad hides the reading and locks the +/- buttons for it.
 *
 * The value still travels to `air_commands` unchanged: the device consumer has
 * never received a `fan` row (history holds only `cool`/`dry`), and a row with
 * an unexpected temp is exactly what makes it write `status = 'error'`. Change
 * the payload only after confirming how the consumer handles fan.
 */
export function usesTemperature(mode: IMode) {
  return mode !== "fan"
}

/**
 * Clamp a temperature read back from the database into the usable range.
 *
 * Rows written by the cron carry `temp = 0` on TURN_OFF, where the value is
 * meaningless. Seeding the UI with it would show "0°" and leave the minus
 * button disabled, so 0 (and anything else out of range) falls back to
 * `DEFAULT_TEMP` — note `??` would NOT catch 0.
 */
export function clampTemp(temp: number | null | undefined) {
  if (!temp) return DEFAULT_TEMP
  return Math.min(MAX_TEMP, Math.max(MIN_TEMP, temp))
}

interface modeList{
  name: string;
  value: IMode
  icon: IconType
}

/** Payload for a one-shot command (`air_commands`). */
export interface AirCommandInput {
  action: "TURN_ON" | "TURN_OFF";
  temp: number;
  status: string;
  mode: IMode;
}

/** Payload for a recurring daily schedule (`air_schedules`). */
export interface AirScheduleInput {
  start_time: string;
  end_time: string;
  target_temp: number;
  mode: IMode;
  is_enabled: boolean;
}

/** Remote state seeded from the newest command row. */
export interface RemoteState {
  power: boolean;
  temp: number;
  mode: IMode;
}

export interface LogEntry {
  id: string;
  /**
   * Raw `created_at` ISO string. Formatting happens in the browser so the
   * timestamp shows the viewer's timezone — the data now comes from a Server
   * Action, which would otherwise format in the server's (UTC on most hosts).
   */
  createdAt: string;
  power: boolean;
  temp: number;
  mode: IMode;
  daily: boolean;
  /** True when the command was issued automatically by cron, not by the user. */
  fromCron: boolean;
  /** Processing status of a command ("pending"/"success"/"failed"); null for schedules. */
  status: string | null;
  startTime: string | null;
  endTime: string | null;
}

export const mode:modeList[] = [
  {
    name: "cool",
    value: "cool",
    icon: FaSnowflake,
  },
  {
    name: "dry",
    value: "dry",
    icon: FaDroplet,
  },
  {
    name: "fan",
    value: "fan",
    icon: FaFan,
  },
]
