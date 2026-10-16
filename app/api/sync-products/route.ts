import { put, list } from "@vercel/blob";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type StoreCategory = "DAMEN" | "HERREN" | "SCHMUCK & UHREN" | "BEAUTY" | "ACCESSOIRES" | "LIFESTYLE";
type StoreProduct = {
  id: string; sku?: string; name: string; brand: string; category: StoreCategory;
  price: number; displayPrice: string; originalPrice?: number; discountPercent?: number; currency: "EUR";
  imageUrl: string; productUrl: string; luxuryTag: "unverified" | "simulated";
  available: boolean | null; inventoryStatus: "available-unknown-quantity" | "unknown";
  supplier: "AliExpress" | "Simulation";
};
type SearchGroup = { category: StoreCategory; keywords: string };
type CatalogBody = {
  products: StoreProduct[]; count: number; limit: 1000; configured: boolean;
  source: "aliexpress" | "simulation"; supplier: string; persisted: boolean;
  categories: Record<string, number>; partial: boolean; failedCategories: string[];
  inventoryNote: string; notice?: string; errorDetails?: string[];
};

// Store scope: women's fashion, personal care and beauty. No men's/home filler products.
const SEARCH_GROUPS: SearchGroup[] = [
  { category: "BEAUTY", keywords: "Rexona women deodorant antiperspirant women's personal care" },
  { category: "BEAUTY", keywords: "women skincare face care moisturizer serum cleanser" },
  { category: "BEAUTY", keywords: "women cosmetics makeup mascara lipstick" },
  { category: "BEAUTY", keywords: "women perfume fragrance body mist" },
  { category: "DAMEN", keywords: "women lingerie underwear nightwear" },
  { category: "DAMEN", keywords: "women fashion dresses elegant clothing" },
  { category: "ACCESSOIRES", keywords: "women handbags purses fashion accessories" },
  { category: "SCHMUCK & UHREN", keywords: "women jewelry earrings necklaces bracelets" },
];
const BLOB_PATH = "catalog/nexora-vip-products.json";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const INVENTORY_NOTE = "Stock is unknown until a stock-capable supplier API verifies it.";
let cachedCatalog: { key: string; expiresAt: number; body: CatalogBody } | null = null;

