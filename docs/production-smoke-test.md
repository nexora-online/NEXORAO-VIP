# Production smoke test

1. Open the homepage on desktop and mobile.
2. Confirm the main NEXORA layout and luxury black/gold styling are unchanged.
3. Search for a term and verify the list filters.
4. Open the cart, add/remove an item and verify the total.
5. Confirm checkout clearly remains a preview and does not collect payment.
6. Visit every information route linked in the footer.
7. Open `/api/health`, `/api/catalog?limit=1000`, `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest`.
8. Confirm unavailable supplier feeds show a useful message and do not crash the page.
9. Check browser console and server logs for errors.
10. Verify the official domain and TLS certificate in Vercel before announcing launch.