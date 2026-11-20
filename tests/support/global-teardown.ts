import { cleanupTestUsers } from "./cleanup";

/** After a Playwright run: delete the test accounts it made (local databases only). */
export default async function globalTeardown() {
  if (process.env.KEEP_TEST_USERS) return;
  try {
    const r = await cleanupTestUsers();
    if (r.deleted) console.warn(`[cleanup] removed ${r.deleted} test accounts.`);
  } catch (e) {
    console.warn(`[cleanup] skipped: ${e instanceof Error ? e.message : e}`);
  }
}
