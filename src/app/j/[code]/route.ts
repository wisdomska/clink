import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Short share link (works from a WhatsApp message): /j/K7Q2MX */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const target = `/link?code=${clean}`;
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  const dest = user ? target : `/signup?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
}
