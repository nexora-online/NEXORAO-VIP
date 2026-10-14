# Catalog field mapping

| Field | Required | Notes |
|---|---|---|
| id | yes | Stable supplier SKU or product ID |
| name/title | yes | Product display name |
| price | yes | Numeric supplier or storefront price; confirm meaning with supplier |
| imageUrl/image | yes | HTTPS product image URL |
| brand | no | Falls back to supplier hostname |
| category | no | Falls back to LIFESTYLE |
| currency | no | Defaults to EUR; verify supplier currency conversion rules |
| available | no | False products are excluded from display |
| stock | no | Optional non-negative inventory count |

Before production, clarify whether feed price is wholesale cost or retail price. Do not expose wholesale cost directly to customers; a pricing/margin rule must be approved and implemented first.