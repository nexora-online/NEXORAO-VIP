# NEXORAO-VIP

Premium responsive black-and-gold storefront for the NEXORA VIP concept, built with Next.js.

## Catalog connection

The storefront requests `/api/catalog?limit=1500`. The catalog endpoint intentionally returns an empty catalog until a real supplier feed is configured; it does not invent products.

Configure these hosting environment variables when an actual supplier feed is available:

- `SUPPLIER_CATALOG_URL`: HTTPS URL of the supplier's product feed.
- `SUPPLIER_CATALOG_TOKEN`: optional bearer token, if required by that supplier.
- `NEXT_PUBLIC_SITE_URL`: optional canonical site URL for the hourly catalog check.
- `CRON_SECRET`: optional secret to protect the catalog cron endpoint.

The feed must return a JSON array or an object with a `products` array. Each product needs a stable `id`, `name`, numeric `price`, and HTTPS image URL (`imageUrl` or `image`). Optional fields include `brand`, `category`, `currency`, and `available`. Products marked unavailable are not displayed. The endpoint validates product data and caps the response at 1,500 items. Supplier APIs may need a dedicated adapter before they can be used.

## Preview and payments

The current storefront is a preview: cart and wishlist controls are local interface interactions only. Checkout does not create orders or collect money. Real payments require the selected payment provider's credentials, verified business details, order handling, shipping/tax configuration, and reviewed legal pages before live launch.
