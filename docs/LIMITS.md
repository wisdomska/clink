# Limits and free-tier budget

Clink runs entirely on free plans. This page records each service's limits as checked on 13 November 2026, how Clink stays inside them, and what to upgrade first. Numbers move; check the linked pages before relying on them.

## Summary

| Service                                                                                        | Free allowance (checked Nov 2026)                                                                                                                                                        | Clink's guardrails                                                                                                                            | Upgrade trigger                                                               |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Vercel Hobby](https://vercel.com/pricing)                                                     | About 100 GB bandwidth, 1M edge requests, 4 active CPU hours a month, 1 seat. **Personal, non-commercial use only.**                                                                     | Static marketing pages, no image optimisation on user media, API routes stay short, crons run in Postgres not Vercel                          | Any revenue (Pro is required for commercial use), or CPU hours above 70%      |
| [Supabase Free](https://supabase.com/pricing) (x2: prod, preview)                              | 500 MB database, 1 GB file storage, 5 GB egress + 5 GB cached egress, 50k MAU, 200 concurrent realtime connections, 2M realtime messages, 50 MB per upload, **pauses after 7 days idle** | One realtime channel per couple, 30 s presence heartbeat, 50 ms stroke batching, paginated queries, nightly housekeeping, keep-alive workflow | Database above 350 MB, egress above 3.5 GB, or 140+ concurrent couples online |
| [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) (optional, `STORAGE_DRIVER=r2`) | 10 GB-month storage, 1M Class A, 10M Class B operations a month, no egress fees                                                                                                          | Client compresses images to 2048 px WebP, video capped at 60 s / 720p, voice at 3 min, signed URLs with short lifetimes                       | Storage above 7 GB                                                            |
| [Gmail SMTP](https://support.google.com/a/answer/166852)                                       | About 500 recipients per rolling 24 h on a personal account, 100 recipients per message                                                                                                  | Passkeys and Google sign-in are primary; email only for verify, reset and magic link                                                          | More than ~300 sign-ups or resets a day                                       |
| [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669) (fallback)                    | 300 emails a day, Brevo footer on messages                                                                                                                                               | Swap SMTP host in Supabase Auth settings, no code change                                                                                      | n/a                                                                           |
| Web Push (VAPID)                                                                               | Free, no vendor                                                                                                                                                                          | Quiet hours, discreet copy, After Dark sends generic text only                                                                                | n/a                                                                           |
| [Sentry Developer](https://sentry.io/pricing/)                                                 | 5,000 errors a month, 1 user                                                                                                                                                             | Errors only, no performance tracing, no session replay, PII scrubbed, disabled on `/dark`                                                     | Errors regularly above 3,500 a month                                          |
| [PostHog Free](https://posthog.com/pricing)                                                    | 1M events a month, 1 year retention                                                                                                                                                      | Cookieless, whitelisted event names only (`src/lib/analytics-events.ts`), no content, never on `/dark` or `/admin`                            | Events above 700k a month                                                     |
| GitHub Actions                                                                                 | Free for public repos; 2,000 min a month for private repos                                                                                                                               | CI cancels superseded runs; keep-alive is a two-step curl                                                                                     | Private repo with heavy CI                                                    |

The admin dashboard (`/admin`) shows storage, database and realtime use against these limits, with warnings at 70% and 90%.

## Vercel deployment storage

Every retained deployment stores its static output and each Function bundle, and Hobby has a fixed allowance. Clink keeps this small:

- **Retention** (Project Settings, Build and Deployment, Deployment Retention Policy): previews, canceled and errored builds kept 1 day; production kept 1 week. Vercel still always keeps the newest few deployments and whatever the production and preview URLs point to.
- **Fewer builds** (`vercel.json`): only `main` and `preview` deploy (Dependabot and other branches do not), and commits that only touch docs, tests, CI or scripts skip the build (`ignoreCommand`).
- **Smaller Functions** (`next.config.ts`, `outputFileTracingExcludes`): the musl, macOS and Windows builds of sharp's libvips are not packaged, because Vercel runs glibc Linux. The four image routes dropped from about 42 MB to about 23 MB each.
- **Cleanup**: superseded deployments can be deleted from the project's Deployments page; deleting stops the storage charge at once (they stay restorable for a short recovery window).

Storage is shared by every project on the account, so other projects' deployments count too. Setting a team-wide retention policy (Team Settings, Build and Deployment, Deployment Retention Policy, with "Apply this policy to all existing projects") is the quickest way to reduce all of them.

## Content policies

Clink is for consenting adults in a relationship. After Dark content is private, shared between exactly two linked adults, and never public.

- [Supabase AUP](https://supabase.com/aup) forbids content that is obscene, non-consensual, or involves minors, and lets Supabase suspend accounts. It does not name private adult content between consenting adults, so the wording leaves room for interpretation.
- [Vercel AUP](https://vercel.com/legal/acceptable-use-policy) forbids sexually exploitative, non-consensual and illegal content. Vercel only serves the app shell and API; no media is stored or served through Vercel.
- Mitigations: After Dark media lives in a separate private bucket (`clink-sensitive`), is never given a URL: it is streamed through the API only after a server-side PIN session check (with watermark burned in and EXIF stripped), is never indexed (`noindex`, no public URLs), and can be wiped by either partner instantly. Reports go to the admin queue; admins never see After Dark content.
- Risk: a provider could still decide an app with an adult section breaches its terms. If that happens, move sensitive media to R2 (already supported by the storage adapter) and review the provider's terms again before launch.

## Email deliverability

There is no custom domain, so domain-verified senders (such as Resend) cannot reach users.

1. Create a dedicated Gmail account, turn on 2-step verification, generate an app password.
2. In each Supabase project: Authentication, SMTP settings: host `smtp.gmail.com`, port `465`, username the Gmail address, password the app password, sender name `Clink`.
3. Expect some messages to land in spam: Gmail sends without SPF/DKIM alignment for a custom domain because there is none. The sign-in screen tells people to check spam.
4. Fallback: [Brevo free SMTP](https://www.brevo.com/free-smtp-server/) (`smtp-relay.brevo.com`, port 587), 300 emails a day.

## Age verification

Paid age-verification providers are out of budget. `src/lib/server/age-verification.ts` defines a provider-agnostic `AgeVerification` interface:

- `SelfAttestAdapter` (live): date of birth at sign-up (under-18 blocks the account for 24 h and records nothing else), plus a signed 18+ declaration from both partners before the Unhinged tier unlocks.
- `ProviderAdapter` (stub): drop in a real provider later by setting `AGE_VERIFICATION_PROVIDER`.

**Limitation:** self-attestation does not prove age. Some jurisdictions require stronger checks for adult content; add a real provider before marketing After Dark in those places.

## Keeping free projects awake

Supabase Free pauses a project after 7 days without activity. `.github/workflows/keep-alive.yml` pings `/api/health` (which reads the database) and the Supabase REST API every 3 days for both projects. Set repo secrets `SUPABASE_PROD_URL`, `SUPABASE_PROD_ANON_KEY`, `SUPABASE_PREVIEW_URL`, `SUPABASE_PREVIEW_ANON_KEY`.

## What to upgrade first as Clink grows

1. **Vercel Pro** the moment Clink earns money (Hobby is non-commercial).
2. **Supabase Pro** for production when the database passes ~350 MB, egress passes ~3.5 GB, or the 7-day pause becomes a risk. It also brings daily backups.
3. **A transactional email provider with a custom domain** once sign-ups pass ~300 a day.
4. **A real age-verification provider** before promoting After Dark in regulated markets.
5. **R2 paid usage** only after 10 GB of media.
