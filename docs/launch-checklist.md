# NEXORA launch checklist

## Before accepting orders
- [ ] Confirm the legal business operator and publish complete Impressum details.
- [ ] Have the privacy notice, terms, withdrawal information and returns process reviewed for the actual setup.
- [ ] Confirm the official domain and HTTPS behavior in production.
- [ ] Connect and test the real supplier feed; verify stock, variants, prices and image rights.
- [ ] Configure persistent product/order storage and inventory synchronization.
- [ ] Connect a payment provider using production credentials; verify webhook signatures and idempotency.
- [ ] Configure order confirmation emails, cancellation/refund workflows and support contact.
- [ ] Test mobile layouts, keyboard navigation, empty/error states and German formatting.
- [ ] Run a clean production build and verify every route.
- [ ] Remove preview-only language only when each corresponding capability is truly ready.

## Current limitation
The current storefront is a preview. It does not create orders or collect money. Supplier and payment credentials are not embedded in source code.