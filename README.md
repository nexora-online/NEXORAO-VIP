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

## AliExpress Open Platform product sync

The storefront reads its supplier catalog from `/api/sync-products?country=DE&currency=EUR&language=DE`. The route queries the AliExpress affiliate product-query API server-side and maps eligible products into the six storefront categories. Product images use `object-fit: contain` to avoid cropping. Affiliate product data does not guarantee seller inventory or variant-level SKU availability; unknown inventory is explicitly marked unknown rather than fabricated.

Set these variables in the Vercel project environment (Production and Preview as needed):

- `ALIEXPRESS_APP_KEY`: application key (the provided key is `5539608`).
- `ALIEXPRESS_APP_SECRET`: the secret from the AliExpress Open Platform app console. Keep it server-side; never use a `NEXT_PUBLIC_` prefix or commit the value.

The app must be approved for `aliexpress.affiliate.product.query` access. A successful code build does not verify API permissions or credentials. Vercel environment-variable access was not available to this update, so these values must be verified in the project settings before live product synchronization can succeed.
