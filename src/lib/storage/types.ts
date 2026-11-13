export type Bucket = "media" | "sensitive" | "exports";

export interface PresignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageAdapter {
  readonly driver: "r2" | "supabase";
  presignUpload(bucket: Bucket, path: string, mime: string, size: number): Promise<PresignedUpload>;
  /** Short-lived read URL. Never used for sensitive media (those are streamed through the API). */
  presignRead(bucket: Bucket, path: string, ttlSeconds: number): Promise<string>;
  read(bucket: Bucket, path: string): Promise<Buffer | null>;
  write(bucket: Bucket, path: string, body: Buffer, mime: string): Promise<void>;
  size(bucket: Bucket, path: string): Promise<number | null>;
  remove(bucket: Bucket, paths: string[]): Promise<void>;
  /** Used by wipe jobs to verify deletion. */
  exists(bucket: Bucket, path: string): Promise<boolean>;
}
