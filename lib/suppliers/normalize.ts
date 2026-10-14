import type { NormalizedSupplierProduct, SupplierProduct } from "./types";
export function normalizeSupplierProduct(item: SupplierProduct, supplier: string): NormalizedSupplierProduct | null {
 const id=String(item.id ?? "").trim(); const name=String(item.name ?? item.title ?? "").trim(); const price=Number(item.price); const image=String(item.imageUrl ?? item.image ?? "").trim();
 if(!id || !name || !Number.isFinite(price) || price<0 || !/^https?:\/\//i.test(image)) return null;
 const stock=Number(item.stock);
 return { id: supplier+":"+id, supplier, supplierProductId:id, sku:item.sku ? String(item.sku) : null, name, brand:String(item.brand ?? supplier).trim(), category:String(item.category ?? "LIFESTYLE").trim().toUpperCase(), price:Math.round(price*100)/100, currency:String(item.currency ?? "EUR").toUpperCase(), image, available:item.available !== false && (!Number.isFinite(stock) || stock>0), stock:Number.isFinite(stock) ? Math.max(0,Math.floor(stock)) : null };
}