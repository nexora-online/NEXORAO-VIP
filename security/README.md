# NEXORA VIP security hardening

This repository's production application is Next.js 14.2.31. These controls are defensive layers, not a claim of zero vulnerabilities.

## Added
- Root `middleware.ts`: security headers, origin allowlist for browser API calls, and distributed IP rate limiting via Upstash Redis REST.
- `lib/security/validation.ts`: Zod schemas and bounded JSON parsing.
- `lib/security/passwords.ts`: bcryptjs password hash/verify and secure cookie options for a server-side session.
- `lib/security/env.ts`: production configuration checks.
- Existing `app/api/stripe-webhook/route.ts` already verifies Stripe signatures against the raw body with a timestamp tolerance and timing-safe comparison. Preserve that behavior.

## Required deployment configuration
Set server-side environment variables in the deployment dashboard, never commit their values:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SITE_URL=https://www.nexoraonline.de` (or the canonical domain actually configured)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (only when Stripe is configured)
- `BCRYPT_COST=12` (benchmark on target runtime)
- `DATABASE_URL` only if/when PostgreSQL is actually connected; use TLS and a least-privilege DB role.

## Important integration requirements
1. Add `zod`, `bcryptjs`, and `server-only` dependencies (Next.js projects commonly already resolve `server-only`; verify lock/build).
2. Apply `parseJson` and strict schemas inside each mutating API route; the middleware does not validate business payloads.
3. Use an ORM or parameterized SQL for all database access. Never interpolate user-controlled SQL identifiers or values.
4. The existing project does not currently show a PostgreSQL ORM/schema or an implemented password-auth route. Password helpers are not authentication by themselves; integrate them with a maintained session store and rotate opaque session IDs.
5. The current Stripe webhook's supplier fulfillment is not transactionally idempotent in PostgreSQL. Before enabling live fulfillment, persist event IDs under a unique constraint and make order creation + event handling idempotent; return 2xx only after durable acceptance.
6. Configure hosting/WAF DDoS controls in front of the app. Application rate limiting is not a substitute for network-layer DDoS protection.
7. Test CSP against product image hosts and payment redirects in staging. The policy retains `unsafe-inline` for compatibility with the current Next.js app; migrate to nonce-based CSP before removing it.
8. TLS in transit and encryption at rest must be enabled at the hosting, database, backup, and object-storage layers. Do not invent app-level encryption for data that the platform does not store.
9. Run `npm audit`, build, and security tests after dependency installation. A code commit alone does not prove deployment or runtime protection.
