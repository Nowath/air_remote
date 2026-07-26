"use server";

import { requireUnlocked } from "@/features/pin-gate/api/guard";
import { createAdminClient } from "@/shared/api/supabase/admin";
import { clampTemp } from "../config";
import type {
  AirCommandInput,
  AirScheduleInput,
  IMode,
  LogEntry,
  RemoteState,
} from "../config";

// Every export here is a Server Action — a publicly reachable HTTP endpoint
// backed by a service-role Supabase client. `requireUnlocked()` must therefore
// be the first line of each one; `proxy.ts` is the outer gate, this is the inner.

export async function pushCommand(input: AirCommandInput) {
  await requireUnlocked();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("air_commands")
    .insert({ ...input, from_cron: false })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function pushSchedule(input: AirScheduleInput) {
  await requireUnlocked();

  // Note: `air_schedules` has no `from_cron` column (unlike `air_commands`).
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("air_schedules")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLatestCommand(): Promise<RemoteState | null> {
  await requireUnlocked();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("air_commands")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    power: isPowerOn(data.action),
    temp: clampTemp(data.temp),
    mode: (data.mode ?? "cool") as IMode,
  };
}

export async function fetchLogs(): Promise<LogEntry[]> {
  await requireUnlocked();

  const supabase = createAdminClient();
  const [commands, schedules] = await Promise.all([
    supabase
      .from("air_commands")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("air_schedules")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (commands.error) throw new Error(commands.error.message);
  if (schedules.error) throw new Error(schedules.error.message);

  const commandLogs: LogEntry[] = (commands.data ?? []).map((row) => ({
    id: `c:${row.id}`,
    createdAt: row.created_at,
    power: isPowerOn(row.action),
    temp: row.temp ?? 0,
    mode: (row.mode ?? "cool") as IMode,
    daily: false,
    fromCron: row.from_cron,
    status: row.status ?? null,
    startTime: null,
    endTime: null,
  }));

  const scheduleLogs: LogEntry[] = (schedules.data ?? []).map((row) => ({
    id: `s:${row.id}`,
    createdAt: row.created_at,
    power: row.is_enabled,
    temp: row.target_temp ?? 0,
    mode: (row.mode ?? "cool") as IMode,
    daily: true,
    fromCron: false,
    status: null,
    startTime: toHHmm(row.start_time),
    endTime: toHHmm(row.end_time),
  }));

  return [...commandLogs, ...scheduleLogs].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export async function deleteLog(id: string) {
  await requireUnlocked();

  const supabase = createAdminClient();
  const [prefix, rawId] = id.split(":");
  const table = prefix === "s" ? "air_schedules" : "air_commands";
  const { error } = await supabase.from(table).delete().eq("id", Number(rawId));
  if (error) throw new Error(error.message);
}

// Module-private helpers stay synchronous — only the *exports* of a "use server"
// module have to be async functions.
function toHHmm(time: string | null) {
  return time ? time.slice(0, 5) : null;
}

function isPowerOn(action: string | null) {
  return (action ?? "").trim().toUpperCase() === "TURN_ON";
}
