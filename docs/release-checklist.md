# Release checklist

- [ ] GitHub Actions production build passes.
- [ ] Production domain points to the intended Vercel project.
- [ ] Supplier credentials are issued to the store owner and stored as server-only environment variables.
- [ ] Supplier feed pagination and rate limits are handled.
- [ ] Product price, stock and image validation is tested.
- [ ] Database migrations and backups are configured before storing customer orders.
- [ ] Payment webhooks are signature-verified and idempotent.
- [ ] Supplier order dispatch is idempotent and retry-safe.
- [ ] Returns, refunds, shipping, taxes, privacy and legal pages are reviewed.
- [ ] Live payments are enabled only after end-to-end tests.