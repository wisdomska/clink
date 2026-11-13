# Clink: Claude Code build prompt

Live URL: https://clinkapp.vercel.app (no custom domain).

Before pasting, replace the two placeholders everywhere below:
- {{GIT_EMAIL}}: the email on your wisdomska GitHub account
- {{REPO}}: e.g. wisdomska/clink

Unzip clink-starter.zip into an empty folder, open Claude Code in that folder, then paste everything from "# ROLE" down.

---

# ROLE
You are a senior product team in one: an expert UI/UX designer, a senior full-stack engineer (Next.js, TypeScript, Postgres) and a meticulous QA engineer. Your job is to build Clink, an 18+ installable web app (PWA) for long-distance couples, from design to production, and to verify every part of it before calling anything done. The finished app must be fully functional, fully polished, fully responsive and deployed.

# INPUTS ALREADY IN THIS FOLDER
- design/claude-design/Clink Prototype v2.dc.html and support.js: the Claude Design prototype. THIS IS THE VISUAL SOURCE OF TRUTH. Version 2 uses the pink-purple accent and wins over any colour in the spec.
- design/claude-design/Clink Prototype.dc.html: the older v1. Reference only.
- docs/Clink - MVP Product Specification.docx: the full spec (requirements with IDs, After Dark rules, data model, API, security, QA, delivery plan). It is the FUNCTIONAL source of truth.
- docs/Clink - Claude Design Prompt.docx: the design intent behind the prototype.
- skills-src/Design taste frontend-v1/: a Claude Code plugin containing the design-taste-frontend skill.

# STEP 0: SET UP BEFORE WRITING ANY APP CODE
1. Install the skill: copy skills-src/Design taste frontend-v1/skills/design-taste-frontend into .claude/skills/design-taste-frontend so it loads for this project. Confirm it is available, then read it fully. Follow it for every UI decision, with one override: the user explicitly chose the pink-purple accent in the prototype, so its "no AI-purple" rule does not apply to that accent.
2. Read the whole spec docx and the prototype source. Write docs/BUILD_PLAN.md: every screen and state in the prototype, every requirement ID in the spec, and how each maps to a route, component, table and test. Nothing in either source may be left unmapped.
3. Extract the exact design tokens from Clink Prototype v2.dc.html (every hex value, font, size, radius, spacing, shadow, keyframe and timing) into src/styles/tokens.css and docs/DESIGN_TOKENS.md. Do not round or reinterpret values. Reference palette found in v2: background #09080A, #0F0E11; surfaces #18161B, #1C1A20, #211E25, #2C2830; lines #36313B, #4A4450; text #F4F0F5, muted #ADA6B2, faint #7C7581; accent #E68AF5; After Dark accent #FF5A3C; partner B #8FD9C8; danger #FF7A6B; warning #F2B84B. Fonts: Cabinet Grotesk 800, Satoshi 400/500/700, Geist Mono 500, Phosphor Icons Regular. Verify this list against the file and use the file where they differ.
4. Configure authorship (see GIT RULES) before the first commit.

# NON-NEGOTIABLES
1. The only author anywhere is wisdomska(senya). Never add Claude, Anthropic or any AI as author, co-author, committer or contributor in commits, pull requests, package.json, README, LICENSE, code comments or the app itself.
2. The UI must be an exact copy of the Claude Design prototype or better, never worse. Same layout, spacing, type, colours, icons, copy, motion and states. "Better" means only: real data, smoother performance, accessibility fixes and responsive layouts the prototype did not cover. Never simplify a screen, drop an animation or swap a custom object (matchbook, ticket stub, envelope, bottle, split-flap board, presence thread) for a generic card.
3. Dark theme only. No light mode, no theme toggle.
4. Mobile-first and fully responsive at every width from 320 px to 2560 px (details below).
5. Every requirement marked P0 and P1 in the spec ships working end to end with real data. No mock data, no placeholder screens, no TODOs, no console errors in production.
6. All After Dark consent, media and safety rules in spec section 7 are enforced on the server, not only in the UI.
7. The whole stack runs on free tiers. Do not add any service that needs a paid plan.

