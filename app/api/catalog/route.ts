import { NextResponse } from "next/server";
import { fetchSupplierFeed } from "@/lib/suppliers/feed-client";
import { MAX_CATALOG_PRODUCTS } from "@/lib/store/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("limit") ?? MAX_CATALOG_PRODUCTS);
  const limit = Number.isFinite(requested)
    ? Math.min(MAX_CATALOG_PRODUCTS, Math.max(1, Math.floor(requested)))
    : MAX_CATALOG_PRODUCTS;

  if (!process.env.SUPPLIER_CATALOG_URL) {
    return NextResponse.json({
      products: [], count: 0, limit, source: "not-configured",
      message: "Supplier feed is not configured. Add the authorized supplier feed URL in the hosting environment.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await fetchSupplierFeed();
    const products = result.products.filter(p => p.available).slice(0, limit);
    return NextResponse.json({
      products, count: products.length, limit, source: "supplier-feed",
      supplier: result.source, fetchedAt: result.fetchedAt, warnings: result.warnings,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      products: [], count: 0, limit, source: "supplier-error",
      message: error instanceof Error ? error.message : "Could not read supplier feed.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
