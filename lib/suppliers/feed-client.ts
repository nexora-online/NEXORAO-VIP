import { normalizeSupplierProduct } from "./normalize";
import type { SupplierProduct } from "./types";
export async function fetchSupplierFeed() {
 const feedUrl=process.env.SUPPLIER_CATALOG_URL; const token=process.env.SUPPLIER_CATALOG_TOKEN;
 if(!feedUrl) throw new Error("SUPPLIER_CATALOG_URL is not configured");
 const parsed=new URL(feedUrl); if(parsed.protocol!=="https:" && process.env.NODE_ENV==="production") throw new Error("Supplier feed must use HTTPS in production");
 const response=await fetch(parsed.toString(),{headers:token?{Authorization:"Bearer "+token}: {},cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok) throw new Error("Supplier feed returned HTTP "+response.status);
 const payload:unknown=await response.json();
 const rows:SupplierProduct[]=Array.isArray(payload)?payload as SupplierProduct[]:payload && typeof payload==="object" && Array.isArray((payload as {products?:unknown}).products)?(payload as {products:SupplierProduct[]}).products:[];
 const supplier=parsed.hostname; const warnings:string[]=[];
 const products=rows.slice(0,1000).map(p=>normalizeSupplierProduct(p,supplier)).filter((p):p is NonNullable<typeof p>=>p!==null);
 if(products.length<rows.length) warnings.push("Some supplier records were omitted because required fields were missing or invalid.");
 return {products,source:supplier,fetchedAt:new Date().toISOString(),warnings};
}