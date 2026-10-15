import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
 const secret = process.env.CRON_SECRET;
 if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET must be configured to run scheduled supplier checks." }, { status: 503 });
 if (request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
 try {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const response = await fetch(new URL("/api/sync-products?country=DE&currency=EUR&language=DE", base), { cache: "no-store", signal: AbortSignal.timeout(55000) });
  const data: unknown = await response.json();
  const payload = data && typeof data === "object" ? data as { count?: unknown; configured?: unknown; partial?: unknown; error?: unknown; failedCategories?: unknown } : {};
  return NextResponse.json({
   ok: response.ok && typeof payload.count === "number" && payload.count > 0,
   supplier: "AliExpress",
   configured: payload.configured === true,
   productCount: typeof payload.count === "number" ? payload.count : 0,
   partial: payload.partial === true,
   failedCategories: Array.isArray(payload.failedCategories) ? payload.failedCategories : [],
   checkedAt: new Date().toISOString(),
   ...(typeof payload.error === "string" ? { error: payload.error } : {}),
   persistence: "This scheduled route validates and warms the supplier query cache; durable product storage requires a database.",
  }, { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
 } catch {
  return NextResponse.json({ ok: false, error: "AliExpress scheduled supplier check failed." }, { status: 502 });
 }
}
