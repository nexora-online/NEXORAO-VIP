# Catalog operations

The storefront requests up to 1,000 catalog items from `/api/catalog?limit=1000`.

Before a supplier feed is enabled, confirm:
- The feed format and authentication method with the supplier.
- Stable supplier product IDs and variant/SKU mapping.
- Price currency, tax treatment and update frequency.
- Stock quantity and out-of-stock behavior.
- Product image rights, URLs and fallback behavior.
- A safe maximum item count and timeout.
- Logs that exclude authorization headers and tokens.

Do not label sample/demo products as confirmed supplier inventory.