# Payment readiness

Payment processing is deliberately not enabled in the current preview. To activate later:
1. Confirm business registration and the payment provider's onboarding requirements.
2. Add server-side credentials only through hosting environment variables.
3. Implement a server-created checkout session with trusted product prices.
4. Verify signed webhooks and handle duplicate events safely.
5. Persist orders and payment state before showing success.
6. Implement failure, cancellation, refund and customer-notification paths.
7. Test the complete flow in the provider's sandbox, then separately configure production.
8. Do not claim payments are active until a real production test has passed.