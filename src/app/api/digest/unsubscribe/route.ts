import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unsign } from "@/lib/server/crypto";
import { siteUrl } from "@/lib/site";

/**
 * Unsubscribe from the weekly health email, from the email itself (the
 * List-Unsubscribe header: Gmail's button posts here, a click opens it). It
 * turns off the same switch as the dashboard, so there's one place to control it.
 * The link is signed for one admin; nothing else can be changed through it.
 */
async function off(req: NextRequest) {
  const id = unsign(req.nextUrl.searchParams.get("t") ?? undefined, "digest-unsubscribe");
  if (!id) return null;
  const { error } = await supabaseAdmin()
    .from("admin_accounts")
    .update({ weekly_email: false })
    .eq("id", id);
  return error ? null : id;
}

export async function POST(req: NextRequest) {
  const id = await off(req);
  return new Response(null, { status: id ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const id = await off(req);
  const body = id
    ? `<h1>You won't get the weekly email any more.</h1><p>Turn it back on any time on the <a href="${siteUrl()}/admin">admin dashboard</a>, next to This week's health.</p>`
    : `<h1>That link doesn't work.</h1><p>Turn the weekly email off on the <a href="${siteUrl()}/admin">admin dashboard</a> instead.</p>`;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Weekly email</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#120c10;color:#f5f5f7;font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;padding:24px}main{max-width:420px}h1{font-size:24px;line-height:1.2;margin:0 0 12px}p{color:#b6b0b8;margin:0}a{color:#ff4f7b}</style></head><body><main>${body}</main></body></html>`,
    { status: id ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
