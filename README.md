# Clink

Do things together, from apart. Clink is an installable web app for long-distance couples: games, dates, dares and letters for two people in two places. One account links to exactly one person. 18+.

- Production: https://clinkapp.vercel.app
- Preview: https://clinkapp-preview.vercel.app
- Admin: https://clinkapp.vercel.app/admin

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres with row-level security, Auth, Realtime, Storage, pg_cron), optional Cloudflare R2, Web Push, Sentry and PostHog. Hosted on Vercel. Everything fits free plans: see [`docs/LIMITS.md`](docs/LIMITS.md).

## Docs

| File                                             | What it covers                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md)       | Every requirement and prototype screen mapped to routes, components, tables and tests             |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)   | How the pieces fit, access rules, realtime, media, background jobs, security                      |
| [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md) | Colours, type, spacing and motion from the prototype                                              |
| [`docs/LIMITS.md`](docs/LIMITS.md)               | Free-tier limits, content policies, email deliverability, age verification, what to upgrade first |
| [`docs/QA_REPORT.md`](docs/QA_REPORT.md)         | What was tested and the results                                                                   |

## Run it locally

Needs Node 22, pnpm 10 and Docker.

```bash
pnpm install
```

```bash
supabase start
```

Copy `.env.example` to `.env.local` and fill it from `supabase status -o env` (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) plus random values for `APP_SECRET` and `CRON_SECRET`.

```bash
pnpm dev
```

Open http://localhost:3000. Emails sent by the local stack appear in the local mail viewer at http://localhost:54324.

## Scripts

| Command                                  | Does                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Develop, build (webpack, for the service worker), serve              |
| `pnpm lint` / `pnpm typecheck`           | ESLint, TypeScript                                                   |
| `pnpm test` / `pnpm test:coverage`       | Unit tests (80% coverage gate on logic files)                        |
| `pnpm test:rls`                          | Row-level security proofs against the local database                 |
| `pnpm test:e2e`                          | Playwright: two partners, mobile, tablet and desktop, plus axe scans |
| `pnpm db:reset` / `pnpm db:types`        | Reset the local database, regenerate types                           |
| `pnpm seed:admin`                        | Grant admin to the emails in `ADMIN_EMAILS`                          |
| `pnpm icons`                             | Regenerate PWA icons                                                 |

## Deploying

1. Create two Supabase Free projects, `clink-prod` and `clink-preview`. For each: `supabase link`, then `supabase db push`, then run `supabase/seed.sql`.
2. In each project's Vault add `clink_app_url` (the matching Vercel URL) and `clink_cron_secret` (same value as `CRON_SECRET`) so pg_cron can reach `/api/jobs/*`.
3. In each project's Auth settings: site URL, redirect URLs, Google provider, passkeys, TOTP MFA, and custom SMTP (see `docs/LIMITS.md`).
4. In Vercel, set the variables from `.env.example` for Production (`main`) and Preview (`preview`), pointing at the matching Supabase project.
5. Run `pnpm seed:admin` once per environment with `ADMIN_EMAILS` set.

## Becoming an admin

1. Sign up at https://clinkapp.vercel.app with an email listed in `ADMIN_EMAILS`.
2. Run `pnpm seed:admin` against production.
3. Open `/admin`. You are asked to enrol two-factor: scan the QR code with an authenticator app and enter the 6-digit code. Every later visit asks for a fresh code.

## Contributing

Branch from `preview`, open a pull request into `preview`, and promote to `main` when CI is green. Commits follow [Conventional Commits](https://www.conventionalcommits.org).

## Licence

Proprietary. Copyright (c) 2026 wisdomska(senya). See [`LICENSE`](LICENSE).
