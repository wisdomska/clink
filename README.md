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

The Vercel project (`clinkapp`) already builds `main` to production and `preview` to the preview URL. The backend needs two Supabase Free projects, which only the account owner can create. One command does the rest:

1. Create a Supabase access token (supabase.com, Account, Access Tokens) and use the Vercel token you already have. Keep both in your terminal only.
2. Run:

```bash
SUPABASE_ACCESS_TOKEN=your-token VERCEL_TOKEN=your-token pnpm setup:cloud
```

It creates or reuses `clink-prod` and `clink-preview`, applies every migration and the seed, stores the cron URL and secret in Vault, turns on TOTP, sets the site and redirect URLs, and writes the Supabase keys and `CRON_SECRET` into Vercel for each environment. It is safe to re-run.

3. Redeploy (push a commit, or Redeploy in Vercel).
4. In each Supabase project's Authentication settings: add Google, turn on passkeys, and set custom SMTP (`docs/LIMITS.md`).
5. Add the repo secrets for the keep-alive workflow (`docs/LIMITS.md`).

## Becoming an admin

1. Sign up at https://clinkapp.vercel.app with an email listed in `ADMIN_EMAILS`.
2. Run `pnpm seed:admin` against production.
3. Open `/admin`. Admins go straight in; access is checked against `is_admin` on every page and API.

## Contributing

Branch from `preview`, open a pull request into `preview`, and promote to `main` when CI is green. Commits follow [Conventional Commits](https://www.conventionalcommits.org).

## Licence

Proprietary. Copyright (c) 2026 wisdomska(senya). See [`LICENSE`](LICENSE).
