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

/**
 * Who is calling. The session token is verified locally against the project's
 * signing keys (cached for the process), so this costs no network round trip.
 * Pass full: true when you need fields only the auth server has (identities,
 * factors, email_confirmed_at, last_sign_in_at).
 */
async function authed(full = false): Promise<Caller> {
  const db = await supabaseServer();
  if (full) {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw deny(401, "unauthenticated", "Sign in first.");
    return { user, db };
  }
  const { data } = await db.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) throw deny(401, "unauthenticated", "Sign in first.");
  const user = {
    id: c.sub,
    email: c.email,
    phone: c.phone,
    role: c.role,
    aud: c.aud,
    app_metadata: c.app_metadata ?? {},
    user_metadata: c.user_metadata ?? {},
  } as unknown as User;
  return { user, db };
}

/** The signed-in user's id and email, verified locally (no round trip), or null. */
export async function sessionUser(): Promise<{ id: string; email: string | null } | null> {
  const { data } = await (await supabaseServer()).auth.getClaims();
  const c = data?.claims;
  return c?.sub ? { id: c.sub, email: (c.email as string | undefined) ?? null } : null;
}

interface CallerRow {
  suspended: boolean;
  deleted: boolean;
  couple_id: string | null;
  role: "a" | "b" | null;
  partner_id: string | null;
  rank: number | null;
}

/** Account status, couple, partner and (optionally) tier in one round trip. */
async function callerRow(userId: string, withRank = false): Promise<CallerRow> {
  const { data, error } = await supabaseAdmin().rpc("svc_caller", {
    p_user: userId,
    p_with_rank: withRank,
  });
  if (error) throw error;
  const row = data as unknown as CallerRow;
  if (row.suspended) throw deny(403, "suspended", "This account is suspended.");
  if (row.deleted) throw deny(403, "deleted", "This account is being deleted.");
  return row;
}

/** Signed-in, not suspended, not deleted. */
export async function requireUser(opts: { full?: boolean } = {}): Promise<Caller> {
  const caller = await authed(opts.full);
  await callerRow(caller.user.id);
  return caller;
}

export interface CoupleCaller extends Caller {
  coupleId: string;
  role: "a" | "b";
  partnerId: string;
}

/** Signed in AND in an active couple. Returns the partner too (and the tier when asked). */
export async function requireCouple(
  opts: { withRank?: boolean } = {},
): Promise<CoupleCaller & { rank: number }> {
  const caller = await authed();
  const row = await callerRow(caller.user.id, opts.withRank);
  if (!row.couple_id || !row.partner_id)
    throw deny(409, "not_linked", "Link with your partner first.");
  return {
    ...caller,
    coupleId: row.couple_id,
    role: (row.role ?? "a") as "a" | "b",
    partnerId: row.partner_id,
    rank: Number(row.rank ?? 0),
  };
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
