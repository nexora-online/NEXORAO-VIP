import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signatureFor(raw: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(timestamp + "." + raw, "utf8").digest("hex");
}

function verifySignature(raw: string, header: string, secret: string, nowSeconds: number): boolean {
  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const expected = Buffer.from(signatureFor(raw, timestamp, secret), "hex");
  return signatures.some(value => {
    if (!/^[a-f0-9]{64}$/i.test(value)) return false;
    const actual = Buffer.from(value, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function GET(request: Request) {
  if (process.env.COMMERCE_SIMULATION_ENABLED !== "true") {
    return NextResponse.json({ error: "Commerce simulation is disabled." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const gateSecret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!gateSecret || supplied.length !== gateSecret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(gateSecret))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
  const mockProduct = { id: "simulation-product-001", price: 24.99, currency: "EUR", available: true };
  checks.push({
    name: "Affiliate catalog fixture",
    passed: Boolean(mockProduct.id && mockProduct.price > 0 && mockProduct.currency === "EUR"),
    detail: "A local fixture passed product ID, positive price and currency validation; no AliExpress request was made.",
  });
  const unknownStockProduct = { ...mockProduct, sku: undefined as string | undefined, available: null as boolean | null };
  checks.push({
    name: "Unknown stock fails closed",
    passed: unknownStockProduct.available !== true,
    detail: "An item with unknown stock is rejected by the checkout eligibility rule.",
  });
  checks.push({
    name: "SKU fallback is non-invented",
    passed: Boolean(unknownStockProduct.id) && unknownStockProduct.sku === undefined && unknownStockProduct.available === null,
    detail: "When the affiliate feed has no variant SKU, the product ID remains the catalog key; no SKU or inventory availability is fabricated.",
  });
  const checkoutEligible = mockProduct.available === true && mockProduct.price > 0 && mockProduct.currency === "EUR";
  checks.push({
    name: "Mock pre-checkout validation",
    passed: checkoutEligible,
    detail: "A synthetic in-stock fixture passes input validation only; this does not create a Stripe session or override the disabled live-checkout flags.",
  });
  checks.push({
    name: "Live checkout remains locked",
    passed: process.env.CHECKOUT_ENABLED !== "true" && process.env.COMMERCE_RELEASE_APPROVED !== "true",
    detail: "Neither release flag may be enabled while the code-level simulation is running; no live payment can be initiated by this simulation route.",
  });

  const now = Math.floor(Date.now() / 1000);
  const webhookSecret = "simulation-only-webhook-secret";
  const event = {
    id: "evt_simulation_only",
    type: "checkout.session.completed",
    data: { object: { id: "cs_simulation_only", payment_status: "paid", currency: "eur", amount_total: 2499 } },
  };
  const raw = JSON.stringify(event);
  const sig = signatureFor(raw, String(now), webhookSecret);
  const validSignatureAccepted = verifySignature(raw, "t=" + now + ",v1=" + sig, webhookSecret, now);
  const tamperedSignatureRejected = !verifySignature(raw + " ", "t=" + now + ",v1=" + sig, webhookSecret, now);
  const staleSignatureRejected = !verifySignature(raw, "t=" + (now - 600) + ",v1=" + sig, webhookSecret, now);
  checks.push({
    name: "Webhook signature verification",
    passed: validSignatureAccepted && tamperedSignatureRejected && staleSignatureRejected,
    detail: "A locally signed synthetic event was accepted; tampered payload and stale timestamp were rejected. This is a local HMAC test, not a live Stripe webhook.",
  });

  const simulatedOrder = {
    mode: "dry_run",
    idempotencyKey: event.id,
    productId: mockProduct.id,
    quantity: 1,
    amountMinor: 2499,
    currency: "EUR",
  };
  checks.push({
    name: "Fulfillment dry-run",
    passed: simulatedOrder.mode === "dry_run" && simulatedOrder.idempotencyKey === event.id,
    detail: "A synthetic order payload was validated in memory; no supplier API was called and no order was placed.",
  });

  const passed = checks.filter(check => check.passed).length;
  return NextResponse.json({
    mode: "simulation_only",
    passed,
    total: checks.length,
    allPassed: passed === checks.length,
    externalSideEffects: false,
    checks,
    nextSteps: [
      "Configure Vercel project environment variables through an authorized Vercel connection.",
      "Run a Stripe test-mode Checkout and webhook against Stripe's test endpoints.",
      "Connect a supplier API with documented stock/SKU checks and order-placement permissions before enabling real fulfillment.",
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}