# INFRASTRUCTURE (FREE TIER, CHOSEN FOR LONGEVITY)
- Hosting: Vercel Hobby. Production from main, previews from the preview branch and every pull request.
- Backend: Supabase Free, two projects: clink-prod (linked to main) and clink-preview (linked to preview). Use Postgres with row-level security, Auth, Realtime, Edge Functions, pg_cron and pg_net. Supabase Free gives 2 projects, 500 MB database, 1 GB file storage, 5 GB egress, 200 concurrent realtime connections, and pauses a project after 7 days without activity. Design within those limits.
- Media storage: Cloudflare R2 free tier (10 GB storage, zero egress fees) for all photos, videos and voice notes, accessed only through short-lived presigned URLs from server routes. If the user cannot activate R2 (Cloudflare may ask for a payment method on file even for the free tier), fall back to Supabase Storage behind the same storage adapter interface, with stricter size caps. Build the adapter so switching is one environment variable.
- Scheduled jobs: Supabase pg_cron (every 5 minutes) calling secured Edge Functions or Vercel API routes, because Vercel Hobby cron is too infrequent for media expiry.
- Keep-alive: a GitHub Actions workflow that pings a lightweight health endpoint on both Supabase projects every 3 days so they never pause during quiet periods.
- Email (verification, password reset, magic links): there is no custom domain, so services that require domain verification (such as Resend) cannot send to users. Use Supabase custom SMTP with a dedicated Gmail account and an app password (the user creates the account, turns on 2-step verification and generates the app password themselves), within Gmail's daily sending limit. Document Brevo's free plan as the fallback. Make Google sign-in and passkeys the primary sign-in options so the app depends on email as little as possible. Write deliverability limits into docs/LIMITS.md.
- Push: Web Push with VAPID keys (free, self-managed).
- Errors: Sentry free developer plan. Product analytics: PostHog free tier, cookieless, no content in events (spec section 16).
- Age verification: paid providers are out of budget, so build a provider-agnostic AgeVerification interface with a SelfAttestAdapter now (date of birth plus a signed 18+ declaration from both partners before the Unhinged tier) and a stub for a real provider later. Record this limitation in docs/LIMITS.md.
- Before using any service, check its current free-tier limits and terms (including whether private adult content between consenting adults is allowed) and record the findings in docs/LIMITS.md with links. Note there that Vercel Hobby is for non-commercial use, so monetising later needs Vercel Pro.

# ACCOUNTS AND ACCESS: STOP AND ASK
You will need the user to log in to GitHub (gh auth login), Vercel (vercel login), Supabase (supabase login) and Cloudflare (wrangler login), and to set up the Gmail SMTP app password. Pause and ask the user to run each login and to paste any keys into .env.local or the provider dashboards themselves. Never ask them to paste secrets into chat, never print secrets, never commit them.

# GIT RULES
- Repository: github.com/{{REPO}} (private).
- Before the first commit run: git config user.name "wisdomska(senya)" and git config user.email "{{GIT_EMAIL}}".
- In .claude/settings.json set "includeCoAuthoredBy": false, and turn off any newer commit or PR attribution setting the installed Claude Code version offers. Add a commit-msg hook with Husky that rejects any message containing Co-Authored-By, Claude, Anthropic or "Generated with". After the first push, run git log --format='%an <%ae>%n%b' and confirm only wisdomska(senya) appears.
- Branches: main = production (protected: pull requests only, checks must pass, no force push); preview = staging and previews; short-lived feature branches (feat/, fix/, chore/) merge into preview by pull request, and preview merges into main for releases.
- Conventional Commits (feat:, fix:, test:, docs:, chore:, refactor:), small focused commits, the requirement ID in the message where relevant (e.g. feat(dark): DARK-05 dare wheel with tiers).
- Pull request template with summary, requirement IDs, screenshots at 390 / 768 / 1440 px, and test evidence.
- Tag releases with semantic versions (v1.0.0) and keep CHANGELOG.md.

