import { format } from 'date-fns'
import { createClient } from '@/shared/api/supabase'
import type { IMode, LogEntry } from '../config'
export interface AirCommandInput {
  /** What to do: turn the unit on or off. */
  action: 'TURN_ON' | 'TURN_OFF'
  temp: number
  /** Processing status of the command, e.g. "pending". */
  status: string
  mode: IMode
}

export interface AirScheduleInput {
  start_time: string
  end_time: string
  target_temp: number
  mode: IMode
  is_enabled: boolean
}

export async function pushCommand(input: AirCommandInput) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('air_commands')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Current state of the remote, derived from the latest `air_commands` row. */
export interface RemoteState {
  power: boolean
  temp: number
  mode: IMode
}

/**
 * Fetch the most recent command from `air_commands` so the remote can show the
 * unit's last-known state. Returns `null` when there is no command yet.
 */
export async function fetchLatestCommand(): Promise<RemoteState | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('air_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    power: isPowerOn(data.action),
    temp: data.temp ?? 25,
    mode: (data.mode ?? 'cool') as IMode,
  }
}

/** Strip seconds off a Postgres `time` value, e.g. "22:00:00" -> "22:00". */
function toHHmm(time: string | null) {
  return time ? time.slice(0, 5) : null
}

/** Power is on when action is TURN_ON (tolerant of casing/whitespace). */
function isPowerOn(action: string | null) {
  return (action ?? '').trim().toUpperCase() === 'TURN_ON'
}

/**
 * Fetch the command history from both tables and merge into `LogEntry[]`,
 * newest first. `id` is namespaced (`c:<id>` / `s:<id>`) so {@link deleteLog}
 * knows which table to delete from.
 */
export async function fetchLogs(): Promise<LogEntry[]> {
  const supabase = createClient()
  const [commands, schedules] = await Promise.all([
    supabase
      .from('air_commands')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('air_schedules')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  if (commands.error) throw commands.error
  if (schedules.error) throw schedules.error

  const commandLogs: LogEntry[] = (commands.data ?? []).map((row) => ({
    id: `c:${row.id}`,
    createdAt: row.created_at,
    time: format(new Date(row.created_at), 'dd/MM/yyyy HH:mm'),
    power: isPowerOn(row.action),
    temp: row.temp ?? 0,
    mode: (row.mode ?? 'cool') as IMode,
    daily: false,
    fromCron: row.from_cron ?? false,
    status: row.status ?? null,
    startTime: null,
    endTime: null,
  }))

  const scheduleLogs: LogEntry[] = (schedules.data ?? []).map((row) => ({
    id: `s:${row.id}`,
    createdAt: row.created_at,
    time: format(new Date(row.created_at), 'dd/MM/yyyy HH:mm'),
    power: row.is_enabled,
    temp: row.target_temp ?? 0,
    mode: (row.mode ?? 'cool') as IMode,
    daily: true,
    fromCron: row.from_cron ?? false,
    status: null,
    startTime: toHHmm(row.start_time),
    endTime: toHHmm(row.end_time),
  }))

  return [...commandLogs, ...scheduleLogs].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
}

/** Delete a log entry from whichever table its namespaced `id` points to. */
export async function deleteLog(id: string) {
  const supabase = createClient()
  const [prefix, rawId] = id.split(':')
  const table = prefix === 's' ? 'air_schedules' : 'air_commands'
  const { error } = await supabase.from(table).delete().eq('id', Number(rawId))
  if (error) throw error
}

/** Push a recurring daily cycle to `air_schedules`. */
export async function pushSchedule(input: AirScheduleInput) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('air_schedules')
    .insert({ ...input, from_cron: false })
    .select()
    .single()

  if (error) throw error
  return data
}
