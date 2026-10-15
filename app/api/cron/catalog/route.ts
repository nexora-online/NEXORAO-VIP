import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 const secret = process.env.CRON_SECRET;
 if (secret && request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 try { const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin; const r = await fetch(new URL("/api/catalog?limit=1500",base),{cache:"no-store"}); const data = await r.json(); return NextResponse.json({ok:r.ok,catalogConfigured:Boolean(data.configured),importedCount:data.count||0,checkedAt:new Date().toISOString()},{status:r.ok?200:502}); }
 catch { return NextResponse.json({ok:false,error:"Catalog check failed"},{status:502}); }
}