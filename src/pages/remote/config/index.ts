import type { IconType } from "react-icons"
import { FaSnowflake, FaDroplet, FaFan } from "react-icons/fa6"

export type IMode = "fan" | "dry" | "cool"

interface modeList{
  name: string;
  value: IMode
  icon: IconType
}

export interface LogEntry {
  id: string;
  /** Raw `created_at` ISO string, used for sorting. */
  createdAt?: string;
  time: string;
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
