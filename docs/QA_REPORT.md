# QA report

Release: v1.0.0 · Date: 14 November 2026 · Build: `main`

All results below come from the local Supabase stack (same migrations and seed as production) and a production build (`pnpm build && pnpm start`), plus GitHub Actions on every push. Production is live at https://clinkapp.vercel.app; it is not yet connected to a cloud Supabase project (see "Known limits").

## Summary

| Suite                            | Command                                | Result                                                                                                                                                        |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | `pnpm lint`                            | Clean, zero warnings (React Compiler rules on)                                                                                                                |
| Types                            | `pnpm typecheck`                       | Clean, TypeScript strict                                                                                                                                      |
| Unit                             | `pnpm test:coverage`                   | 44 passed. Coverage on logic files: 92.7% statements, 87.2% branches, 94.9% functions, 95.7% lines (gate: 80/75/80/80)                                        |
| Row-level security               | `pnpm test:rls`                        | 64 passed. Fails if any public table is missing from the matrix                                                                                               |
| End to end                       | `pnpm test:e2e`                        | 38 tests (35 flows plus 3 accessibility sweeps) x 3 viewports (Pixel 7, tablet, 1440 px desktop) = 114 passed, two real partners in separate browser contexts |
| Accessibility                    | `tests/a11y/routes.spec.ts`            | axe-core on 27 routes (public, app, After Dark) x 3 viewports: zero serious or critical issues                                                                |
| Visual regression                | `tests/visual/public.spec.ts`          | 5 public pages x 3 viewports match their baselines (1% tolerance, clock frozen)                                                                               |
| Lighthouse (production, desktop) | `lhci collect`                         | `/login`: performance 99, accessibility 100, best practices 96, LCP 0.7 s, CLS 0. `/` and `/privacy`: accessibility 100, best practices 100, SEO 100          |
| Dependencies                     | `pnpm audit --prod --audit-level high` | No known vulnerabilities                                                                                                                                      |

`/login` scores SEO 60 because it is deliberately `noindex`. The landing and privacy pages reported no LCP in the first run because screens faded in from opacity 0; fixed by starting the fade at 0.01 (see `docs/DESIGN_TOKENS.md`).

## What the end-to-end suite proves

Core flows (spec section 10):

- 10.1: partner B links with A's code, both see the linked moment, A's Clink reaches B. A used code cannot be reused; one account links to one partner.
- Chat: text, typing, read receipts, reactions, empty state; the offline queue sends on reconnect; EXIF and GPS are stripped from photos on the server (SAF-03).
- Play: a full live round of How Well Do You Know Me between two browsers; the server referee refuses out-of-turn moves and peeking at hidden answers; app-wide invite toast joins the room.
- Plans and Keep: schedule a kit and see the stub in both time zones; challenge streaks; Open When letters stay sealed; capsules hold text, photo, video or voice.
- 10.3 to 10.6 (After Dark): hidden until both opt in; PIN with lockout; the lower tier wins; Unhinged needs both verified; spin, pass, spin again; nude request with "Not right now", 12 h cooldown and no reminders; unlink wipes every sensitive item for both.
- Accounts: passkeys added and removed; unlinked chat readable for 30 days and not writable; sign out everywhere cuts off already-issued tokens; ritual time changes only when both agree; PIN on open; discreet identity picked at install and applied to the manifest.
- Data and safety: export zip holds only your own non-private data and expires in 48 h; account deletion removes the user and what they shared; call shortcuts use the saved number; mood check-in reaches the partner once a day; switching away hides After Dark media and logs it; blocking inside After Dark unlinks and wipes for both.
- Admin: non-admins get 404; admins must enrol TOTP; actions are audited; no private content reaches admin screens.

Must-pass privacy checks, each also attempted directly against the API and the database with the partner's own token:

| Check                                                                      | Result |
| -------------------------------------------------------------------------- | ------ |
| A desire-match "No" is never revealed                                      | Pass   |
| View once cannot be reopened, re-fetched or found; storage returns nothing | Pass   |
| Expired and unsent media are deleted from storage, not hidden              | Pass   |
| Capsules cannot be read before their date                                  | Pass   |
| Cron endpoints refuse callers without the secret                           | Pass   |
| App PIN hash is not readable even by its owner                             | Pass   |

## Security self-review (OWASP ASVS 4.0.3, Level 2)

| Area                       | Status | Evidence                                                                                                                                                                  |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 Architecture            | Met    | Trust boundary is the API and Postgres RLS; the browser is never trusted for After Dark rules (`docs/ARCHITECTURE.md`)                                                    |
| V2 Authentication          | Met    | Supabase Auth; passkeys; TOTP required for admins (`aal2`); email verification before linking; rate limits on auth and PIN routes                                         |
| V3 Session management      | Met    | httpOnly, Secure, SameSite cookies; After Dark session slides on a 2 minute idle window; sign out everywhere revokes issued tokens (`app.session_live()`)                 |
| V4 Access control          | Met    | RLS on every table, server checks on every route, admin routes 404 for non-admins; 64 RLS tests                                                                           |
| V5 Validation and encoding | Met    | Zod on every request body; React escaping; no `dangerouslySetInnerHTML` with user content                                                                                 |
| V6 Cryptography            | Met    | argon2id PINs (hash-wasm); HMAC-signed cookies with `APP_SECRET`; TLS everywhere (HSTS preload)                                                                           |
| V7 Errors and logging      | Met    | Generic error bodies; audit events for sensitive actions; Sentry scrubs bodies, cookies, users and breadcrumbs and drops After Dark, media and admin errors (unit tested) |
| V8 Data protection         | Met    | `no-store` and `noindex` on private routes; sensitive media streamed, never given a URL; watermarking; wipe jobs verify deletion                                          |
| V9 Communications          | Met    | HTTPS only; HSTS; WebSocket over TLS                                                                                                                                      |
| V10 Malicious code         | Met    | Dependency audit in CI; Dependabot; lockfile frozen                                                                                                                       |
| V11 Business logic         | Met    | Server-side referee for games; consent maths in SQL; cooldowns and rate limits in Postgres                                                                                |
| V12 Files                  | Met    | Size and type limits; images re-encoded server-side; uploads to private buckets via presigned URLs                                                                        |
| V13 API                    | Met    | JSON only; CSRF covered by SameSite cookies and JSON content type                                                                                                         |
| V14 Configuration          | Met    | Nonce CSP, no third parties on `/dark` and `/admin`; secrets only in environment variables; `.env.example` has no values                                                  |

Open items: Lighthouse reports a Content Security Policy notice on `/login` without details (no violation appears in the browser console). Self-attested age is not proof of age (V2 does not cover this; recorded in `docs/LIMITS.md`).

## Known limits

- **Production backend not connected yet.** The Vercel project is live and builds from `main` and `preview`, but the two Supabase cloud projects (`clink-prod`, `clink-preview`) need to be created by the owner (it needs their Supabase account). Until then signed-in screens cannot load in production. Steps are in `README.md` under Deploying.
- Age verification is self-attestation (SAF-01). See `docs/LIMITS.md`.
- One-tap face blur needs the browser `FaceDetector` API; other browsers get the manual blur brush (DARK-09).
- Not yet asserted by a test, though implemented: HOME-03, CHAT-06, DARK-03, DARK-09, TOG-02, and the PLAY-03 300 ms latency budget (`docs/BUILD_PLAN.md`).
- Visual baselines are recorded on Linux; GitHub runners can rasterise fonts differently, so CI runs them as an informational step.
