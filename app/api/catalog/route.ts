import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoreProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  currency: string;
  supplier: string;
  supplierProductId: string;
  available: boolean;
};

type SupplierProduct = {
  id?: string | number;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  currency?: string;
  available?: boolean;
};

function normalizeProduct(item: SupplierProduct, supplier: string): StoreProduct | null {
  const name = String(item.name ?? item.title ?? "").trim();
  const rawPrice = Number(item.price);
  const id = String(item.id ?? "").trim();
  const image = String(item.imageUrl ?? item.image ?? "").trim();

  if (!id || !name || !Number.isFinite(rawPrice) || rawPrice < 0 || !image) return null;

  return {
    id: `${supplier}:${id}`,
    name,
    brand: String(item.brand ?? supplier).trim(),
    category: String(item.category ?? "LIFESTYLE").trim().toUpperCase(),
    price: Math.round(rawPrice * 100) / 100,
    image,
    currency: String(item.currency ?? "EUR").toUpperCase(),
    supplier,
    supplierProductId: id,
    available: item.available !== false,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(1000, Math.max(1, Math.floor(requestedLimit)))
    : 1000;

  const feedUrl = process.env.SUPPLIER_CATALOG_URL;
  const feedToken = process.env.SUPPLIER_CATALOG_TOKEN;

  if (!feedUrl) {
    return NextResponse.json(
      {
        products: [],
        count: 0,
        limit,
        source: "not-configured",
        message: "Supplier feed is not configured. Add SUPPLIER_CATALOG_URL and connect a supplier feed before importing products.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(feedUrl, {
      headers: feedToken ? { Authorization: `Bearer ${feedToken}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { products: [], count: 0, limit, source: "supplier-error", message: `Supplier feed returned HTTP ${response.status}.` },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload: unknown = await response.json();
    const rawItems: SupplierProduct[] = Array.isArray(payload)
      ? payload as SupplierProduct[]
      : payload && typeof payload === "object" && Array.isArray((payload as { products?: unknown }).products)
        ? (payload as { products: SupplierProduct[] }).products
        : [];

    const products = rawItems
      .map((item) => normalizeProduct(item, new URL(feedUrl).hostname))
      .filter((item): item is StoreProduct => item !== null && item.available)
      .slice(0, limit);

    return NextResponse.json(
      { products, count: products.length, limit, source: "supplier-feed" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { products: [], count: 0, limit, source: "supplier-error", message: "Could not read supplier feed. Check the feed URL, token and response format." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
