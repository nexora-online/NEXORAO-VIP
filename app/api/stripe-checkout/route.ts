import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoreProduct = { id: string; name: string; price: number; currency: string; imageUrl: string; productUrl?: string; available?: boolean | null };
const safeText = (v: unknown, max = 180) => typeof v === "string" ? v.trim().slice(0, max) : "";
const euroAmount = (n: number) => Math.round(n * 100);

export async function POST(request: Request) {
  const supplierUrl = process.env.SUPPLIER_ORDER_FULFILLMENT_URL;
  const supplierToken = process.env.SUPPLIER_ORDER_FULFILLMENT_TOKEN;
  if (process.env.CHECKOUT_ENABLED !== "true" || process.env.COMMERCE_RELEASE_APPROVED !== "true" || !supplierUrl || !supplierToken) {
    return NextResponse.json({ error: "Live checkout is safely disabled until release approval and a verified supplier order adapter are configured. No payment was created." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try { const endpoint = new URL(supplierUrl); if (endpoint.protocol !== "https:") throw new Error(); } catch {
    return NextResponse.json({ error: "The configured supplier order adapter must use HTTPS. No payment was created." }, { status: 503 });
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const rawItems = body && typeof body === "object" ? (body as { items?: unknown }).items : null;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 30) return NextResponse.json({ error: "Add between 1 and 30 products to continue." }, { status: 400 });
  const quantities: { id: string; quantity: number; type: string; color: string; size: string }[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; quantity?: unknown; type?: unknown; color?: unknown; size?: unknown };
    const id = safeText(row.id, 160);
    const quantity = Number(row.quantity ?? 1);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: "Invalid product or quantity." }, { status: 400 });
    quantities.push({ id, quantity, type: safeText(row.type, 80), color: safeText(row.color, 80), size: safeText(row.size, 40) });
  }
  if (!quantities.length) return NextResponse.json({ error: "The cart is empty." }, { status: 400 });
  const origin = new URL(request.url).origin;
  let catalogResponse: Response;
  try {
    catalogResponse = await fetch(new URL("/api/sync-products?country=DE&currency=EUR&language=DE", origin), { cache: "no-store", signal: AbortSignal.timeout(55000) });
  } catch {
    return NextResponse.json({ error: "The supplier catalog is temporarily unavailable. Please try again later." }, { status: 502 });
  }
  if (!catalogResponse.ok) return NextResponse.json({ error: "Products could not be verified with the supplier. No payment was created." }, { status: 502 });
  const catalogPayload: unknown = await catalogResponse.json();
  const catalog = catalogPayload && typeof catalogPayload === "object" && Array.isArray((catalogPayload as { products?: unknown }).products) ? (catalogPayload as { products: StoreProduct[] }).products : [];
  const byId = new Map(catalog.map(p => [String(p.id), p]));
  const selected: { product: StoreProduct; quantity: number; type: string; color: string; size: string }[] = [];
  for (const [id, quantity] of quantities) {
    const product = byId.get(id);
    if (!product || !Number.isFinite(product.price) || product.price <= 0 || !/^[A-Z]{3}$/.test(product.currency || "") || product.currency.toLowerCase() !== "eur" || product.available !== true) {
      return NextResponse.json({ error: "A cart item does not have verified live inventory or a valid EUR price. No payment was created. Refresh the catalog or try again when supplier stock is confirmed.", productId: id }, { status: 409 });
    }
    selected.push({ product, quantity, type, color, size });
  }
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", origin + "/success?session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url", origin + "/checkout?cancelled=1");
  form.set("billing_address_collection", "required");
  form.set("shipping_address_collection[allowed_countries][0]", "DE");
  form.set("shipping_address_collection[allowed_countries][1]", "AT");
  form.set("shipping_address_collection[allowed_countries][2]", "BE");
  form.set("shipping_address_collection[allowed_countries][3]", "NL");
  form.set("shipping_address_collection[allowed_countries][4]", "FR");
  form.set("shipping_address_collection[allowed_countries][5]", "LU");
  form.set("shipping_address_collection[allowed_countries][6]", "DK");
  form.set("shipping_address_collection[allowed_countries][7]", "PL");
  form.set("shipping_address_collection[allowed_countries][8]", "CZ");
  form.set("shipping_address_collection[allowed_countries][9]", "ES");
  form.set("shipping_address_collection[allowed_countries][10]", "IT");
  form.set("shipping_address_collection[allowed_countries][11]", "SE");
  form.set("shipping_address_collection[allowed_countries][12]", "FI");
  form.set("shipping_address_collection[allowed_countries][13]", "IE");
  form.set("shipping_address_collection[allowed_countries][14]", "PT");
  form.set("shipping_address_collection[allowed_countries][15]", "GR");
  form.set("shipping_address_collection[allowed_countries][16]", "EE");
  form.set("shipping_address_collection[allowed_countries][17]", "LV");
  form.set("shipping_address_collection[allowed_countries][18]", "LT");
  form.set("shipping_address_collection[allowed_countries][19]", "SI");
  form.set("shipping_address_collection[allowed_countries][20]", "SK");
  form.set("shipping_address_collection[allowed_countries][21]", "HR");
  form.set("shipping_address_collection[allowed_countries][22]", "RO");
  form.set("shipping_address_collection[allowed_countries][23]", "BG");
  form.set("shipping_address_collection[allowed_countries][24]", "CY");
  form.set("shipping_address_collection[allowed_countries][25]", "MT");
  form.set("shipping_address_collection[allowed_countries][26]", "HU");
  form.set("shipping_address_collection[allowed_countries][27]", "NO");
  form.set("shipping_address_collection[allowed_countries][28]", "CH");
  form.set("phone_number_collection[enabled]", "true");
  form.set("metadata[store]", "NEXORA VIP");
  form.set("metadata[product_ids]", selected.map(x => x.product.id).join(",").slice(0, 500));
  form.set("metadata[fulfillment]", "requires_supplier_order_adapter");
  selected.forEach(({ product, quantity, type, color, size }, index) => {
    form.set(`line_items[${index}][quantity]`, String(quantity));
    form.set(`line_items[${index}][price_data][currency]`, "eur");
    form.set(`line_items[${index}][price_data][unit_amount]`, String(euroAmount(product.price)));
    const optionLabel = [type && `Type: ${type}`, color && `Color: ${color}`, size && `Size: ${size}`].filter(Boolean).join(" · ");\n    form.set(`line_items[${index}][price_data][product_data][name]`, safeText(optionLabel ? `${product.name} — ${optionLabel}` : product.name, 120));
    form.set(`line_items[${index}][price_data][product_data][metadata][supplier_product_id]`, safeText(product.id, 120));\n    if (type) form.set(`line_items[${index}][price_data][product_data][metadata][selected_type]`, type);\n    if (color) form.set(`line_items[${index}][price_data][product_data][metadata][selected_color]`, color);\n    if (size) form.set(`line_items[${index}][price_data][product_data][metadata][selected_size]`, size);
    if (product.imageUrl?.startsWith("https://")) form.set(`line_items[${index}][price_data][product_data][images][0]`, product.imageUrl);
  });
  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: form.toString(), cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    const data: unknown = await stripeResponse.json();
    if (!stripeResponse.ok) {
      const message = data && typeof data === "object" ? safeText((data as { error?: { message?: unknown } }).error?.message, 240) : "";
      return NextResponse.json({ error: message || "Stripe could not create a checkout session." }, { status: 502 });
    }
    const session = data as { id?: unknown; url?: unknown };
    if (typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) return NextResponse.json({ error: "Stripe returned an invalid checkout URL." }, { status: 502 });
    return NextResponse.json({ url: session.url, sessionId: typeof session.id === "string" ? session.id : undefined });
  } catch {
    return NextResponse.json({ error: "Stripe is temporarily unavailable. No checkout session was confirmed." }, { status: 502 });
  }
}
