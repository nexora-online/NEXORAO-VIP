import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
type Product = { id:string; name:string; brand?:string; category?:string; price:number; currency?:string; imageUrl?:string; image?:string; available?:boolean };
function validProduct(value: unknown): value is Product {
 if (!value || typeof value !== "object") return false;
 const p = value as Record<string, unknown>;
 const img = typeof p.imageUrl === "string" ? p.imageUrl : typeof p.image === "string" ? p.image : "";
 let safe = false; try { safe = new URL(img).protocol === "https:"; } catch {}
 return typeof p.id === "string" && !!p.id && typeof p.name === "string" && !!p.name && typeof p.price === "number" && Number.isFinite(p.price) && p.price >= 0 && safe && (p.available === undefined || typeof p.available === "boolean");
}
export async function GET(request: Request) {
 const url = new URL(request.url); const raw = Number(url.searchParams.get("limit") || 1500); const limit = Number.isFinite(raw) ? Math.max(1, Math.min(1500, Math.floor(raw))) : 1500;
 const feed = process.env.SUPPLIER_CATALOG_URL;
 if (!feed) return NextResponse.json({ products:[], count:0, limit, configured:false, message:"Supplier catalog is not configured yet." }, { headers:{"Cache-Control":"no-store"} });
 let parsed: URL; try { parsed = new URL(feed); if(parsed.protocol !== "https:") throw new Error(); } catch { return NextResponse.json({products:[],count:0,configured:true,error:"Supplier feed must use HTTPS."},{status:500}); }
 try {
  const response = await fetch(parsed.toString(), { headers:process.env.SUPPLIER_CATALOG_TOKEN ? {Authorization:"Bearer "+process.env.SUPPLIER_CATALOG_TOKEN,Accept:"application/json"} : {Accept:"application/json"}, cache:"no-store", signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Supplier response error");
  const data: unknown = await response.json(); const rows = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as {products?:unknown}).products) ? (data as {products:unknown[]}).products : [];
  const products = rows.filter(validProduct).filter(p=>p.available!==false).slice(0,limit).map(p=>({id:p.id,name:p.name,brand:p.brand||"",category:p.category||"LIFESTYLE",price:p.price,currency:p.currency||"EUR",imageUrl:p.imageUrl||p.image||"",available:p.available!==false}));
  return NextResponse.json({products,count:products.length,limit,configured:true},{headers:{"Cache-Control":"no-store"}});
 } catch { return NextResponse.json({products:[],count:0,limit,configured:true,error:"Supplier feed could not be loaded. Check its URL, token and JSON format."},{status:502,headers:{"Cache-Control":"no-store"}}); }
}