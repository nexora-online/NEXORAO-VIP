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
const packageJson = JSON.parse(read("package.json"));

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
  assert.match(webhook, /Math\.abs\(/);
  assert.match(webhook, /> 300/);
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
  assert.match(simulation, /authorization/);
  assert.match(simulation, /CRON_SECRET/);
  assert.match(simulation, /timingSafeEqual/);
  assert.match(simulation, /externalSideEffects: false/);
  assert.match(simulation, /mode: "dry_run"/);
});

test("simulation checks reject unknown stock and tampered or stale signatures", () => {
  assert.match(simulation, /unknownStockProduct\.available !== true/);
  assert.match(simulation, /tamperedSignatureRejected/);
  assert.match(simulation, /staleSignatureRejected/);
  assert.match(simulation, /Live checkout remains locked/);
});

test("catalog validates live EUR products and never fabricates SKU-level inventory", () => {
  assert.match(catalog, /rawCurrency !== "EUR"/);
  assert.match(catalog, /!productUrl/);
  assert.match(catalog, /available: null/);
  assert.match(catalog, /inventoryStatus: "unknown"/);
  assert.match(catalog, /luxuryTag: "unverified"/);
});

test("catalog has explicit simulation fallback and durable Blob persistence", () => {
  assert.match(catalog, /simulationCatalog\(\)/);
  assert.match(catalog, /SIMULATION ONLY/);
  assert.match(catalog, /await put\(BLOB_PATH/);
  assert.match(catalog, /await list\(\{ prefix: BLOB_PATH/);
  assert.match(catalog, /BLOB_READ_WRITE_TOKEN/);
  assert.equal(packageJson.dependencies["@vercel/blob"] !== undefined, true);
});

test("catalog limits stored items and labels inventory as unverified", () => {
  assert.match(catalog, /slice\(0, 1000\)/);
  assert.match(catalog, /Stock is unknown until a stock-capable supplier API verifies it/);
  assert.match(catalog, /Catalog fetched but not durably saved/);
});

test("environment template keeps payments locked and documents persistent catalog credentials", () => {
  const envExample = read(".env.example");
  assert.match(envExample, /^BLOB_READ_WRITE_TOKEN=$/m);
  assert.match(envExample, /^ALIEXPRESS_APP_KEY=$/m);
  assert.match(envExample, /^ALIEXPRESS_APP_SECRET=$/m);
  assert.match(envExample, /^CHECKOUT_ENABLED=false$/m);
  assert.match(envExample, /^COMMERCE_RELEASE_APPROVED=false$/m);
  assert.doesNotMatch(envExample, /sk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/);
});

test("catalog provides German locale EUR display labels for live and simulated products", () => {
  assert.match(catalog, /displayPrice: new Intl\.NumberFormat\("de-DE", \{ style: "currency", currency: "EUR" \}\)\.format\(price\)/);
  assert.match(catalog, /SIMULATION ONLY/);
  assert.match(catalog, /luxuryTag: "simulated"/);
});

test("storefront and collection pages keep a built-in EUR catalog when supplier sync fails", () => {
  const page = read("app/page.tsx");
  const collections = read("app/collections/[slug]/page.tsx");
  const fallback = read("lib/fallback-catalog.ts");
  assert.match(page, /import \{ FALLBACK_PRODUCTS \} from "\.\.\/lib\/fallback-catalog"/);
  assert.match(page, /useState<Product\[]>\(FALLBACK_PRODUCTS\)/);
  assert.match(page, /onError=\{event=>\{event\.currentTarget\.onerror=null/);
  assert.match(page, /FALLBACK_PRODUCTS/);
  assert.match(page, /Keep the cart catalog fallback available if the supplier API is unavailable/);
  assert.match(page, /if\(live\.length>0\)setProducts\(live\)/);
  assert.match(collections, /useState<Product\[]>\(FALLBACK_PRODUCTS\)/);
  assert.match(collections, /\[loading,setLoading\]=useState\(false\)/);
  assert.match(collections, /onError=\{event=>\{event\.currentTarget\.onerror=null/);
  assert.match(collections, /Keep the built-in preview catalog visible if supplier sync fails/);
  assert.match(collections, /if\(live\.length>0\)setProducts\(live\)/);
  assert.match(fallback, /preview-women-dress/);
  assert.match(fallback, /preview-men-jacket/);
  assert.match(fallback, /preview-perfume/);
  assert.match(fallback, /images\.unsplash\.com/);
  assert.match(fallback, /currency: "EUR"/);
});

test("fallback preview products are clearly simulated and never treated as in-stock", () => {
  const fallback = read("lib/fallback-catalog.ts");
  const page = read("app/page.tsx");
  assert.match(fallback, /brand: "NEXORA Preview"/);
  assert.match(fallback, /luxuryTag: "simulated"/);
  assert.match(fallback, /available: null/);
  assert.match(page, /p\.available\s*!==\s*true/);
});

test("preview product detail pages can resolve built-in products without supplier access", () => {
  const detail = read("app/products/[id]/page.tsx");
  assert.ok(detail.includes('import { FALLBACK_PRODUCTS } from "../../../lib/fallback-catalog"'));
  assert.match(detail, /FALLBACK_PRODUCTS\.find/);
  assert.match(detail, /setProduct\(fallback\)/);
  assert.match(detail, /onError=\{event=>\{event\.currentTarget\.onerror=null/);
});
