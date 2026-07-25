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
- **`src/pages/`** — the FSD `pages` layer. The actual page slices are `login` (route `/`, the app root and only signed-out page) and `remote` (route `/remote`, the AC remote-control UI shown after sign-in). The login page is the app root; there is no separate landing page.
- **`pages/`** (repo root) — an **intentionally empty** folder (README only). It must exist so Next.js does not interpret `src/pages/` as the legacy Pages Router. Do not add route files here.
- **`src/app/`** — the FSD `app` layer (cross-cutting init): `providers/`, `fonts.ts`, `styles/globals.css`. This is *not* the router.

### Layers and import direction

Layers under `src/`, highest to lowest: `app → pages → widgets → features → entities → shared`. `widgets/` and `entities/` are not present yet — add them only when a real need exists (FSD: "start simple, extract when needed").

**Import rule:** a module may only import from layers strictly *below* it. Cross-imports between slices on the same layer are forbidden (e.g. one `features/*` slice importing another).

**Public API rule:** every slice/segment exposes a barrel `index.ts`. Import from the slice root (`@/features/auth`, `@/shared/ui`), never reach into internal files from outside the slice. When adding a component, re-export it from the slice's `index. ts`.

Path aliases (see `tsconfig.json`): `@/app/*`, `@/pages/*`, `@/widgets/*`, `@/features/*`, `@/entities/*`, `@/shared/*`, and `@/*`.

## The remote domain (the app's actual product logic)

The `/remote` page is an air-conditioner remote that writes to two Supabase tables. All data access lives in **`src/pages/remote/model/command.ts`** (uses the browser `createClient`; called from Client Components). Shared types (`IMode = "fan" | "dry" | "cool"`, `LogEntry`) and the `mode` list (icon per mode, from `react-icons/fa6`) live in `src/pages/remote/config/index.ts`.

Two tables, two intents:
- **`air_commands`** — one-shot commands. Columns used: `action` (`"TURN_ON"`/`"TURN_OFF"`), `temp`, `mode`, `status` (written as `"pending"`; a downstream consumer flips it to success/failed), `from_cron`, `created_at`. Written by `pushCommand`.
- **`air_schedules`** — recurring daily schedules. Columns: `start_time`/`end_time` (`HH:mm`), `target_temp`, `mode`, `is_enabled`, `from_cron` (inserted as `false`), `created_at`. Written by `pushSchedule`.

`from_cron` marks rows an external cron/automation created vs. the user — this app only writes user rows (`from_cron: false`) and reads the flag back for the log view. There is no cron code in this repo; it lives elsewhere and shares these tables.

Read paths: `fetchLatestCommand()` seeds the remote's power/temp/mode from the newest `air_commands` row; `fetchLogs()` merges both tables into a unified `LogEntry[]` sorted by `createdAt` desc (schedules get `daily: true`); `deleteLog(id)` routes by an `"s:"`/`"c:"` id prefix to the right table. Temp is clamped to **20–30°C** in the UI (`MIN_TEMP`/`MAX_TEMP` in `remotePage.tsx`).

The page (`remotePage.tsx`) is a single `'use client'` component with local `useState` and two views toggled by a bottom bar: the remote pad and the log/history view (`logView.tsx`). Submitting with the "daily" switch on + power on calls `pushSchedule`; otherwise `pushCommand`.

## Supabase auth (the wiring that spans files)

Lives in `src/shared/api/supabase/`. Three clients for three contexts — pick the right one:

- **`client.ts`** (`createClient`) — browser / Client Components. Safe to import via the barrel `@/shared/api/supabase`.
- **`server.ts`** (`createClient`, async) — Server Components, Server Actions, Route Handlers. Imports `next/headers`, so it is **server-only and intentionally NOT re-exported from the barrel** — import it directly from `@/shared/api/supabase/server`. Do not add it to `index.ts`.
- **`middleware.ts`** (`updateSession`) — called by root `proxy.ts` on every matched request to refresh the session and guard routes.

Conventions to preserve:
- In server/middleware code use **`getClaims()`** (verifies the JWT), never `getSession()`. Do not insert code between `createServerClient` and `getClaims()`.
- Auth flows are Server Actions in `src/features/auth/api/actions.ts` (`signIn`/`signOut`), wired to the form via `formAction`. On success `signIn` `redirect`s to `/remote`; on error it redirects back to `/` (the login page) with an `error` query param; `signOut` redirects to `/`. Both call `revalidatePath("/", "layout")` first. (One stale reference remains: the comment in `middleware.ts` still says signed-in users are sent to `/account` — the code actually redirects to `/remote`.)
- Route protection is centralized in `middleware.ts`: `PUBLIC_PATHS` (`/`, `/auth`) is reachable signed out; `AUTH_ONLY_PATHS` (`/`) bounces signed-in users to `/remote`. Unauthenticated visitors to any other route are redirected to `/` with a `redirectedFrom` query param.
- Client-side auth state comes from `AuthProvider` (`@/features/auth`), seeded server-side in `src/app/providers` via `getClaims()` and kept live with `onAuthStateChange`. Read it in Client Components with `useAuth()`; Server Components should call `getClaims()` directly.
- Env config is read literally in `config.ts` (prefers `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, falls back to the anon key). Copy `.env.example` → `.env.local`. `NEXT_PUBLIC_*` keys are inlined into the client bundle at build time.

## shadcn / UI

UI primitives live in `src/shared/ui/` (alias target `@/shared/ui`), styles in `src/app/styles/globals.css`, `cn()` helper in `src/shared/lib/utils.ts`. Config in `components.json` (`style: base-nova`, `rsc: true`, base color `neutral`, icons `lucide`). Consult `.agents/skills/shadcn/` (`rules/`, `cli.md`) when adding components.

Two icon sets coexist: **`lucide-react`** is the configured shadcn library (use it for generated primitives), but feature/page UI also pulls from **`react-icons`** (e.g. `react-icons/fa6`, `react-icons/io`). Fonts are wired in `src/app/fonts.ts` (Kanit for sans, Geist Mono for mono). Toasts use **`sonner`** — the `<Toaster />` is mounted once in the root `app/layout.tsx`; call `toast()` from anywhere. Much of the UI copy is in Thai.

## Conventions for new code (not yet exercised, so set the pattern)

- **Forms:** `react-hook-form` + `@hookform/resolvers` + `zod@4` are installed but unused — current forms (e.g. the login form) use a native `<form>` with a Server Action via `formAction`. Use the native + Server Action pattern for auth-style flows; reach for `react-hook-form` + a `zod` resolver only for richer client-side forms.
- **Dates:** `date-fns@4` + `react-day-picker@10` back the `Calendar` (`@/shared/ui`); the composed `TimePicker` (`@/shared/ui`) is a time-only (hour/minute) popover picker. Use these rather than adding another date library.
- **State & data fetching:** no global state library and no TanStack Query. Global state is React Context only (`AuthProvider`); page UI uses local `useState` (see `remotePage.tsx`). Data access goes through the Supabase clients directly. Don't introduce Redux/Zustand/react-query without a clear need.
