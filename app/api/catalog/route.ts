import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const inventoryNote = "Stock is unknown until a stock-capable supplier API verifies it.";
type Product = { id:string; name:string; brand?:string; category?:string; price:number; currency?:string; imageUrl?:string; image?:string; available?:boolean };
function validProduct(value: unknown): value is Product {
 if (!value || typeof value !== "object") return false;
 const p = value as Record<string, unknown>;
 const img = typeof p.imageUrl === "string" ? p.imageUrl : typeof p.image === "string" ? p.image : "";
 let safe = false; try { safe = new URL(img).protocol === "https:"; } catch {}
 return typeof p.id === "string" && !!p.id && typeof p.name === "string" && !!p.name && typeof p.price === "number" && Number.isFinite(p.price) && p.price >= 0 && safe && (p.available === undefined || typeof p.available === "boolean");
}
type CJProduct = { id?: unknown; productId?: unknown; nameEn?: unknown; sku?: unknown; spu?: unknown; bigImage?: unknown; sellPrice?: unknown; nowPrice?: unknown; saleStatus?: unknown; threeCategoryName?: unknown; categoryName?: unknown; brand?: unknown };
let cachedCJToken: { value: string; expiresAt: number } | null = null;
async function getCJAccessToken(apiKey: string): Promise<string> {
 if (cachedCJToken && cachedCJToken.expiresAt > Date.now() + 60_000) return cachedCJToken.value;
 const response = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
  method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ apiKey }), cache: "no-store", signal: AbortSignal.timeout(12000)
 });
 if (!response.ok) throw new Error("CJ authentication failed");
 const payload: unknown = await response.json();
 if (!payload || typeof payload !== "object") throw new Error("CJ authentication response invalid");
 const root = payload as { code?: unknown; success?: unknown; result?: unknown; data?: { accessToken?: unknown; accessTokenExpiryDate?: unknown } };
 const token = root.data?.accessToken;
 if (root.success === false || root.result === false || (typeof root.code === "number" && root.code !== 200) || typeof token !== "string" || !token) throw new Error("CJ authentication failed");
 const expiry = typeof root.data?.accessTokenExpiryDate === "string" ? Date.parse(root.data.accessTokenExpiryDate) : NaN;
 cachedCJToken = { value: token, expiresAt: Number.isFinite(expiry) ? expiry : Date.now() + 60 * 60 * 1000 };
 return token;
}
async function loadCJProducts(limit: number): Promise<Product[]> {
 const apiKey = process.env.CJ_API_KEY;
 if (!apiKey) throw new Error("CJ_API_KEY is missing");
 const token = await getCJAccessToken(apiKey);
 const rows: CJProduct[] = [];
 const pageSize = 100;
 const maxPages = Math.ceil(limit / pageSize);
 for (let page = 1; page <= maxPages && rows.length < limit; page++) {
  const endpoint = new URL("https://developers.cjdropshipping.com/api2.0/v1/product/listV2");
  endpoint.searchParams.set("page", String(page));
  endpoint.searchParams.set("size", String(pageSize));
  endpoint.searchParams.set("features", "enable_category");
  const response = await fetch(endpoint.toString(), { headers: { "CJ-Access-Token": token, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("CJ product request failed");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("CJ product response invalid");
  const root = payload as { code?: unknown; success?: unknown; result?: unknown; data?: { content?: unknown } };
  if (root.success === false || root.result === false || (typeof root.code === "number" && root.code !== 200)) throw new Error("CJ product request failed");
  const groups = Array.isArray(root.data?.content) ? root.data.content : [];
  const pageRows: CJProduct[] = [];
  for (const group of groups) {
   if (!group || typeof group !== "object") continue;
   const productList = (group as { productList?: unknown }).productList;
   if (Array.isArray(productList)) pageRows.push(...productList as CJProduct[]);
  }
  rows.push(...pageRows);
  if (pageRows.length < pageSize) break;
 }
 return rows.map((p): Product | null => {
  const id = typeof p.id === "string" ? p.id : typeof p.productId === "string" ? p.productId : typeof p.sku === "string" ? p.sku : typeof p.spu === "string" ? p.spu : "";
  const name = typeof p.nameEn === "string" ? p.nameEn.trim() : "";
  const imageUrl = typeof p.bigImage === "string" ? p.bigImage : "";
  const price = Number(p.nowPrice ?? p.sellPrice);
  let secureImage = false; try { secureImage = new URL(imageUrl).protocol === "https:"; } catch {}
  if (!id || !name || !Number.isFinite(price) || price < 0 || !secureImage || (p.saleStatus !== "3" && p.saleStatus !== 3)) return null;
  return { id, name, brand: typeof p.brand === "string" ? p.brand : "CJdropshipping", category: typeof p.threeCategoryName === "string" ? p.threeCategoryName : typeof p.categoryName === "string" ? p.categoryName : "LIFESTYLE", price, currency: "USD", imageUrl, available: true };
 }).filter((p): p is Product => p !== null).slice(0, limit);
}
export async function GET(request: Request) {
 const url = new URL(request.url); const raw = Number(url.searchParams.get("limit") || 1500); const limit = Number.isFinite(raw) ? Math.max(1, Math.min(1500, Math.floor(raw))) : 1500;
 const cjConfigured = Boolean(process.env.CJ_API_KEY);
 const feed = process.env.SUPPLIER_CATALOG_URL;
 if (cjConfigured) {
  try {
   const products = await loadCJProducts(limit);
   return NextResponse.json({ inventoryNote, products, count: products.length, limit, configured: true, supplier: "CJdropshipping", pageSize: Math.min(100, limit) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
   return NextResponse.json({ inventoryNote, products: [], count: 0, limit, configured: true, supplier: "CJdropshipping", error: "CJ catalog could not be loaded. Check the server-side CJ_API_KEY and API access." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
 }
 if (!feed) return NextResponse.json({ inventoryNote, products:[], count:0, limit, configured:false, message:"Supplier catalog is not configured yet. Add CJ_API_KEY or configure SUPPLIER_CATALOG_URL." }, { headers:{"Cache-Control":"no-store"} });
 let parsed: URL; try { parsed = new URL(feed); if(parsed.protocol !== "https:") throw new Error(); } catch { return NextResponse.json({ inventoryNote,products:[],count:0,configured:true,error:"Supplier feed must use HTTPS."},{status:500}); }
 try {
  const response = await fetch(parsed.toString(), { headers:process.env.SUPPLIER_CATALOG_TOKEN ? {Authorization:"Bearer "+process.env.SUPPLIER_CATALOG_TOKEN,Accept:"application/json"} : {Accept:"application/json"}, cache:"no-store", signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Supplier response error");
  const data: unknown = await response.json(); const rows = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as {products?:unknown}).products) ? (data as {products:unknown[]}).products : [];
  const products = rows.filter(validProduct).filter(p=>p.available!==false).slice(0,limit).map(p=>({id:p.id,name:p.name,brand:p.brand||"",category:p.category||"LIFESTYLE",price:p.price,currency:p.currency||"EUR",imageUrl:p.imageUrl||p.image||"",available:p.available!==false}));
  return NextResponse.json({ inventoryNote,products,count:products.length,limit,configured:true},{headers:{"Cache-Control":"no-store"}});
 } catch { return NextResponse.json({ inventoryNote,products:[],count:0,limit,configured:true,error:"Supplier feed could not be loaded. Check its URL, token and JSON format."},{status:502,headers:{"Cache-Control":"no-store"}}); }
}