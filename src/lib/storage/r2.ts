import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ServerEnv } from "@/lib/env";
import type { Bucket, StorageAdapter } from "./types";

/** Cloudflare R2 through its S3 API. Zero egress fees; buckets stay private. */
export function r2Adapter(env: ServerEnv): StorageAdapter {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "STORAGE_DRIVER=r2 needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY",
    );
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const name = (b: Bucket) =>
    b === "sensitive"
      ? env.R2_BUCKET_SENSITIVE
      : b === "exports"
        ? `${env.R2_BUCKET_MEDIA}-exports`
        : env.R2_BUCKET_MEDIA;

  return {
    driver: "r2",
    async presignUpload(bucket, path, mime, size) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: name(bucket),
          Key: path,
          ContentType: mime,
          ContentLength: size,
        }),
        { expiresIn: 300 },
      );
      return { url, method: "PUT", headers: { "Content-Type": mime } };
    },
    async presignRead(bucket, path, ttl) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: name(bucket), Key: path }), {
        expiresIn: ttl,
      });
    },
    async read(bucket, path) {
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: name(bucket), Key: path }));
        const bytes = await out.Body?.transformToByteArray();
        return bytes ? Buffer.from(bytes) : null;
      } catch {
        return null;
      }
    },
    async write(bucket, path, body, mime) {
      await client.send(
        new PutObjectCommand({ Bucket: name(bucket), Key: path, Body: body, ContentType: mime }),
      );
    },
    async size(bucket, path) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: name(bucket), Key: path }));
        return head.ContentLength ?? null;
      } catch {
        return null;
      }
    },
    async remove(bucket, paths) {
      for (let i = 0; i < paths.length; i += 1000) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: name(bucket),
            Delete: { Objects: paths.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
    async exists(bucket, path) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: name(bucket), Key: path }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
