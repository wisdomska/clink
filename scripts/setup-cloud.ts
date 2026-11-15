/**
 * One-time cloud setup: creates (or reuses) the two Supabase Free projects,
 * applies every migration and the seed, stores the cron secret in Vault,
 * configures Auth, and writes the matching variables into Vercel.
 *
 * Run it yourself, in your own terminal, with your own tokens:
 *
 *   SUPABASE_ACCESS_TOKEN=... VERCEL_TOKEN=... pnpm setup:cloud
 *
 * Optional: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google sign-in),
 * SMTP_USER and SMTP_PASS (a Gmail address and its app password)
 * to send auth email through Gmail, SUPABASE_ORG_ID (defaults to your first organisation),
 * SUPABASE_REGION (defaults to eu-west-2), ONLY=prod or ONLY=preview.
 * Safe to re-run: existing projects are reused and migrations already applied
 * are skipped. Nothing secret is printed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { EMAIL_TEMPLATES } from "./email-templates";

const SB = "https://api.supabase.com/v1";
const VC = "https://api.vercel.com";
const VERCEL_PROJECT = "clinkapp";

const sbToken = process.env.SUPABASE_ACCESS_TOKEN;
const vcToken = process.env.VERCEL_TOKEN;
if (!sbToken || !vcToken) {
  console.error("Set SUPABASE_ACCESS_TOKEN and VERCEL_TOKEN first (see the comment at the top).");
  process.exit(1);
}
const region = process.env.SUPABASE_REGION ?? "eu-west-2";

const ENVS = [
  { key: "prod", name: "clink-prod", site: "https://clinkapp.vercel.app", target: "production" },
  {
    key: "preview",
    name: "clink-preview",
    site: "https://clinkapp-preview.vercel.app",
    target: "preview",
  },
] as const;

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${SB}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${sbToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  if (!r.ok)
    throw new Error(`Supabase ${init.method ?? "GET"} ${path}: ${r.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function vc<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${VC}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${vcToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  if (!r.ok)
    throw new Error(`Vercel ${init.method ?? "GET"} ${path}: ${r.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

const sql = (ref: string, query: string) =>
  sb<unknown[]>(`/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureProject(name: string, orgId: string) {
  const projects = await sb<Array<{ id: string; name: string; status: string }>>("/projects");
  let p = projects.find((x) => x.name === name);
  if (!p) {
    console.log(`Creating ${name} in ${region}...`);
    p = await sb("/projects", {
      method: "POST",
      body: JSON.stringify({
        name,
        organization_id: orgId,
        region,
        db_pass: randomBytes(24).toString("base64url"),
      }),
    });
  } else console.log(`Reusing ${name}.`);
  for (let i = 0; i < 90; i++) {
    const cur = await sb<{ status: string }>(`/projects/${p!.id}`);
    if (cur.status === "ACTIVE_HEALTHY") return p!.id;
    if (i % 6 === 0) console.log(`  waiting for ${name} (${cur.status})`);
    await sleep(10_000);
  }
  throw new Error(`${name} did not become healthy in 15 minutes.`);
}

async function migrate(ref: string) {
  await sql(
    ref,
    `create schema if not exists supabase_migrations;
     create table if not exists supabase_migrations.schema_migrations
       (version text primary key, statements text[], name text);`,
  );
  const done = new Set(
    (
      (await sql(ref, "select version from supabase_migrations.schema_migrations")) as Array<{
        version: string;
      }>
    ).map((r) => r.version),
  );
  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const [version, ...rest] = f.replace(/\.sql$/, "").split("_");
    if (done.has(version!)) continue;
    console.log(`  migration ${f}`);
    await sql(ref, readFileSync(`supabase/migrations/${f}`, "utf8"));
    await sql(
      ref,
      `insert into supabase_migrations.schema_migrations (version, name) values (${lit(version!)}, ${lit(rest.join("_"))})`,
    );
  }
  const seeded = (await sql(ref, "select count(*)::int as n from public.stickers")) as Array<{
    n: number;
  }>;
  if (!seeded[0]?.n) {
    console.log("  seed");
    await sql(ref, readFileSync("supabase/seed.sql", "utf8"));
  }
}

async function vault(ref: string, name: string, value: string) {
  await sql(
    ref,
    `do $$
     declare sid uuid;
     begin
       select id into sid from vault.secrets where name = ${lit(name)};
       if sid is null then perform vault.create_secret(${lit(value)}, ${lit(name)});
       else perform vault.update_secret(sid, ${lit(value)});
       end if;
     end $$;`,
  );
}

async function main() {
  const orgs = await sb<Array<{ id: string; name: string }>>("/organizations");
  const orgId = process.env.SUPABASE_ORG_ID ?? orgs[0]?.id;
  if (!orgId) throw new Error("No Supabase organisation found.");
  const project = await vc<{ id: string }>(`/v9/projects/${VERCEL_PROJECT}`);

  for (const env of ENVS) {
    if (process.env.ONLY && process.env.ONLY !== env.key) continue;
    console.log(`\n== ${env.name}`);
    const ref = await ensureProject(env.name, orgId);
    await migrate(ref);

    const cron = randomBytes(24).toString("hex");
    await vault(ref, "clink_app_url", env.site);
    await vault(ref, "clink_cron_secret", cron);

    await sb(`/projects/${ref}/config/auth`, {
      method: "PATCH",
      body: JSON.stringify({
        site_url: env.site,
        uri_allow_list: `${env.site}/**`,
        mailer_autoconfirm: false,
        mfa_totp_enroll_enabled: true,
        mfa_totp_verify_enabled: true,
        // Clink is passwordless; this only guards direct API sign-ups.
        password_min_length: 12,
        password_required_characters:
          "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
        passkey_enabled: true,
        webauthn_rp_id: new URL(env.site).hostname,
        webauthn_rp_origins: env.site,
        webauthn_rp_display_name: "Clink",
      }),
    });
    // Optional Google sign-in (one OAuth client serves both projects).
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      await sb(`/projects/${ref}/config/auth`, {
        method: "PATCH",
        body: JSON.stringify({
          external_google_enabled: true,
          external_google_client_id: process.env.GOOGLE_CLIENT_ID,
          external_google_secret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      });
      console.log("  Google sign-in on.");
    }
    // Optional custom SMTP (Gmail with an app password, see docs/LIMITS.md).
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sb(`/projects/${ref}/config/auth`, {
        method: "PATCH",
        body: JSON.stringify({
          smtp_host: process.env.SMTP_HOST ?? "smtp.gmail.com",
          smtp_port: process.env.SMTP_PORT ?? "465",
          smtp_user: process.env.SMTP_USER,
          smtp_pass: process.env.SMTP_PASS,
          smtp_admin_email: process.env.SMTP_USER,
          smtp_sender_name: "Clink",
          rate_limit_email_sent: 30,
        }),
      });
      console.log("  Custom SMTP set.");
    }
    // Branded, any-device email links. Supabase only allows custom templates
    // once custom SMTP is configured, so this is skipped until then.
    try {
      await sb(`/projects/${ref}/config/auth`, {
        method: "PATCH",
        body: JSON.stringify(EMAIL_TEMPLATES),
      });
      console.log("  Email templates set.");
    } catch {
      console.log("  Email templates skipped (set custom SMTP first, then re-run).");
    }

    const keys = await sb<Array<{ name: string; api_key: string }>>(
      `/projects/${ref}/api-keys?reveal=true`,
    );
    const anon = keys.find((k) => k.name === "anon")?.api_key;
    const service = keys.find((k) => k.name === "service_role")?.api_key;
    if (!anon || !service) throw new Error("Could not read the project's API keys.");

    const vars = [
      { key: "NEXT_PUBLIC_SUPABASE_URL", value: `https://${ref}.supabase.co`, type: "plain" },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: anon, type: "plain" },
      { key: "SUPABASE_SERVICE_ROLE_KEY", value: service, type: "encrypted" },
      { key: "CRON_SECRET", value: cron, type: "encrypted" },
    ].map((v) => ({ ...v, target: [env.target] }));
    await vc(`/v10/projects/${project.id}/env?upsert=true`, {
      method: "POST",
      body: JSON.stringify(vars),
    });
    console.log(`  Vercel ${env.target} variables set.`);
  }

  console.log(`
Done. Next:
  1. Redeploy: push any commit, or "Redeploy" the latest deployment in Vercel.
  2. In each Supabase project (Authentication): add Google as a provider, turn on
     passkeys, and set custom SMTP (docs/LIMITS.md, "Email deliverability").
  3. Sign up on the live site with an ADMIN_EMAILS address, then run
     pnpm seed:admin with that project's URL and service key in .env.local.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
