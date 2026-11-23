/**
 * After `pnpm build`: fails if anything secret reached the code browsers
 * download (.next/static). Two checks:
 * - any Supabase key in it whose role is service_role (whatever its value);
 * - the value of any server-only secret set in this environment.
 * Prints the file and the kind of secret, never the secret itself.
 * Run: node scripts/check-bundle.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = ".next/static";
const SECRET_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_SECRET",
  "CRON_SECRET",
  "R2_SECRET_ACCESS_KEY",
  "VAPID_PRIVATE_KEY",
  "BREVO_SMTP_KEY",
];

async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(js|mjs|css|json|html|txt|map)$/.test(e.name)) yield p;
  }
}

const jwt = /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const secrets = SECRET_ENV.map((k) => [k, process.env[k]]).filter(([, v]) => v && v.length >= 12);
const problems = [];
let scanned = 0;
for await (const f of files(ROOT)) {
  scanned++;
  const text = await readFile(f, "utf8");
  for (const m of text.matchAll(jwt)) {
    try {
      const payload = JSON.parse(Buffer.from(m[0].split(".")[1], "base64url").toString());
      if (payload.role === "service_role") problems.push(`${f}: a service_role key`);
    } catch {
      /* not a token */
    }
  }
  for (const [k, v] of secrets) if (text.includes(v)) problems.push(`${f}: the value of ${k}`);
}
if (!scanned) {
  console.error(`check-bundle: nothing under ${ROOT}. Run pnpm build first.`);
  process.exit(1);
}
if (problems.length) {
  console.error("check-bundle: secrets in the browser bundle:\n" + problems.join("\n"));
  process.exit(1);
}
console.log(
  `check-bundle: ${scanned} files, no secrets (${secrets.length} secret values checked).`,
);