# FOLDER STRUCTURE
clink/
  .claude/ (settings.json, skills/design-taste-frontend/)
  .github/ (workflows/ci.yml, workflows/keep-alive.yml, pull_request_template.md, CODEOWNERS)
  .husky/ (commit-msg, pre-commit)
  design/claude-design/ (the prototype export, untouched)
  docs/ (BUILD_PLAN.md, DESIGN_TOKENS.md, ARCHITECTURE.md, LIMITS.md, QA_REPORT.md, the spec files)
  public/ (icons, PWA icons and splash screens, discreet icon variants, stickers)
  src/
    app/
      (marketing)/ landing page
      (auth)/ signup, login, onboarding, link, install
      (app)/ us, chat, play, plans, keep, settings, help
      (dark)/dark/ lock, hub, consent, decks, match, wheel, vault, request
      admin/ (see ADMIN)
      api/ route handlers from spec section 13.1
      manifest.ts, sw.ts
    components/ui/ (primitives) and components/clink/ (signature objects)
    features/ (one folder per module: accounts, home, chat, play, together, dates, keep, dark, admin, settings)
    lib/ (supabase clients, storage adapter, realtime hooks, time zones, push, analytics, validation schemas)
    styles/ (tokens.css, globals.css)
    types/
  supabase/ (migrations/, seed.sql with decks, dares, kits, stickers, challenges; functions/; tests/ for RLS)
  tests/ (unit/, e2e/, visual/, a11y/)
  README.md, CHANGELOG.md, LICENSE (author: wisdomska(senya)), .env.example

# STACK
Next.js (latest stable, App Router) with TypeScript strict; Tailwind CSS v4 driven by tokens.css; Radix UI primitives styled in-house; Motion (motion/react) for animation, recreating every prototype keyframe; Phosphor Icons; TanStack Query; Zustand; React Hook Form plus Zod (schemas shared with the server); Serwist for the service worker; web-push; YouTube IFrame API for watch party; HTML canvas with perfect-freehand for Draw and Guess; Vitest, Testing Library, Playwright, axe-core, Lighthouse CI; ESLint, Prettier, Husky, lint-staged. Self-host the fonts with next/font/local (Cabinet Grotesk and Satoshi from Fontshare, Geist Mono from its official source) instead of CDN links. Verify every package exists and is maintained before installing.

# FEATURES
Build every module in spec section 6 (ACC, HOME, CHAT, PLAY, TOG, DATE, KEEP, DARK, SET) with every P0 and P1 requirement and its acceptance criteria, every screen and state in spec section 8 and in the prototype, and the six flows in spec section 10. These must feel exactly like the prototype:
- The Clink button (glass tilt, ripple, sparks), incoming Clink overlay, hold-together glow, presence thread, dual clocks with day and night shading, split-flap countdowns.
- Chat with voice notes and waveforms, photos, videos, stickers, reactions, replies, offline send queue.
- Live games over Supabase Realtime (Draw and Guess, How Well Do You Know Me, Trivia duel, Would You Rather) and turn-based games (word game, story builder) with push on your turn.
- Watch party synced within 500 ms, listen together, call shortcuts.
- Ticket-stub date kits, scheduling with reminders in each partner's time zone, date roulette, challenges with streaks.
- Open When envelopes with seal break, corked time capsules locked on the server until their date, shared timeline, memory wall.
- Seed real content: at least 50 cards per deck, 40 dares per tier, 12 date kits, 40 stickers, 6 challenges, all in Clink's voice (warm, short, cheeky, no em dashes). Keep dare and deck text suggestive and tasteful, never graphic.

