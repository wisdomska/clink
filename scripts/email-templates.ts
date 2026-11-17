/**
 * Auth email templates for Supabase, in Clink's look. The HTML lives in
 * supabase/templates (also used by the local stack via config.toml). Links
 * use the token hash, which /auth/callback verifies on the server, so a link
 * works on any device, not only in the browser that asked for it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "supabase/templates");
const subjects = JSON.parse(readFileSync(path.join(dir, "subjects.json"), "utf8")) as Record<
  string,
  string
>;

export const EMAIL_TEMPLATES: Record<string, string> = Object.fromEntries(
  Object.entries(subjects).flatMap(([k, subject]) => [
    [`mailer_subjects_${k}`, subject],
    [`mailer_templates_${k}_content`, readFileSync(path.join(dir, `${k}.html`), "utf8")],
  ]),
);
