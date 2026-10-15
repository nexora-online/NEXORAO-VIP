import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type StoreCategory = "DAMEN" | "HERREN" | "SCHMUCK & UHREN" | "BEAUTY" | "ACCESSOIRES" | "LIFESTYLE";
type StoreProduct = {
  id: string;
  sku?: string;
  name: string;
  brand: string;
  category: StoreCategory;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  available: boolean | null;
  inventoryStatus: "available-unknown-quantity" | "unknown";
  supplier: "AliExpress";
};
type SearchGroup = { category: StoreCategory; keywords: string };

const SEARCH_GROUPS: SearchGroup[] = [
  { category: "DAMEN", keywords: "women fashion elegant dress" },
  { category: "HERREN", keywords: "men fashion elegant clothing" },
  { category: "SCHMUCK & UHREN", keywords: "jewelry watches elegant" },
  { category: "BEAUTY", keywords: "beauty skincare makeup" },
  { category: "ACCESSOIRES", keywords: "women handbags accessories" },
  { category: "LIFESTYLE", keywords: "home lifestyle decor" },
];

const text = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const safeHttps = (value: unknown): string => {
  const raw = text(value);
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
};
const amount = (value: unknown): number | null => {
  const raw = text(value).replace(/[^0-9.,-]/g, "");
  const normalized = raw.includes(",") && raw.includes(".")
    ? (raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, ""))
    : raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
