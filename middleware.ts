import { NextRequest, NextResponse } from "next/server";

const WINDOW_SECONDS = 60;
const API_LIMIT = 120;
const AUTH_LIMIT = 10;
const CSP = [
  "default-src 'self'",
  // Next.js currently renders some inline styles/scripts; migrate to nonce-based CSP before removing unsafe-inline.
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://*.upstash.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

function allowedOrigins(): Set<string> {
  const values = ["https://nexoraonline.de", "https://www.nexoraonline.de"];
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try { values.push(new URL(configured).origin); } catch { /* invalid config never widens the allowlist */ }
  }
  return new Set(values);
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.delete("X-Powered-By");
  return response;
}

/** Distributed fixed-window limit. Configure Upstash REST credentials in the deployment environment.
 * Fail closed for API traffic when configured rate limiting becomes unavailable.
 */
async function rateLimit(key: string, limit: number): Promise<{ allowed: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: limit };
  }
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('TTL',KEYS[1]); return {n,ttl}";
  try {
    const response = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, "1", key, String(WINDOW_SECONDS)]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error("Rate limiter unavailable");
    const body = await response.json() as { result?: [number, number]; error?: string };
    if (body.error || !Array.isArray(body.result)) throw new Error("Rate limiter response invalid");
    const count = Number(body.result[0]);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: false, remaining: 0 };
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const response = NextResponse.next();
  withSecurityHeaders(response);

  if (!isApi) return response;

  // Stripe calls are server-to-server and intentionally do not require browser Origin.
  const isStripeWebhook = path === "/api/stripe-webhook";
  const origin = request.headers.get("origin");
  const allowlist = allowedOrigins();
  if (origin && !isStripeWebhook && !allowlist.has(origin)) {
    return withSecurityHeaders(NextResponse.json({ error: "Origin not allowed" }, { status: 403 }));
  }
  if (origin && !isStripeWebhook && allowlist.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
    response.headers.set("Access-Control-Max-Age", "600");
  }
  if (request.method === "OPTIONS") return withSecurityHeaders(new NextResponse(null, { status: 204, headers: response.headers }));

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = (forwarded || realIp || "unknown").slice(0, 80);
  const authRoute = /(?:login|signin|sign-in|register|signup|password|reset)/i.test(path);
  const limit = authRoute ? AUTH_LIMIT : API_LIMIT;
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const result = await rateLimit(`nexora:rl:${authRoute ? "auth" : "api"}:${ip}:${bucket}`, limit);
  if (!result.allowed) {
    return withSecurityHeaders(NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: process.env.NODE_ENV === "production" && !process.env.UPSTASH_REDIS_REST_URL ? 503 : 429,
        headers: { "Retry-After": String(WINDOW_SECONDS), "Cache-Control": "no-store" } },
    ));
  }
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"] };
