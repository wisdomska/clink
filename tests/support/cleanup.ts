import { readdirSync, readFileSync, rmSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

/**
 * Test accounts are deleted when a test run ends, so the local test database
 * doesn't grow run after run. Only ever against a local database: anything
 * else (preview, production) is refused outright.
 */
const DIR = join(process.cwd(), "test-results", ".test-users");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const dbUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function isLocal(u: string) {
  try {
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(u).hostname);
  } catch {
    return false;
  }
}

/** Called by makeUser: remember who this run created (one file per worker). */
export function rememberTestUser(id: string) {
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(join(DIR, `${process.pid}.txt`), `${id}\n`);
  } catch {
    /* cleanup is best effort; never fail a test over it */
  }
}

function takeRemembered(): string[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR);
  } catch {
    return [];
  }
  const ids = new Set<string>();
  for (const f of files) {
    for (const line of readFileSync(join(DIR, f), "utf8").split("\n")) if (line) ids.add(line);
    rmSync(join(DIR, f), { force: true });
  }
  return [...ids];
}

export async function cleanupTestUsers(opts: { staleHours?: number } = {}) {
  if (!isLocal(supabaseUrl) || !isLocal(dbUrl)) {
    console.warn("[cleanup] not a local database: test accounts left alone.");
    return { deleted: 0 };
  }
  const remembered = takeRemembered();
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    // This run's accounts, plus leftovers from runs that were cut short. Only
    // test addresses (@clink.test), never anything else.
    const { rows } = await db.query<{ id: string }>(
      `select id from auth.users
        where email like '%@clink.test'
          and (id = any($1::uuid[]) or created_at < now() - make_interval(hours => $2))`,
      [remembered, opts.staleHours ?? 6],
    );
    const ids = rows.map((r) => r.id);
    if (!ids.length) return { deleted: 0 };
    // Their stored files first (the rows that point at them go with the account).
    const files = await db.query<{ bucket: string; storage_path: string }>(
      `select bucket, storage_path from public.media where owner_id = any($1::uuid[])`,
      [ids],
    );
    const storage = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    }).storage;
    const byBucket = new Map<string, string[]>();
    for (const f of files.rows)
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.storage_path]);
    for (const [bucket, paths] of byBucket)
      for (let i = 0; i < paths.length; i += 500)
        await storage
          .from(bucket)
          .remove(paths.slice(i, i + 500))
          .catch(() => undefined);
    for (let i = 0; i < ids.length; i += 1000)
      await db.query(`delete from auth.users where id = any($1::uuid[])`, [ids.slice(i, i + 1000)]);
    // Couples left with nobody in them (both test accounts gone) go too.
    await db.query(
      `delete from public.couples c
        where not exists (select 1 from public.couple_members m where m.couple_id = c.id)
          and c.created_at < now() - interval '10 minutes'`,
    );
    return { deleted: ids.length, files: files.rows.length };
  } finally {
    await db.end();
  }
}