function classifyProduct(value: Record<string, unknown>, fallback: StoreCategory): StoreProduct | null {
  const id = text(value.product_id ?? value.productId ?? value.id);
  const name = text(value.product_title ?? value.productTitle ?? value.title ?? value.name);
  const smallImages = value.product_small_image_urls ?? value.productSmallImageUrls ?? value.small_images ?? value.images;
  const imageList = Array.isArray(smallImages) ? smallImages : typeof smallImages === "string" ? smallImages.split(",") : [];
  const imageUrl = safeHttps(value.product_main_image_url ?? value.productMainImageUrl ?? value.imageUrl ?? value.image) || imageList.map(safeHttps).find(Boolean) || "";
  const price = amount(value.target_sale_price ?? value.targetSalePrice ?? value.app_sale_price ?? value.sale_price ?? value.price);
  const productUrl = safeHttps(value.product_detail_url ?? value.productDetailUrl ?? value.promotion_link ?? value.product_url);
  if (!id || !name || !imageUrl || price === null) return null;

  const searchable = [
    name,
    text(value.first_level_category_name ?? value.firstLevelCategoryName),
    text(value.second_level_category_name ?? value.secondLevelCategoryName),
  ].join(" ").toLowerCase();
  let category: StoreCategory = fallback;
  if (/watch|jewel|ring|necklace|bracelet|earring|schmuck|uhr/.test(searchable)) category = "SCHMUCK & UHREN";
  else if (/beauty|makeup|cosmetic|skin.?care|serum|lipstick|mascara/.test(searchable)) category = "BEAUTY";
  else if (/handbag|bag|wallet|sunglass|belt|accessor/.test(searchable)) category = "ACCESSOIRES";
  else if (/home|kitchen|decor|lamp|lifestyle|furniture/.test(searchable)) category = "LIFESTYLE";
  else if (/men|male|herr|man clothing/.test(searchable)) category = "HERREN";
  else if (/women|female|dress|ladies|damen/.test(searchable)) category = "DAMEN";

  // Affiliate discovery APIs do not reliably expose variant SKUs or live warehouse stock.
  // Do not fabricate either: preserve product ID as the stable catalog key and mark inventory unknown.
  return {
    id,
    ...(text(value.sku ?? value.sku_id ?? value.skuId) ? { sku: text(value.sku ?? value.sku_id ?? value.skuId) } : {}),
    name,
    brand: text(value.shop_name ?? value.shopName ?? value.brand) || "AliExpress",
    category,
    price,
    currency: text(value.target_currency ?? value.targetCurrency) || "EUR",
    imageUrl,
    productUrl,
    available: null,
    inventoryStatus: "unknown",
    supplier: "AliExpress",
  };
}
function collectProductObjects(input: unknown, out: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 12 || input == null) return out;
  if (Array.isArray(input)) { for (const item of input) collectProductObjects(item, out, depth + 1); return out; }
  if (typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  if ((obj.product_id != null || obj.productId != null) && (obj.product_title != null || obj.productTitle != null || obj.title != null)) out.push(obj);
  for (const [key, value] of Object.entries(obj)) {
    if (key === "product" || key === "products" || typeof value === "object") collectProductObjects(value, out, depth + 1);
  }
  return out;
}
function signRequest(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).filter(key => key !== "sign").sort();
  const payload = "/rest" + sorted.map(key => key + params[key]).join("");
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex").toUpperCase();
}
async function searchGroup(group: SearchGroup, appKey: string, appSecret: string, country: string, currency: string, language: string): Promise<StoreProduct[]> {
  const params: Record<string, string> = {
    app_key: appKey,
    method: "aliexpress.affiliate.product.query",
    timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
    sign_method: "sha256",
    format: "json",
    v: "2.0",
    keywords: group.keywords,
    page_no: "1",
    page_size: "50",
    target_currency: currency,
    target_language: language,
    ship_to_country: country,
    sort: "SALE_PRICE_ASC",
    fields: "product_id,product_title,product_main_image_url,target_sale_price,target_original_price,product_detail_url,first_level_category_name,second_level_category_name,shop_name,product_small_image_urls,product_video_url,evaluate_rate,lastest_volume",
  };
  params.sign = signRequest(params, appSecret);
  const response = await fetch("https://api-sg.aliexpress.com/rest", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", Accept: "application/json" },
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error("AliExpress API returned HTTP " + response.status);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("AliExpress returned an invalid response");
  const root = data as Record<string, unknown>;
  if (root.error_response || root.error || root.code && Number(root.code) >= 400) throw new Error("AliExpress rejected the product query");
  const candidates = collectProductObjects(data);
  const unique = new Map<string, StoreProduct>();
  for (const candidate of candidates) {
    const product = classifyProduct(candidate, group.category);
    if (product && !unique.has(product.id)) unique.set(product.id, product);
  }
  return [...unique.values()];
}

export async function POST(request: Request) {
  return GET(request);
}

export async function GET(request: Request) {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  if (!appKey || !appSecret) {
    return NextResponse.json({
      products: [], count: 0, configured: false, supplier: "AliExpress",
      error: "AliExpress credentials are not configured in Vercel. Add ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET as server-side environment variables.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const requestUrl = new URL(request.url);
  const country = (requestUrl.searchParams.get("country") || "DE").toUpperCase().slice(0, 2);
  const currency = (requestUrl.searchParams.get("currency") || "EUR").toUpperCase().slice(0, 3);
  const language = (requestUrl.searchParams.get("language") || "DE").toUpperCase().slice(0, 2);
  try {
    const results = await Promise.allSettled(SEARCH_GROUPS.map(group => searchGroup(group, appKey, appSecret, country, currency, language)));
    const products = new Map<string, StoreProduct>();
    const errors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") result.value.forEach(product => { if (!products.has(product.id)) products.set(product.id, product); });
      else errors.push(SEARCH_GROUPS[index].category);
    });
    const all = [...products.values()].slice(0, 1500);
    if (all.length === 0) {
      return NextResponse.json({
        products: [], count: 0, configured: true, supplier: "AliExpress",
        error: "AliExpress returned no usable products. Verify the app's API permissions, signature method, and product-query access.",
        failedCategories: errors,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      products: all, count: all.length, limit: 1500, configured: true, supplier: "AliExpress",
      categories: Object.fromEntries(SEARCH_GROUPS.map(group => [group.category, all.filter(product => product.category === group.category).length])),
      inventoryNote: "The affiliate product-query API does not reliably expose live SKU-level stock. Inventory is intentionally marked unknown until a stock-capable, authorized API is configured.",
      partial: errors.length > 0, failedCategories: errors,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({
      products: [], count: 0, configured: true, supplier: "AliExpress",
      error: "AliExpress synchronization failed. Check API access, credentials and permissions in the provider console.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
