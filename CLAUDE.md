# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js 16 with breaking changes

This project runs **Next.js 16.2.7** + **React 19.2** + **Tailwind v4**. The local copy has breaking API/convention changes vs. older Next.js. **Before writing framework code, read the relevant guide in `node_modules/next/dist/docs/`** (`01-app`, `02-pages`, `03-architecture`). Do not rely on training-data knowledge of Next.js. Heed deprecation notices.

Notable departures from common knowledge:
- Middleware is **`proxy.ts`** at the repo root (exports `proxy()`), not `middleware.ts`.
- shadcn uses the **`base-nova`** style backed by **`@base-ui/react`** (not Radix). Read `.agents/skills/shadcn/rules/base-vs-radix.md` before adding/editing UI primitives.

## Commands

Package manager is **Bun** (`bun.lock`). `npm`/`pnpm`/`yarn` also work but prefer Bun.

```bash
bun dev          # dev server (Turbopack) at http://localhost:3000
bun run build    # production build
bun start        # serve the production build
bun run lint     # ESLint (flat config, eslint-config-next)
```

No test runner is configured yet.

## Architecture: Feature-Sliced Design (FSD) v2.1

The codebase follows FSD. The authoritative reference is the bundled skill at `.agents/skills/feature-sliced-design/` (`SKILL.md` + `references/`) — read it before restructuring code or deciding where something belongs.

### The two-folder routing split (important and non-obvious)

Next.js routing and the FSD `pages` layer collide by name, so they are deliberately separated:

- **`app/`** (repo root) — the App Router. Route files are **thin re-exports** of FSD page slices, e.g. `app/page.tsx` is `export { LoginPage as default, metadata } from "@/pages/login"`. Keep route files to re-exports + route config; real UI/logic lives in `src/pages/`.
- **`src/pages/`** — the FSD `pages` layer. The actual page slices are `login` (route `/`, the app root — now the PIN keypad screen, the only page reachable while locked) and `remote` (route `/remote`, the AC remote-control UI shown once unlocked). The PIN page is the app root; there is no separate landing page.
- **`pages/`** (repo root) — an **intentionally empty** folder (README only). It must exist so Next.js does not interpret `src/pages/` as the legacy Pages Router. Do not add route files here.
- **`src/app/`** — the FSD `app` layer (cross-cutting init): `providers/`, `fonts.ts`, `styles/globals.css`. This is *not* the router.

### Layers and import direction

Layers under `src/`, highest to lowest: `app → pages → widgets → features → entities → shared`. `widgets/` and `entities/` are not present yet — add them only when a real need exists (FSD: "start simple, extract when needed").

**Import rule:** a module may only import from layers strictly *below* it. Cross-imports between slices on the same layer are forbidden (e.g. one `features/*` slice importing another).

**Public API rule:** every slice/segment exposes a barrel `index.ts`. Import from the slice root (`@/features/pin-gate`, `@/shared/ui`), never reach into internal files from outside the slice — the one sanctioned exception is `@/features/pin-gate/model/session`, which is server-only and kept out of the barrel on purpose. When adding a component, re-export it from the slice's `index. ts`.

Path aliases (see `tsconfig.json`): `@/app/*`, `@/pages/*`, `@/widgets/*`, `@/features/*`, `@/entities/*`, `@/shared/*`, and `@/*`.

## The remote domain (the app's actual product logic)

The `/remote` page is an air-conditioner remote that writes to two Supabase tables. All data access lives in **`src/pages/remote/api/command.ts`** — a `"use server"` module whose every export is a Server Action calling `requireUnlocked()` first (see the PIN gate section). Client Components import and call these directly. Shared types (`IMode = "fan" | "dry" | "cool"`, `LogEntry`, the input payloads) and the `mode` list (icon per mode, from `react-icons/fa6`) live in `src/pages/remote/config/index.ts`.

Timestamps come back as raw ISO strings (`LogEntry.createdAt`) and are formatted in `logView.tsx`, i.e. in the browser. Do not format dates inside the Server Actions — the server's timezone (UTC on most hosts) is not the viewer's.

