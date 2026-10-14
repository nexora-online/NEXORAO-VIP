import { NextResponse } from "next/server";
import { fetchSupplierFeed } from "@/lib/suppliers/feed-client";
import { MAX_CATALOG_PRODUCTS } from "@/lib/store/constants";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const requested = rawLimit === null ? MAX_CATALOG_PRODUCTS : Number(rawLimit);
  const limit = Number.isFinite(requested)
    ? Math.min(MAX_CATALOG_PRODUCTS, Math.max(1, Math.floor(requested)))
    : MAX_CATALOG_PRODUCTS;

  if (!process.env.SUPPLIER_CATALOG_URL) {
    return NextResponse.json({
      products: [],
      count: 0,
      limit,
      source: "not-configured",
      message: "Supplier catalog is not configured yet.",
    }, { headers: noStoreHeaders });
  }

  try {
    const result = await fetchSupplierFeed();
    const products = result.products
      .filter(product =>
        product.available &&
        product.currency === "EUR" &&
        Number.isFinite(product.price) &&
        product.price >= 0 &&
        /^https:\/\/[^\s]+$/i.test(product.image)
      )
      .slice(0, limit);

    return NextResponse.json({
      products,
      count: products.length,
      limit,
      source: "supplier-feed",
      supplier: result.source,
      fetchedAt: result.fetchedAt,
      warnings: result.warnings,
    }, { headers: noStoreHeaders });
  } catch {
    // Do not expose supplier URLs, response details, or credentials in public API errors.
    return NextResponse.json({
      products: [],
      count: 0,
      limit,
      source: "supplier-error",
      message: "The supplier catalog is temporarily unavailable. Please try again later.",
    }, { status: 502, headers: noStoreHeaders });
  }
}
