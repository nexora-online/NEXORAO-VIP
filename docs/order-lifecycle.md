# Order Lifecycle Plan

Planned states: draft, pending_payment, paid, processing, shipped, delivered, cancelled, refund_pending, refunded. Every transition must be server-validated and auditable. Never mark an order paid based solely on a browser redirect.
