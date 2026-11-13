import "server-only";
import { serverEnv } from "@/lib/env";
import type { StorageAdapter } from "./types";

export type { StorageAdapter, Bucket } from "./types";

let adapter: StorageAdapter | null = null;

/** One env var (STORAGE_DRIVER) switches between Cloudflare R2 and Supabase Storage. */
export async function storage(): Promise<StorageAdapter> {
  if (adapter) return adapter;
  const env = serverEnv();
  if (env.STORAGE_DRIVER === "r2") {
    const { r2Adapter } = await import("./r2");
    adapter = r2Adapter(env);
  } else {
    const { supabaseAdapter } = await import("./supabase");
    adapter = supabaseAdapter();
  }
  return adapter;
}

/** Hard caps (free-tier friendly). Supabase Storage gets stricter caps than R2. */
export function limits(driver: "r2" | "supabase") {
  return driver === "r2"
    ? { image: 15 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 8 * 1024 * 1024 }
    : { image: 8 * 1024 * 1024, video: 25 * 1024 * 1024, audio: 5 * 1024 * 1024 };
}
