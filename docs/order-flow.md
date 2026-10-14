# Planned order flow

1. Payment provider confirms payment via a verified webhook.
2. Server retrieves the saved order and re-checks product availability and price.
3. Server submits the order to the supplier using the supplier's authenticated order API and an idempotency key.
4. Supplier order reference and shipment tracking are saved to the order record.
5. Customer receives status updates.

Never trust a browser redirect as proof of payment. Never submit a supplier order twice for the same paid order. The current repository does not yet have persistent order storage or a verified payment webhook, so live dispatch remains disabled.