Two tables, two intents:
- **`air_commands`** — one-shot commands. Columns used: `action` (`"TURN_ON"`/`"TURN_OFF"`), `temp`, `mode`, `status` (written as `"pending"`; a downstream consumer flips it to success/failed), `from_cron`, `created_at`. Written by `pushCommand`.
- **`air_schedules`** — recurring daily schedules. Columns: `start_time`/`end_time` (`time`, nullable), `target_temp`, `mode`, `is_enabled` (NOT NULL, default false), `created_at`. Written by `pushSchedule`. **It has no `from_cron` column** — that flag exists only on `air_commands`; inserting it here fails with `42703 column does not exist`.

`from_cron` marks rows the automation created vs. the user — this app only writes user rows (`from_cron: false`, on `air_commands` only) and reads the flag back for the log view.

**The automation lives in the database, not in this repo:** a `pg_cron` job (`jobid 1`, schedule `* * * * *`) runs `select check_and_generate_air_commands();` every minute. That plpgsql function scans `air_schedules` for a `start_time`/`end_time` matching the current Asia/Bangkok hour+minute and inserts a `TURN_ON`/`TURN_OFF` row into `air_commands`. A separate device consumer (also outside this repo, connecting with the **anon** key) reads those rows and writes `status` back — the app never writes `status` except as the initial `'pending'`.

`src/shared/api/supabase/types.ts` mirrors the live schema (verified against `information_schema.columns`). Check the database before trusting a column list — this file is the source of truth for the app, but the database is the source of truth for this file.

Read paths: `fetchLatestCommand()` seeds the remote's power/temp/mode from the newest `air_commands` row; `fetchLogs()` merges both tables into a unified `LogEntry[]` sorted by `createdAt` desc (schedules get `daily: true`); `deleteLog(id)` routes by an `"s:"`/`"c:"` id prefix to the right table. Temp is clamped to **20–30°C** in the UI (`MIN_TEMP`/`MAX_TEMP` in `remotePage.tsx`).

The page (`remotePage.tsx`) is a single `'use client'` component with local `useState` and two views toggled by a bottom bar: the remote pad and the log/history view (`logView.tsx`). Submitting with the "daily" switch on + power on calls `pushSchedule`; otherwise `pushCommand`.

## Access control: the PIN gate (replaced Supabase Auth)

There is **no Supabase Auth** in this app any more — no sign-up, no email/password, no user table. Entry is a single shared PIN, and everything about it lives in `src/features/pin-gate/`:

- **`config/index.ts`** — client-safe constants (`PIN_LENGTH`, `KEYPAD`). Import these from Client Components; never import `model/session` there.
- **`model/session.ts`** — **server-only**. Reads `APP_PIN`, mints/verifies the unlock token (HMAC-SHA256 over a constant payload via Web Crypto), and owns `PIN_COOKIE` + `PIN_COOKIE_OPTIONS`. Deliberately **not** re-exported from the slice barrel; `proxy.ts` imports it directly from `@/features/pin-gate/model/session`.
- **`api/actions.ts`** — Server Actions `unlock` (used with `useActionState`) and `lock`. `unlock` verifies the PIN, sets the cookie, and `redirect`s to `/remote`; wrong PINs return `{ error, attempt }` instead of throwing.
- **`ui/pin-form.tsx`** — the keypad. Auto-submits on the last digit; the pad resets by remounting on `key={state.attempt}` (do not reintroduce a `setState` inside an effect — the `react-hooks/set-state-in-effect` lint rule rejects it).

Conventions to preserve:
- The PIN never reaches the browser. It lives in **`APP_PIN`** — a server-only env var that must **never** get a `NEXT_PUBLIC_` prefix. The browser only ever holds the opaque HMAC token.
- The cookie is **httpOnly, sameSite lax, `secure` in production, and has no `maxAge`/`expires`** — a session cookie, so closing the browser forgets the unlock. Changing `APP_PIN` or `APP_SESSION_SECRET` invalidates every issued cookie.
- Route protection is centralized in `proxy.ts`: `/` (the PIN screen) is the only path reachable while locked; everything else redirects there. An already-unlocked visitor hitting `/` is bounced to `/remote`. Because the gate is global, pages do **not** re-check access — `RemoteContainer` renders straight through.
- `unlock` applies a best-effort in-memory rate limit (8 attempts/minute per IP) plus a 400 ms penalty on wrong answers. It is per-instance and resets on redeploy — move it to a shared store if this ever runs on more than one instance.
- Proxy runs on the **Node.js runtime** in Next.js 16 and the `runtime` config option is not allowed in proxy files, which is why `model/session.ts` uses Web Crypto (works in both proxy and Server Actions).

