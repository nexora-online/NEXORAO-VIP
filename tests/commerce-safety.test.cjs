const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const checkout = read("app/api/stripe-checkout/route.ts");
const webhook = read("app/api/stripe-webhook/route.ts");
const simulation = read("app/api/commerce-simulation/route.ts");
const catalog = read("app/api/sync-products/route.ts");

test("live checkout stays disabled unless both release gates are explicitly enabled", () => {
  assert.match(checkout, /CHECKOUT_ENABLED !== "true"/);
  assert.match(checkout, /COMMERCE_RELEASE_APPROVED !== "true"/);
  assert.match(checkout, /No payment was created/);
});

test("checkout rejects unknown inventory and requires a positive EUR price", () => {
  assert.match(checkout, /product\.available !== true/);
  assert.match(checkout, /product\.price <= 0/);
  assert.match(checkout, /product\.currency\.toLowerCase\(\) !== "eur"/);
  assert.match(checkout, /Math\.round\(n \* 100\)/);
});

test("webhook requires a valid recent HMAC signature and paid session", () => {
  assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
  assert.match(webhook, /createHmac\("sha256"/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(webhook, /Date\.now\(\) \/ 1000 - Number\(timestamp\) > 300/);
  assert.match(webhook, /session\.payment_status !== "paid"/);
});

test("supplier fulfillment remains behind both release gates and HTTPS validation", () => {
  assert.match(webhook, /CHECKOUT_ENABLED === "true" && process\.env\.COMMERCE_RELEASE_APPROVED === "true"/);
  assert.match(webhook, /endpoint\.protocol !== "https:"/);
  assert.match(webhook, /Idempotency-Key/);
  assert.match(webhook, /manual fulfillment required/i);
});

test("simulation route is opt-in, authenticated, and has no external side effects", () => {
  assert.match(simulation, /COMMERCE_SIMULATION_ENABLED !== "true"/);
  assert.match(simulation, /Bearer\\s\+/);
  assert.match(simulation, /CRON_SECRET/);
  assert.match(simulation, /externalSideEffects: false/);
  assert.match(simulation, /mode: "dry_run"/);
});

test("simulation checks reject unknown stock and tampered or stale signatures", () => {
  assert.match(simulation, /unknownStockProduct\.available !== true/);
  assert.match(simulation, /tamperedSignatureRejected/);
  assert.match(simulation, /staleSignatureRejected/);
  assert.match(simulation, /Live checkout remains locked/);
});

test("supplier catalog never invents inventory availability", () => {
  assert.match(catalog, /available: null/);
  assert.match(catalog, /inventoryStatus: "unknown"/);
  assert.match(catalog, /Do not fabricate either/);
});
