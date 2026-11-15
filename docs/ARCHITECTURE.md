# Architecture

Clink is one Next.js app on Vercel talking to one Supabase project per environment. There is no other server. Everything runs on free plans (see `docs/LIMITS.md`).

```
 Phone / tablet / desktop (PWA, service worker, Web Push)
            |  HTTPS                     |  WebSocket
            v                            v
   Vercel: Next.js 16 App Router    Supabase Realtime
   - React Server Components        - one private channel per couple: couple:<id>
   - Route handlers in src/app/api  - postgres_changes behind RLS
   - src/proxy.ts (CSP, auth)               ^
            |  service role / user JWT      |
            v                               |
   Supabase Postgres (RLS on every table) --+
   - pg_cron every 5 min and daily  --pg_net-->  /api/jobs/tick, /api/jobs/daily
   - Auth: passwords, magic link, Google, passkeys, TOTP MFA for admins
   Storage: Supabase Storage or Cloudflare R2 (STORAGE_DRIVER)
```

## Layers

| Layer        | Where                                                                      | Notes                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes       | `src/app/(marketing)`, `(auth)`, `(app)`, `(dark)/dark`, `admin`, `help`   | Server components fetch the first paint; client components take over                                                                                                                                       |
| API          | `src/app/api/**/route.ts`                                                  | Every handler is wrapped by `handler()` in `src/lib/server/api.ts`: auth (`requireUser`, `requireCouple`, `requireDark`, `requireAdmin`), Zod validation (`parseJson`), Postgres rate limits, audit events |
| Features     | `src/features/{home,chat,play,plans,keep,dark,admin,settings,help,couple}` | Screen components, hooks and data helpers per module                                                                                                                                                       |
| Shared logic | `src/lib/*`                                                                | Pure, unit-tested: time zones, age gate, push copy, consent maths, challenges, YouTube sync, media rules                                                                                                   |
| Server-only  | `src/lib/server/*`                                                         | Service-role access, wipe, push, jobs, games referee, PIN, age verification                                                                                                                                |
| Database     | `supabase/migrations/*.sql`, `supabase/seed.sql`                           | Schema, RLS, `app.*` helper functions, `svc_*` service wrappers, cron                                                                                                                                      |

## Data and access rules

- **Row-level security everywhere.** After unlinking, `app.readable_couple_ids()` keeps the old couple readable (never writable) until `read_only_until`; `/archive` shows that chat. Policies use `app.*` helpers (`app.my_couple_id()`, `app.partner_id()`, `app.readable_couple_ids()` and friends). `tests/rls/rls.test.ts` fails if any public table is missing from its matrix.
- **Couple isolation.** Every couple-owned row carries `couple_id`. A user belongs to at most one active couple; linking and unlinking are server routes only.
- **After Dark tables have no client policies at all.** Reads and writes go through `/api/dark/*`, which checks the PIN session cookie (`clink_dark`, signed with `APP_SECRET`, 2 minute sliding idle window), the couple's tier agreement (`app.effective_tier_rank`) and the 18+ declarations, then uses the service role. The rules are therefore enforced on the server, never only in the UI.
- **Hidden game state** (answers, sealed picks, words) lives in `game_secrets`, readable only by the service role. Game engines in `src/features/play/engines` are pure TypeScript and run on the server as referee.
- **Service wrappers.** `public.svc_*` functions are `security definer` and granted to `service_role` only.

## Realtime

One private broadcast channel per couple (`couple:<id>`) carries clinks, typing, presence, drawing strokes (batched every 50 ms) and watch-party sync. Table changes use `postgres_changes`; the client calls `realtime.setAuth()` first (`subscribeAuthed` in `src/lib/realtime.ts`) so RLS sees the user, and refetches once subscribed so nothing sent during the join is lost. Presence heartbeats every 30 s.

## Media

1. The client compresses (images to 2048 px WebP, video 60 s / 720p, voice up to 3 min) and asks `/api/media` for a presigned upload.
2. The server re-encodes images with `sharp`, which strips EXIF and, for After Dark, burns in a watermark.
3. Normal media is read through short-lived signed URLs. Sensitive media is never given a URL: `/api/media/*` streams it after the PIN session check, with `Cache-Control: no-store`.
4. Wipe jobs (`src/lib/server/wipe.ts`) delete objects and verify they are gone.

## Background work

`pg_cron` calls `app.call_job()`, which reads the app URL and `CRON_SECRET` from Supabase Vault and posts to `/api/jobs/tick` (every 5 minutes: expire timed media, retry unlink wipes, date reminders, capsule unlocks) and `/api/jobs/daily` (03:17 UTC: account deletions and export cleanup; `app.housekeeping()` then prunes rate limits, expired invites, old notification logs and chats past their read-only window). Vercel crons are not used, so Hobby limits do not apply.

## Security

- Nonce-based CSP from `src/proxy.ts`; `/dark` and `/admin` allow no third-party origins at all.
- HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer, locked-down `Permissions-Policy`.
- After Dark, admin and media responses are `no-store`; After Dark and admin are `noindex`.
- PIN: argon2id (hash-wasm), 5 attempts then a 15 minute lockout. The same rules apply to the optional app-open PIN (`/unlock`, `src/lib/server/app-lock.ts`); until it is entered the server renders no couple data. Its hash columns are hidden from clients by column-level grants.
- Sign out everywhere: `app.session_live()` checks the token's `session_id` still exists in `auth.sessions`, inside `app.my_couple_id()` and `app.readable_couple_ids()`, so already-issued access tokens lose couple data the moment sessions are revoked.
- Admin: `is_admin` granted only by `pnpm seed:admin` from `ADMIN_EMAILS`, TOTP required (`aal2`) on every admin page and API, every action in `audit_events`.
- Sentry gets errors only, with bodies, cookies, users and breadcrumbs removed, and nothing from After Dark, media or admin. PostHog gets whitelisted event names only, cookieless, never on `/dark` or `/admin`.

## Environments

| Branch    | Vercel                              | Supabase        |
| --------- | ----------------------------------- | --------------- |
| `main`    | https://clinkapp.vercel.app         | `clink-prod`    |
| `preview` | https://clinkapp-preview.vercel.app | `clink-preview` |

Functions run in Vercel's London region (`lhr1`, set in `vercel.json`) next to both Supabase projects (`eu-west-2`), so each database call stays inside one region.

Migrations are applied with `supabase db push` against each project. Local development uses `supabase start` (Docker) with the same migrations and seed.