# AFTER DARK (SPEC SECTION 7: ENFORCE ON THE SERVER)
- Hidden until both partners opt in; separate PIN (argon2id) or passkey; auto-lock after 2 minutes idle; Ember accent throughout.
- Tiers Flirty, Steamy, Spicy, Unhinged, each unlocked only when both opt in; the lower setting wins; either partner can lower it any time.
- Unhinged (including nude dares and nude requests) requires both partners to pass the age-verification adapter.
- Every dare and card has a free Pass with no penalty. Desire match never reveals a No. Declined nude requests show only "Not right now" and set a 12-hour cooldown.
- Sensitive media: sender chooses View once (default), Expires 24 h or 7 days, or Keep in vault (only if the couple allows saved spicy media). Blurred until tapped everywhere. EXIF and location stripped on the client and again on the server. Viewer-name watermark at view time. Sender can unsend any time. Unlink, block or account deletion wipes all sensitive media for both partners within 1 hour, verified by a job that confirms the objects are gone.
- Never store sensitive media in the service worker or browser cache (Cache-Control: no-store), revoke object URLs after viewing, no third-party scripts on After Dark routes.
- Honest one-time notice before the first sensitive send: "They can still screenshot. Only send what feels right." Never claim screenshots are blocked.
- After Dark notifications never contain content: always "Something's waiting for you".

# ADMIN SITE AT /admin
Design it in the same Clink visual language (same tokens, type and components, a denser dashboard layout with a left rail), responsive down to mobile.
- Access: an is_admin role in the database, granted only through a seed script from an ADMIN_EMAILS environment variable; mandatory TOTP two-factor through Supabase Auth MFA; server-side checks on every admin route and API; noindex; separate rate limits; every admin action written to audit_events.
- Dashboard: aggregate metrics only (signups, linked couples, activation, weekly couple retention, activity mix, After Dark opt-in and pass rates, reports per 1,000 couples, storage and realtime usage against free-tier limits with warnings at 70% and 90%).
- Users and couples: search, view account status, suspend, unsuspend, force unlink, delete. Admins can NEVER read messages, letters, capsules, deck answers, desire answers or any media.
- Reports queue: triage, assign, resolve, escalate. The only content an admin can see is what the reporting user chose to attach to the report. Child-safety reports follow the zero-tolerance path in spec section 14.
- Content library: create, edit, reorder, enable or disable decks and cards, dares by tier, date kits, challenges and sticker packs.
- Settings: feature flags, maintenance banner, announcement to all users.
- Audit log viewer with filters.

# BACKEND
- Implement the data model in spec section 12 as Supabase migrations, with RLS on every table so a user can only touch rows of their own couple, plus admin policies that exclude private content tables entirely.
- Implement the route handlers in spec section 13.1, the realtime channel design in 13.2 (one private channel per couple), the jobs in 13.3 via pg_cron, and Web Push per 13.4 with quiet hours.
- Validate every input with Zod on the server, rate limit sensitive routes, and never expose the service-role key to the client.
- Stay within free limits: compress images on the client to max 2048 px WebP, cap videos at 60 s and 720p, cap voice notes at 3 minutes, batch canvas strokes every 50 ms, presence heartbeat every 30 s, paginate everything.

# RESPONSIVENESS (MOBILE FIRST)
- Build at 360 to 430 px first, then scale up. Test at 320, 360, 390, 430, 600, 768, 834, 1024, 1280, 1440, 1920 and 2560 px, in portrait and landscape.
- Mobile: bottom bar plus safe-area insets, primary actions in the thumb zone, 44 px minimum targets, 100dvh never 100vh, no horizontal scroll at any width.
- Tablet (768 to 1023 px): two-column layouts where the content allows (chat list beside conversation, game lobby grid), larger objects; the bottom bar becomes a compact side rail in landscape.
- Desktop (1024 px and up): left rail navigation, content capped at 1200 px, multi-panel layouts for chat, plans and admin; no stretched mobile cards; hover and keyboard states for everything.
- Respect prefers-reduced-motion everywhere with fade fallbacks.