const text = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const safeHttps = (value: unknown): string => {
  try { const url = new URL(text(value)); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
};
const amount = (value: unknown): number | null => {
  const raw = text(value).replace(/[^0-9.,-]/g, "");
  const normalized = raw.includes(",") && raw.includes(".")
    ? (raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, ""))
    : raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
function classifyProduct(value: Record<string, unknown>, fallback: StoreCategory): StoreProduct | null {
  const id = text(value.product_id ?? value.productId ?? value.id);
  const name = text(value.product_title ?? value.productTitle ?? value.title ?? value.name);
  const rawImages = value.product_small_image_urls ?? value.productSmallImageUrls ?? value.small_images ?? value.images;
  const imageList = Array.isArray(rawImages) ? rawImages : typeof rawImages === "string" ? rawImages.split(",") : [];
  const imageUrl = safeHttps(value.product_main_image_url ?? value.productMainImageUrl ?? value.imageUrl ?? value.image) || imageList.map(safeHttps).find(Boolean) || "";
  const price = amount(value.target_sale_price ?? value.targetSalePrice ?? value.app_sale_price ?? value.sale_price ?? value.price);
  const rawCurrency = text(value.target_sale_price_currency ?? value.targetSalePriceCurrency ?? value.target_currency ?? value.targetCurrency).toUpperCase();
  const productUrl = safeHttps(value.product_detail_url ?? value.productDetailUrl ?? value.promotion_link ?? value.product_url);
  if (!id || !name || !imageUrl || !productUrl || price === null || rawCurrency !== "EUR") return null;

  const searchable = [name, text(value.first_level_category_name ?? value.firstLevelCategoryName), text(value.second_level_category_name ?? value.secondLevelCategoryName)].join(" ").toLowerCase();
  let category: StoreCategory = fallback;
  if (/watch|jewel|ring|necklace|bracelet|earring|schmuck|uhr/.test(searchable)) category = "SCHMUCK & UHREN";
  else if (/beauty|makeup|cosmetic|skin.?care|serum|lipstick|mascara|perfume|fragrance|lingerie/.test(searchable)) category = "BEAUTY";
  else if (/handbag|bag|wallet|sunglass|belt|accessor/.test(searchable)) category = "ACCESSOIRES";
  else if (/home|kitchen|decor|lamp|lifestyle|furniture/.test(searchable)) category = "LIFESTYLE";
  else if (/\bmen\b|\bmale\b|\bherr(en)?\b|\bmens\b|\bman\b/.test(searchable)) category = "HERREN";
  else if (/\bwomen\b|\bfemale\b|\bwomens\b|\bdress\b|\bladies\b|\bdamen\b|lingerie/.test(searchable)) category = "DAMEN";
  const originalPrice = amount(value.target_original_price ?? value.targetOriginalPrice ?? value.original_price ?? value.originalPrice ?? value.retail_price);
  return {
    id, ...(text(value.sku ?? value.sku_id ?? value.skuId) ? { sku: text(value.sku ?? value.sku_id ?? value.skuId) } : {}),
    name, brand: text(value.shop_name ?? value.shopName ?? value.brand) || "AliExpress", category, price, displayPrice: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price),
    ...(originalPrice !== null && originalPrice > price ? { originalPrice, discountPercent: Math.round((1 - price / originalPrice) * 100) } : {}),
    currency: "EUR", imageUrl, productUrl, luxuryTag: "unverified" as const,
    available: null, inventoryStatus: "unknown", supplier: "AliExpress",
  };
}
function collectProductObjects(input: unknown, out: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 12 || input == null) return out;
  if (Array.isArray(input)) { for (const item of input) collectProductObjects(item, out, depth + 1); return out; }
  if (typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  if ((obj.product_id != null || obj.productId != null) && (obj.product_title != null || obj.productTitle != null || obj.title != null)) out.push(obj);
  for (const [key, value] of Object.entries(obj)) if (key === "product" || key === "products" || typeof value === "object") collectProductObjects(value, out, depth + 1);
  return out;
}
function signRequest(params: Record<string, string>, secret: string): string {
  // TOP MD5 signing: uppercase MD5(secret + sorted key/value pairs + secret).
  // Sign only the exact string-valued parameters sent with the request; exclude "sign".
  const payload = Object.keys(params)
    .filter((key) => key !== "sign")
    .sort()
    .map((key) => key + params[key])
    .join("");
  return createHash("md5")
    .update(secret + payload + secret, "utf8")
    .digest("hex")
    .toUpperCase();
}
function topTimestamp(): string {
  // TOP timestamps use China Standard Time (UTC+08:00), formatted as yyyy-MM-dd HH:mm:ss.
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function collectDsProducts(input: unknown): Record<string, unknown>[] {
  const found = collectProductObjects(input);
  if (found.length) return found;
  const out: Record<string, unknown>[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (depth > 12 || value == null) return;
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    if (typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if ((obj.product_id != null || obj.productId != null || obj.item_id != null) &&
        (obj.product_title != null || obj.productTitle != null || obj.title != null || obj.product_name != null)) out.push(obj);
    for (const nested of Object.values(obj)) if (nested && typeof nested === "object") visit(nested, depth + 1);
  };
  visit(input);
  return out;
}
async function searchGroup(group: SearchGroup, appKey: string, appSecret: string): Promise<StoreProduct[]> {
  const unique = new Map<string, StoreProduct>();
  for (let page = 1; page <= 2; page++) {
    const params: Record<string, string> = {
      app_key: appKey,
      method: "aliexpress.ds.recommend.feed.get",
      timestamp: topTimestamp(),
      sign_method: "md5",
      format: "json",
      v: "2.0",
      country: "DE",
      target_currency: "EUR",
      target_language: "DE",
      page_no: String(page),
      page_size: "50",
      sort: "priceAsc",
      feed_name: "DS bestseller",
    };
    params.sign = signRequest(params, appSecret);
    const response = await fetch("https://eco.taobao.com/router/rest", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const responseText = await response.text();
    let data: unknown;
    try { data = JSON.parse(responseText); } catch { data = null; }
    if (!response.ok) throw new Error("AliExpress DS HTTP " + response.status);
    if (!data || typeof data !== "object") throw new Error("AliExpress DS returned non-JSON response");
    const root = data as Record<string, unknown>;
    const error = (root.error_response && typeof root.error_response === "object" ? root.error_response : null) as Record<string, unknown> | null;
    if (error) {
      const code = text(error.code ?? error.sub_code);
      const message = text(error.msg ?? error.message ?? error.sub_msg);
      throw new Error("AliExpress DS API error" + (code ? " [" + code.slice(0, 80) + "]" : "") + (message ? ": " + message.slice(0, 220) : ""));
    }
    const candidates = collectDsProducts(data);
    for (const candidate of candidates) {
      const normalized: Record<string, unknown> = {
        ...candidate,
        product_id: candidate.product_id ?? candidate.productId ?? candidate.item_id,
        product_title: candidate.product_title ?? candidate.productTitle ?? candidate.product_name ?? candidate.title,
        product_main_image_url: candidate.product_main_image_url ?? candidate.productMainImageUrl ?? candidate.product_main_image ?? candidate.image_url,
        product_detail_url: candidate.product_detail_url ?? candidate.productDetailUrl ?? candidate.product_url ?? candidate.item_url,
        target_sale_price: candidate.target_sale_price ?? candidate.targetSalePrice ?? candidate.sale_price ?? candidate.price,
        target_sale_price_currency: candidate.target_sale_price_currency ?? candidate.targetSalePriceCurrency ?? candidate.target_currency ?? candidate.currency ?? "EUR",
        target_original_price: candidate.target_original_price ?? candidate.original_price,
      };
      const product = classifyProduct(normalized, group.category);
      if (product && !unique.has(product.id)) unique.set(product.id, product);
    }
    if (candidates.length < 50) break;
  }
  return [...unique.values()];
}
function simulationCatalog(): StoreProduct[] {
  const items: Array<[string, string, StoreCategory, number, string]> = [
    ["demo-women-coat", "Demo — Elegant women's coat", "DAMEN", 89, "photo-1548126032-079a0fb0099d"],
    ["demo-men-jacket", "Demo — Classic men's jacket", "HERREN", 119, "photo-1529139574466-a303027c1d8b"],
    ["demo-evening-bag", "Demo — Evening handbag", "ACCESSOIRES", 49, "photo-1584917865442-de89df76afd3"],
    ["demo-watch", "Demo — Minimalist wristwatch", "SCHMUCK & UHREN", 79, "photo-1524592094714-0f0654e20314"],
    ["demo-skincare", "Demo — Skincare gift set", "BEAUTY", 35, "photo-1608248543803-ba4f8c70ae0b"],
    ["demo-perfume", "Demo — Perfume bottle", "BEAUTY", 59, "photo-1541643600914-78b084683601"],
    ["demo-lingerie", "Demo — Lingerie collection", "DAMEN", 39, "photo-1566479179817-c0c0f9f5a4a5"],
    ["demo-sunglasses", "Demo — Fashion sunglasses", "ACCESSOIRES", 29, "photo-1511499767150-a48a237f0083"],
    ["demo-home-decor", "Demo — Decorative home object", "LIFESTYLE", 25, "photo-1616486338812-3dadae4b4ace"],
    ["demo-men-shirt", "Demo — Men's tailored shirt", "HERREN", 45, "photo-1603252109303-2751441dd157"],
  ];
  return items.map(([id, name, category, price, photo]) => ({
    id, name, category, price, displayPrice: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price), currency: "EUR" as const, brand: "Demo catalog",
    imageUrl: "https://images.unsplash.com/" + photo + "?auto=format&fit=crop&w=900&q=80",
    productUrl: "", luxuryTag: "simulated" as const, available: null, inventoryStatus: "unknown" as const, supplier: "Simulation" as const,
  }));
}
async function readPersistedCatalog(): Promise<CatalogBody | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const blob = blobs.find(item => item.pathname === BLOB_PATH);
    if (!blob) return null;
    const response = await fetch(blob.url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !Array.isArray((data as CatalogBody).products)) return null;
    const stored = data as CatalogBody & { savedAt?: string };
    if (stored.savedAt && Date.now() - Date.parse(stored.savedAt) > MAX_AGE_MS) return null;
    return stored;
  } catch { return null; }
}
async function persistCatalog(body: CatalogBody): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    await put(BLOB_PATH, JSON.stringify({ ...body, savedAt: new Date().toISOString() }), {
      access: "public", addRandomSuffix: false, contentType: "application/json",
    });
    return true;
  } catch { return false; }
}
function responseBody(body: CatalogBody, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) { return GET(request); }
export async function GET(request: Request) {
  const appKey = process.env.ALIEXPRESS_APP_KEY?.trim();
  const appSecret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  const url = new URL(request.url);
  if ((url.searchParams.get("country") || "DE").toUpperCase() !== "DE" || (url.searchParams.get("currency") || "EUR").toUpperCase() !== "EUR" || (url.searchParams.get("language") || "DE").toUpperCase() !== "DE") {
    return responseBody({ products: [], count: 0, limit: 1000, configured: Boolean(appKey && appSecret), source: "simulation", supplier: "Simulation", persisted: false, categories: {}, partial: false, failedCategories: [], inventoryNote: INVENTORY_NOTE + " Supplier affiliate search is discovery-only and does not confirm live SKU quantities." } as CatalogBody, 400);
  }
  const cacheKey = [appKey || "simulation", "DE", "EUR", "DE"].join(":");
  if (cachedCatalog?.key === cacheKey && cachedCatalog.expiresAt > Date.now()) return responseBody(cachedCatalog.body);
  if (!appKey || !appSecret) {
    const persisted = await readPersistedCatalog();
    if (persisted) {
      const body = { ...persisted, persisted: true, notice: "Showing the last saved catalog. Inventory is not verified; checkout must remain disabled." };
      cachedCatalog = { key: cacheKey, expiresAt: Date.now() + 10 * 60 * 1000, body };
      return responseBody(body);
    }
    const body: CatalogBody = {
      products: simulationCatalog(), count: 10, limit: 1000, configured: false, source: "simulation", supplier: "Simulation", persisted: false,
      categories: Object.fromEntries(SEARCH_GROUPS.map(group => [group.category, simulationCatalog().filter(p => p.category === group.category).length])),
      partial: false, failedCategories: [], inventoryNote: INVENTORY_NOTE + " Simulated examples only: no supplier, SKU, price, or stock has been verified.",
      notice: "SIMULATION ONLY — these are illustrative demo entries, not real products. Payments and fulfillment must remain disabled.",
    };
    cachedCatalog = { key: cacheKey, expiresAt: Date.now() + 60 * 1000, body };
    return responseBody(body);
  }
  try {
    const groups = await Promise.allSettled(SEARCH_GROUPS.map(group => searchGroup(group, appKey, appSecret)));
    const products = new Map<string, StoreProduct>();
    const errors: string[] = [];
    const errorDetails: string[] = [];
    groups.forEach((result, index) => {
      if (result.status === "fulfilled") result.value.forEach(p => { if (!products.has(p.id)) products.set(p.id, p); });
      else {
        errors.push(SEARCH_GROUPS[index].category);
        const reason = result.reason;
        const detail = reason instanceof Error ? reason.message : "Unknown provider error";
        errorDetails.push(SEARCH_GROUPS[index].category + ": " + detail.slice(0, 320));
      }
    });
    const all = [...products.values()].slice(0, 1000);
    if (!all.length) {
      const persisted = await readPersistedCatalog();
      if (persisted) return responseBody({ ...persisted, persisted: true, notice: "Supplier sync failed; showing previously saved catalog. Inventory remains unverified." }, 200);
      return responseBody({
        products: [], count: 0, limit: 1000, configured: true, source: "aliexpress", supplier: "AliExpress", persisted: false,
        categories: {}, partial: errors.length > 0, failedCategories: errors, errorDetails,
        inventoryNote: INVENTORY_NOTE + " Affiliate product-query API does not verify live SKU stock.",
        notice: "No valid EUR products with secure image and product links were returned. Demo data is not mixed into live supplier results.",
      }, 502);
    }
    const body: CatalogBody = {
      products: all, count: all.length, limit: 1000, configured: true, source: "aliexpress", supplier: "AliExpress",
      persisted: false, categories: Object.fromEntries(SEARCH_GROUPS.map(group => [group.category, all.filter(p => p.category === group.category).length])),
      partial: errors.length > 0, failedCategories: errors,
      inventoryNote: INVENTORY_NOTE + " Affiliate discovery does not verify live SKU-level stock. Rexona results are included only when returned by the configured supplier API.",
    };
    body.persisted = await persistCatalog(body);
    if (!body.persisted) body.notice = "Catalog fetched but not durably saved. Configure BLOB_READ_WRITE_TOKEN in Vercel to enable persistent storage.";
    cachedCatalog = { key: cacheKey, expiresAt: Date.now() + 10 * 60 * 1000, body };
    return responseBody(body);
  } catch (caught) {
    const safeError = caught instanceof Error ? caught.message.slice(0, 320) : "Unknown sync error";
    console.error("[sync-products] Provider sync failed:", safeError);
    const persisted = await readPersistedCatalog();
    if (persisted) return responseBody({ ...persisted, persisted: true, notice: "Live sync failed; serving the previously saved catalog. Stock is not verified." });
    return responseBody({
      products: [], count: 0, limit: 1000, configured: true, source: "aliexpress", supplier: "AliExpress", persisted: false,
      categories: {}, partial: false, failedCategories: [], inventoryNote: INVENTORY_NOTE,
      errorDetails: [safeError],
      notice: "AliExpress sync failed and no saved catalog was available. See safe errorDetails for the provider response; no secrets are logged.",
    } as CatalogBody, 502);
  }
}
