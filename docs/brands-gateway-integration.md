# BrandsGateway integration plan

BrandsGateway is the first supplier candidate for the premium fashion catalog. This repository currently provides a generic feed adapter, not a confirmed BrandsGateway API implementation. Before coding vendor-specific calls, obtain the merchant account's current API documentation, endpoint base URL, authentication scheme, product pagination rules, stock/price semantics, order submission endpoint, cancellation rules and shipment tracking API.

Keep the adapter isolated under `lib/suppliers/`. Do not guess endpoints, do not commit API credentials, and do not claim automatic order placement until a real test order is accepted by the supplier.