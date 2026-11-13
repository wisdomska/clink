import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Bucket, StorageAdapter } from "./types";

export function supabaseAdapter(): StorageAdapter {
  const s = () => supabaseAdmin().storage;
  return {
    driver: "supabase",
    async presignUpload(bucket, path, mime) {
      const { data, error } = await s().from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw error ?? new Error("upload url failed");
      return { url: data.signedUrl, method: "PUT", headers: { "Content-Type": mime, "x-upsert": "false" } };
    },
    async presignRead(bucket, path, ttl) {
      const { data, error } = await s().from(bucket).createSignedUrl(path, ttl);
      if (error || !data) throw error ?? new Error("read url failed");
      return data.signedUrl;
    },
    async read(bucket, path) {
      const { data, error } = await s().from(bucket).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async write(bucket, path, body, mime) {
      const { error } = await s().from(bucket).upload(path, body, { contentType: mime, upsert: true });
      if (error) throw error;
    },
    async size(bucket, path) {
      const { data, error } = await s().from(bucket).info(path);
      if (error || !data) return null;
      return Number(data.size ?? 0);
    },
    async remove(bucket, paths) {
      if (!paths.length) return;
      const { error } = await s().from(bucket).remove(paths);
      if (error) throw error;
    },
    async exists(bucket: Bucket, path: string) {
      const { data } = await s().from(bucket).exists(path);
      return Boolean(data);
    },
  };
}
