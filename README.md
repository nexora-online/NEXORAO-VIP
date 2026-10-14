# NEXORAO-VIP

Premium black-and-gold storefront for the NEXORA VIP concept.

## Supplier catalog connection

The storefront requests `/api/catalog?limit=1000` and displays valid products returned by the catalog endpoint. The endpoint intentionally returns an empty catalog until a supplier feed is configured; it does not invent supplier products.

Configure these environment variables in the hosting project:

- `SUPPLIER_CATALOG_URL`: HTTPS URL of the supplier's product feed.
- `SUPPLIER_CATALOG_TOKEN`: optional bearer token, if the supplier requires one.

The feed must return either a JSON array or an object with a `products` array. Each product should contain:

```json
{
  "products": [
    {
      "id": "supplier-item-123",
      "name": "Product name",
      "brand": "Brand",
      "category": "ACCESSOIRES",
      "price": 29.95,
      "currency": "EUR",
      "imageUrl": "https://supplier.example/product-image.jpg",
      "available": true
    }
  ]
}
```

Products are validated before display and the import is capped at 1,000 items. Images may be supplied as `imageUrl` or `image`; the feed must provide a stable product ID, name, numeric price and image URL. Only configure a feed URL and token supplied by the actual supplier. Different supplier APIs may require a dedicated adapter before they can be used.

## Payments and launch

Checkout is currently a preview only and does not create orders or collect money. Real payments require the selected payment provider's credentials, verified business details, order handling, shipping/tax configuration, and reviewed legal pages before live launch.
