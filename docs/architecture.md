# NEXORA VIP architecture

- Next.js App Router serves the fixed storefront and server API routes.
- Vercel hosts the application and scheduled catalog refresh.
- Supplier feed access is server-side only; never expose supplier tokens to browser code.
- Catalog import is capped at 1,000 records and validates product identifiers, prices and HTTPS image URLs.
- Do not dispatch real supplier orders until a real supplier API contract, order endpoint, idempotency strategy and account permissions are confirmed.
- Do not collect real payments until payment provider credentials, business verification, order persistence, refund handling and legal review are complete.

The current feed adapter accepts a JSON array or a JSON object with a `products` array. BrandsGateway is the planned supplier, but its real API adapter must be implemented against the credentials and documentation granted to the merchant account.