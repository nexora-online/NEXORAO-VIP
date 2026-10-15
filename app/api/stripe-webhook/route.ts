import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeLineItems = { data?: Array<{ description?: string | null; quantity?: number | null; amount_total?: number | null; currency?: string | null; price?: { product?: string | { id?: string } | null } | null }> };

function verifyStripeSignature(raw: string, header: string, secret: string): boolean {
  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + "." + raw, "utf8").digest("hex");
  return signatures.some(signature => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook signing secret is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature") || "";
  const raw = await request.text();
  if (!verifyStripeSignature(raw, signature, secret)) return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(raw) as typeof event; } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object || {};
    if (session.payment_status !== "paid") return NextResponse.json({ received: true, fulfillment: "pending_payment_confirmation" });
    const supplierUrl = process.env.SUPPLIER_ORDER_FULFILLMENT_URL;
    const supplierToken = process.env.SUPPLIER_ORDER_FULFILLMENT_TOKEN;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (process.env.COMMERCE_RELEASE_APPROVED === "true" && supplierUrl && supplierToken && stripeSecret && typeof session.id === "string") {
      let endpoint: URL;
      try { endpoint = new URL(supplierUrl); if (endpoint.protocol !== "https:") throw new Error(); }
      catch { return NextResponse.json({ error: "Supplier fulfillment endpoint must use HTTPS." }, { status: 500 }); }
      let lines: NonNullable<StripeLineItems["data"]> = [];
      try {
        const itemsResponse = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session.id) + "/line_items?limit=100", {
          headers: { Authorization: "Bearer " + stripeSecret, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(12000),
        });
        if (!itemsResponse.ok) return NextResponse.json({ error: "Payment verified but Stripe line items could not be retrieved; manual fulfillment required." }, { status: 502 });
        const lineItemsPayload = await itemsResponse.json() as StripeLineItems;
        lines = Array.isArray(lineItemsPayload.data) ? lineItemsPayload.data : [];
      } catch {
        return NextResponse.json({ error: "Payment verified but Stripe line items are temporarily unavailable; manual fulfillment required." }, { status: 502 });
      }
      const productIds = String((session.metadata as { product_ids?: string } | undefined)?.product_ids || "").split(",").filter(Boolean);
      const shipping = session.shipping_details as { address?: { line1?: string | null; city?: string | null; postal_code?: string | null; country?: string | null }; name?: string | null } | null;
      if (!shipping?.address?.line1 || !shipping.address.city || !shipping.address.postal_code || !shipping.address.country || !shipping.name) {
        return NextResponse.json({ error: "Payment verified but complete shipping details are missing; manual fulfillment required." }, { status: 502 });
      }
      if (!lines.length || lines.length !== productIds.length || lines.some(line => !Number.isInteger(line.quantity) || (line.quantity || 0) < 1 || (line.amount_total || 0) < 0 || line.currency?.toLowerCase() !== "eur")) {
        return NextResponse.json({ error: "Payment verified but order lines failed validation; manual fulfillment required." }, { status: 502 });
      }
      const payload = {
        source: "stripe",
        stripeEventId: event.id,
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent,
        currency: session.currency,
        amountTotal: session.amount_total,
        customerEmail: (session.customer_details as { email?: string } | undefined)?.email,
        customerName: (session.customer_details as { name?: string } | undefined)?.name,
        shippingDetails: session.shipping_details,
        items: lines.map((line, index) => ({
          supplierProductId: productIds[index],
          quantity: line.quantity,
          description: line.description,
          lineAmountMinor: line.amount_total,
          currency: line.currency,
        })),
        idempotencyKey: String(event.id || session.id),
        note: "The supplier adapter must independently validate product IDs, SKU/variant, price, inventory, shipping address and idempotency before placing orders.",
      };
      try {
        const result = await fetch(endpoint.toString(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + supplierToken, "Idempotency-Key": String(event.id || session.id || "nexora-order") }, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(20000) });
        if (!result.ok) return NextResponse.json({ error: "Payment verified; supplier fulfillment adapter rejected the order. Manual fulfillment required." }, { status: 502 });
        return NextResponse.json({ received: true, fulfillment: "submitted_to_configured_supplier_adapter" });
      } catch {
        return NextResponse.json({ error: "Payment verified; supplier fulfillment adapter is unreachable. Manual fulfillment required." }, { status: 502 });
      }
    }
    console.error("NEXORA paid checkout needs manual fulfillment; SUPPLIER_ORDER_FULFILLMENT_URL is not configured.", { eventId: event.id, sessionId: session.id });
  }
  return NextResponse.json({ received: true });
}
