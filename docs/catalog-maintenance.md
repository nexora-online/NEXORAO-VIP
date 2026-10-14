# Catalog maintenance

Catalog imports are limited to 1,000 records per request. Validate supplier identifiers, non-negative numeric prices, currency, image URLs and availability. Do not overwrite a valid catalog with an empty or malformed response. For large catalogs, add provider-specific pagination and store normalized records in a database before enabling scheduled refreshes.