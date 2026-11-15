import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/** A refusal that route handlers turn into a JSON error response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const deny = (status: number, code: string, message: string) =>
  new ApiError(status, code, message);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

/** Wraps a handler: converts ApiError and validation failures into clean JSON. */
export function handler<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.status, headers: { "Cache-Control": "no-store" } },
        );
      }
      console.error("[api]", req.nextUrl.pathname, err);
      return NextResponse.json(
        { error: "server_error", message: "Something broke on our side. Try again in a moment." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}

export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw deny(400, "bad_json", "That request was not valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw deny(
      422,
      "invalid",
      first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.",
    );
  }
  return parsed.data;
}

export interface Caller {
  user: User;
  db: Awaited<ReturnType<typeof supabaseServer>>;
}

/** Signed-in, not suspended, not deleted. */
export async function requireUser(): Promise<Caller> {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw deny(401, "unauthenticated", "Sign in first.");
  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("suspended_at, deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.suspended_at) throw deny(403, "suspended", "This account is suspended.");
  if (profile?.deleted_at) throw deny(403, "deleted", "This account is being deleted.");
  return { user, db };
}

export interface CoupleCaller extends Caller {
  coupleId: string;
  role: "a" | "b";
  partnerId: string;
}

/** Signed in AND in an active couple. Returns the partner too. */
export async function requireCouple(): Promise<CoupleCaller> {
  const caller = await requireUser();
  const couple = await activeCouple(caller.user.id);
  if (!couple) throw deny(409, "not_linked", "Link with your partner first.");
  return { ...caller, ...couple };
}

export async function activeCouple(userId: string) {
  const admin = supabaseAdmin();
  const { data: me } = await admin
    .from("couple_members")
    .select("couple_id, role, couples!inner(unlinked_at)")
    .eq("user_id", userId)
    .is("left_at", null)
    .is("couples.unlinked_at", null)
    .maybeSingle();
  if (!me) return null;
  const { data: partner } = await admin
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", me.couple_id)
    .neq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();
  if (!partner) return null;
  return { coupleId: me.couple_id, role: me.role as "a" | "b", partnerId: partner.user_id };
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

/** Per-key fixed window limit, stored in Postgres (no paid Redis needed). */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin().rpc("svc_hit_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw error;
  if (!data) throw deny(429, "rate_limited", "Slow down a little and try again soon.");
}

export async function audit(
  event: string,
  userId: string | null,
  meta: Record<string, Json> = {},
  actorId?: string | null,
) {
  await supabaseAdmin()
    .from("audit_events")
    .insert({ event, user_id: userId, actor_id: actorId === undefined ? userId : actorId, meta });
}
