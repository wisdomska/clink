import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily so builds succeed before every
 * secret exists. Call serverEnv() inside handlers, never at module scope.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(24).optional(),
  STORAGE_DRIVER: z.enum(["supabase", "r2"]).default("supabase"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_MEDIA: z.string().default("clink-media"),
  R2_BUCKET_SENSITIVE: z.string().default("clink-sensitive"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("https://clinkapp.vercel.app"),
  ADMIN_EMAILS: z.string().default(""),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid server environment: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
