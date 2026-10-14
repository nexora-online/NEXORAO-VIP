# Security basics

- Never commit supplier tokens, payment secrets, database credentials or private keys.
- Keep secrets in the hosting provider's encrypted environment variables.
- Validate supplier-feed input at the server boundary; do not trust remote product descriptions or image URLs.
- Verify payment webhook signatures before changing payment/order state.
- Make order creation idempotent and store order state persistently before sending confirmations.
- Rate-limit public endpoints that can trigger expensive operations.
- Avoid collecting personal or payment data until the relevant flows and notices are ready.
- Treat the current checkout as a non-functional preview, not a payment integration.