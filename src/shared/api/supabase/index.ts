// Public API for the Supabase integration (FSD `shared/api` segment).
//
// The app reaches Supabase only from the server, via Server Actions using the
// secret key. That client lives in `./admin` and is deliberately NOT exported
// here — import it directly from `@/shared/api/supabase/admin` so no route into
// it exists from client code. Only types are safe to share.
export type {
  Database,
  AirCommandRow,
  AirScheduleRow,
  ModeValue,
} from "./types";
