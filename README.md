# NEXORAO-VIP

Premium responsive black-and-gold storefront for the NEXORA VIP concept, built with Next.js.

## Catalog connection

The storefront requests `/api/catalog?limit=1500`. The catalog endpoint intentionally returns an empty catalog until a real supplier feed is configured; it does not invent products.

Configure one of the supported server-side supplier connections in Vercel:

- `CJ_API_KEY`: optional CJdropshipping API key. When present, the catalog route authenticates with CJ and requests product pages server-side (up to 1,500 items; CJ API pagination is used). The key must never use a `NEXT_PUBLIC_` prefix.
- `SUPPLIER_CATALOG_URL`: HTTPS URL of a supplier's JSON product feed, used when `CJ_API_KEY` is not configured.
- `SUPPLIER_CATALOG_TOKEN`: optional bearer token for that generic feed.
- `NEXT_PUBLIC_SITE_URL`: optional canonical site URL for the hourly catalog check.
- `CRON_SECRET`: optional secret to protect the catalog cron endpoint.

The generic feed must return a JSON array or an object with a `products` array. Each product needs a stable `id`, `name`, numeric `price`, and HTTPS image URL (`imageUrl` or `image`). Optional fields include `brand`, `category`, `currency`, and `available`. Products marked unavailable are not displayed. The endpoint validates product data and caps the response at 1,500 items. The CJ adapter requires a valid CJ API key and API access; a successful GitHub build alone does not verify supplier credentials or guarantee that products will load.

## Preview and payments

The current storefront is a preview: cart and wishlist controls are local interface interactions only. Checkout does not create orders or collect money. Real payments require the selected payment provider's credentials, verified business details, order handling, shipping/tax configuration, and reviewed legal pages before live launch.
