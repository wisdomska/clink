# Owner setup: the steps only the owner can do

Everything else (databases, deploys, sign-in settings, passkeys, Google sign-in, scheduled jobs, keep-alive, releases) is already set up. These steps need your own accounts, devices or GitHub admin rights.

## 1. Publish the Google sign-in app (2 minutes)

Until the app is published, only "test users" can use Continue with Google.

1. Open https://console.cloud.google.com/auth/audience (make sure the project picker at the top says **Clink**).
2. Under **Publishing status**, click **Publish app**, then **Confirm**.
3. The status should now say **In production**. Clink only asks Google for name and email, so no review is needed.

## 2. Sign in for the first time and add a passkey (3 minutes)

1. Open https://clinkapp.vercel.app/login (a private window is fine).
2. Tap **Continue with Google** and choose **wisdomska@gmail.com** (already an admin).
3. Enter your date of birth and set up your profile when asked.
4. Open **Settings** and tap **Sign in with a passkey**. Approve with your fingerprint, face or screen lock. From now on you can sign in without Google or email.
5. Open https://clinkapp.vercel.app/admin to check the admin dashboard opens.

## 3. A Gmail account for sending email (10 minutes)

Supabase's built-in mailer only reaches your own Supabase login address, about 2 emails an hour. Until this is done, other people can sign up with Google or passkeys but not with email.

1. Create a new Gmail account just for Clink at https://accounts.google.com/signup, for example `clink.mail@gmail.com`.
2. Signed in as that account, open https://myaccount.google.com/security and turn on **2-Step Verification** (Google needs a phone number).
3. Open https://myaccount.google.com/apppasswords, type `Clink` as the app name and click **Create**.
4. Copy the 16-character password Google shows (spaces don't matter).
5. Then either send the address and the app password to the developer, or run this from the `clink` folder yourself:

```bash
SUPABASE_ACCESS_TOKEN=your-supabase-token VERCEL_TOKEN=your-vercel-token SMTP_USER=clink.mail@gmail.com SMTP_PASS=your-app-password pnpm setup:cloud
```

It prints `Custom SMTP set.` and `Email templates set.` for each project. Sign-in emails then come from that address, branded, and their links work on any device.

## 4. Protect the main branch (1 minute)

1. Open https://github.com/wisdomska/clink/settings/branches
2. Click **Add classic branch protection rule**.
3. **Branch name pattern:** `main`.
4. Leave every box unticked. A rule on its own already blocks force-pushes and deleting the branch. Don't tick "Require a pull request", or direct pushes stop working.
5. Click **Create**.

## 5. Optional: error reporting (Sentry, 5 minutes)

1. Sign up at https://sentry.io/signup/ (the free Developer plan).
2. Create a project, choose **Next.js**, name it `clink`.
3. Open **Settings → Projects → clink → Client Keys (DSN)** and copy the DSN (`https://...ingest...sentry.io/...`).
4. Send it to the developer, or add it in Vercel yourself: https://vercel.com → **clinkapp** → **Settings → Environment Variables**. Add `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`, both set to the DSN, ticking Production and Preview. Then redeploy (**Deployments**, newest, **⋯ → Redeploy**).

Private screens (After Dark, media, admin) never report errors.

## 6. Optional: product analytics (PostHog, 5 minutes)

1. Sign up at https://eu.posthog.com/signup. Choose the **EU** cloud; Clink's security rules only allow the EU address.
2. Open **Project settings** and copy the **Project API key** (starts with `phc_`).
3. Send it to the developer, or add `NEXT_PUBLIC_POSTHOG_KEY` in Vercel as in step 5 and redeploy.

Clink only sends a short allow-list of event names. Never message text, names or anything from After Dark.
