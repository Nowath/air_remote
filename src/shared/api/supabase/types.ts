// Hand-written schema types for the Data API (FSD `shared/api` segment).
//
// Supabase's generated types are not wired up in this project, and without a
// `Database` generic `supabase-js` widens table rows to `never`. Keep these in
// sync with the two tables the app touches; regenerate with the Supabase CLI
// (`supabase gen types typescript`) if the schema grows.

/** Cooling modes the AC understands. Mirrors `IMode` in the remote page config. */
export type ModeValue = "fan" | "dry" | "cool";

// Verified against `information_schema.columns` on 2026-07-26 — nullability
// below mirrors the live schema exactly.

/** One-shot command row — `status` is written back by the device consumer. */
export type AirCommandRow = {
  id: number;
  created_at: string;
  action: string | null;
  temp: number | null;
  status: string | null;
  mode: ModeValue | null;
  /** NOT NULL, defaults to false. */
  from_cron: boolean;
};

/**
 * Recurring daily schedule row.
 *
 * Has **no `from_cron` column** — that flag exists only on `air_commands`.
 * Inserting one here fails with `42703 column does not exist`.
 */
export type AirScheduleRow = {
  id: number;
  created_at: string;
  start_time: string | null;
  end_time: string | null;
  target_temp: number | null;
  mode: ModeValue | null;
  /** NOT NULL, defaults to false. */
  is_enabled: boolean;
};

// Every column is either generated (`id`, `created_at`) or nullable, so an
// insert may legitimately omit any of them.
export type Database = {
  public: {
    Tables: {
      air_commands: {
        Row: AirCommandRow;
        Insert: Partial<AirCommandRow>;
        Update: Partial<AirCommandRow>;
        Relationships: [];
      };
      air_schedules: {
        Row: AirScheduleRow;
        Insert: Partial<AirScheduleRow>;
        Update: Partial<AirScheduleRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};
