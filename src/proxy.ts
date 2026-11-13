import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const APP_PREFIXES = ["/us", "/chat", "/play", "/plans", "/keep", "/settings", "/dark", "/admin"];
const NEEDS_SESSION = [...APP_PREFIXES, "/onboarding", "/link", "/install"];
const AUTH_PAGES = ["/login", "/signup"];

function startsWithAny(path: string, list: string[]) {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

function buildCsp(nonce: string, path: string) {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^http/, "ws");
  const storage = "https://*.r2.cloudflarestorage.com";
  const isPrivate = path.startsWith("/dark") || path.startsWith("/admin");
  // After Dark and admin load no third-party scripts, frames or analytics.
  const analytics = isPrivate ? "" : " https://eu.i.posthog.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io";
  const frames = isPrivate ? "'none'" : "https://www.youtube-nocookie.com https://www.youtube.com";
  const ytScripts = isPrivate ? "" : " https://www.youtube.com https://s.ytimg.com";
  const ytImg = isPrivate ? "" : " https://i.ytimg.com";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${ytScripts}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase} ${storage}${ytImg}`,
    `media-src 'self' blob: ${supabase} ${storage}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${supabaseWs} ${storage}${analytics}`,
    `frame-src ${frames}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, path);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", path + request.nextUrl.search);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Refreshes the session cookie when needed. Do not run code between client creation and this call.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (!signedIn && startsWithAny(path, NEEDS_SESSION)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return withCsp(NextResponse.redirect(to), csp, response);
  }
  if (signedIn && startsWithAny(path, AUTH_PAGES)) {
    const to = request.nextUrl.clone();
    to.pathname = "/us";
    to.search = "";
    return withCsp(NextResponse.redirect(to), csp, response);
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function withCsp(res: NextResponse, csp: string, from: NextResponse) {
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons/|sw.js|swe-worker|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