## Supabase (data only)

`src/shared/api/supabase/` is server-side only — **there is no browser Supabase client, and no Supabase credential reaches the client bundle**:

- **`admin.ts`** (`createAdminClient`) — the only client. Uses the **secret/service-role key**, so it **bypasses RLS**; it starts with `import "server-only"` and is deliberately **not** re-exported from the barrel. Import it directly from `@/shared/api/supabase/admin`, and only from a module that has already called `requireUnlocked()`. `@supabase/ssr` has been removed; this uses `@supabase/supabase-js` directly.
- **`types.ts`** — hand-written `Database` type for `air_commands`/`air_schedules`. **Required**: without a `Database` generic, `supabase-js` widens rows to `never` and the build fails. Keep it in sync with the schema (or regenerate with `supabase gen types typescript`).
- **`config.ts`** — `SUPABASE_URL` (accepts the legacy `NEXT_PUBLIC_SUPABASE_URL` as a fallback) and `SUPABASE_SECRET_KEY` (accepts `SUPABASE_SERVICE_ROLE_KEY`). Copy `.env.example` → `.env.local`. **Never add a `NEXT_PUBLIC_` prefix to a Supabase key here** — that would inline it into the client bundle at build time and undo the whole arrangement.

**Security model:** anon/publishable access to `air_commands`/`air_schedules` is revoked at the database, so the PIN gate is the real boundary: only the server can reach the tables, and it refuses to unless the request carries a valid unlock cookie. Two consequences to respect when adding features — (1) never move a Supabase call back into a Client Component, it will simply be denied, and (2) never add a Server Action that touches `createAdminClient()` without `requireUnlocked()` at the top, or it becomes an open, RLS-free endpoint to the database.

## shadcn / UI

UI primitives live in `src/shared/ui/` (alias target `@/shared/ui`), styles in `src/app/styles/globals.css`, `cn()` helper in `src/shared/lib/utils.ts`. Config in `components.json` (`style: base-nova`, `rsc: true`, base color `neutral`, icons `lucide`). Consult `.agents/skills/shadcn/` (`rules/`, `cli.md`) when adding components.

Two icon sets coexist: **`lucide-react`** is the configured shadcn library (use it for generated primitives), but feature/page UI also pulls from **`react-icons`** (e.g. `react-icons/fa6`, `react-icons/io`). Fonts are wired in `src/app/fonts.ts` (Kanit for sans, Geist Mono for mono). Toasts use **`sonner`** — the `<Toaster />` is mounted once in the root `app/layout.tsx`; call `toast()` from anywhere. Much of the UI copy is in Thai.

## Conventions for new code (not yet exercised, so set the pattern)

- **Forms:** `react-hook-form` + `@hookform/resolvers` + `zod@4` are installed but unused — current forms use a native `<form>` with a Server Action (the PIN form via `useActionState`). Use the native + Server Action pattern for gate-style flows; reach for `react-hook-form` + a `zod` resolver only for richer client-side forms.
- **Dates:** `date-fns@4` + `react-day-picker@10` back the `Calendar` (`@/shared/ui`); the composed `TimePicker` (`@/shared/ui`) is a time-only (hour/minute) popover picker. Use these rather than adding another date library.
- **State & data fetching:** no global state library, no TanStack Query, and (since the auth context was removed) no global React Context either — `Providers` only mounts the `<Toaster />`. Page UI uses local `useState` (see `remotePage.tsx`) and calls Server Actions from `useEffect`/handlers. Don't introduce Redux/Zustand/react-query without a clear need.
