import { NextResponse } from "next/server";
import { safeTokenMatch } from "@/lib/security/constant-time";
import { fetchSupplierFeed } from "@/lib/suppliers/feed-client";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!safeTokenMatch(process.env.CRON_SECRET,request.headers.get("authorization")?.replace(/^Bearer\s+/i,"") ?? null))return NextResponse.json({error:"Unauthorized"},{status:401});try{const data=await fetchSupplierFeed();return NextResponse.json({ok:true,count:data.products.length,source:data.source,fetchedAt:data.fetchedAt,warnings:data.warnings},{headers:{"Cache-Control":"no-store"}});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Catalog refresh failed"},{status:502});}}