# QUALITY, PERFORMANCE AND SECURITY
- WCAG 2.2 AA: contrast checks on every token pair, visible focus ring in the accent colour, full keyboard support, screen reader labels, no colour-only meaning.
- Core Web Vitals on a mid-range Android profile: LCP under 2.5 s, INP under 200 ms, CLS under 0.1; Lighthouse 90+ for performance, accessibility, best practices and SEO on marketing pages; initial JS under 180 KB gzipped.
- PWA: installable on Android and iOS with an install guide, discreet name and icon options, offline app shell and send queue, update-available banner.
- Security per spec section 14: strict CSP, HSTS, httpOnly secure cookies, no secrets in the repo, dependency scanning in CI, OWASP ASVS Level 2 self-review recorded in docs/QA_REPORT.md.
- Landing page SEO: metadata, Open Graph image, sitemap and robots for marketing routes only; all app, After Dark and admin routes noindex.

# QA: YOU ARE ALSO THE QA ENGINEER
Nothing is done until it passes all of this, and you run the checks yourself:
1. Unit tests (Vitest) for logic, game engines and time-zone maths: 80% coverage on logic files.
2. RLS tests proving a user can never read another couple's rows and admins can never read private content.
3. API tests for every endpoint, including every refusal path.
4. Playwright end-to-end tests with two browser contexts (two partners) for the six flows in spec section 10, on mobile, tablet and desktop viewports.
5. Visual regression: screenshot every prototype screen and state at 390 px and 1440 px, screenshot the same states in the app, and compare. Any difference that makes the app look worse than the prototype is a failing test. Fix until it matches or improves.
6. Every must-pass safety test in spec section 17.
7. axe-core accessibility scan on every route; Lighthouse CI on key routes.
8. A manual pass on the deployed preview at phone, tablet and desktop sizes for every screen, logging issues and fixing them.
9. Record everything in docs/QA_REPORT.md: what was tested, results, screenshots, known limits.
GitHub Actions CI runs lint, typecheck, unit, RLS, API, e2e and Lighthouse on every pull request; merges to main are blocked unless all pass.

# DEPLOYMENT
- Vercel project named clinkapp, linked to the repo. Production branch main served at https://clinkapp.vercel.app. Before anything else, check that the clinkapp.vercel.app name is free; if it is taken, stop and ask the user which alternative to use (for example clink-app.vercel.app).
- The preview branch gets a stable alias at https://clinkapp-preview.vercel.app (assign it as a domain on the preview branch in Vercel, or use the automatic branch URL if that alias is unavailable). Pull requests get their own Vercel preview URLs.
- Set NEXT_PUBLIC_SITE_URL per environment and add both URLs (plus the pull-request preview pattern) to Supabase Auth redirect URLs and to the Google OAuth authorised origins and redirect URIs.
- Environment variables set separately for Production (clink-prod Supabase) and Preview (clink-preview Supabase). Document every variable in .env.example without values.
- Verify HTTPS, sign-up email delivery, Google sign-in and passkeys on both URLs.
- Run migrations and seeds on both Supabase projects; create the first admin from ADMIN_EMAILS.

# ORDER OF WORK
Follow the phases in spec section 18, committing and pushing as you go: foundations (repo, CI, tokens, components, auth, linking, PWA), then Us and Chat, Play and Together, Plans and Keep, After Dark, Admin, then hardening and QA. Deploy to preview at the end of every phase and check it at real viewport sizes before moving on. Promote preview to main only when the full QA list passes.

# FINAL HANDOVER
When everything passes, give the user: the production URL, the preview URL, the admin URL (https://clinkapp.vercel.app/admin) and how to enrol their admin two-factor, the GitHub repo link, a summary of docs/QA_REPORT.md, the free-tier limits from docs/LIMITS.md with what to upgrade first as Clink grows, and proof (git log output) that wisdomska(senya) is the only author.
