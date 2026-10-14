# Supplier feed contract

Required environment variables:
- `SUPPLIER_CATALOG_URL`: private HTTPS endpoint for the authorized supplier feed.
- `SUPPLIER_CATALOG_TOKEN`: optional bearer token if required by the supplier.
- `CRON_SECRET`: long random secret used to authorize scheduled sync requests.

Expected JSON shape: `{ "products": [{ "id": "sku-123", "name": "Product", "price": 12.34, "currency": "EUR", "imageUrl": "https://...", "available": true, "stock": 3 }] }`.

Do not point the integration at undocumented URLs or use credentials that were not issued to the store owner. The actual supplier API may require pagination, signing, or a dedicated adapter.