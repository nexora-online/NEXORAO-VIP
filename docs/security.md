# Security notes

- Supplier tokens and cron secrets must remain server-only environment variables.
- Catalog refresh endpoints require a bearer secret and fail closed when the secret is missing.
- Never trust browser-submitted prices or browser redirects as proof of payment.
- Restrict supplier URLs to the actual authorized endpoint; do not accept arbitrary user-supplied URLs.
- Do not log customer addresses, payment credentials or API tokens.
- Add rate limits, database access controls and audit logs before production checkout.