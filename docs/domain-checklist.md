# Official domain checklist

- [ ] Confirm `nexoraonline.de` is attached to the intended Vercel project.
- [ ] Confirm apex and `www` behavior and select one canonical hostname.
- [ ] Verify DNS records at the registrar without overwriting unrelated records.
- [ ] Confirm HTTPS certificate is valid.
- [ ] Check redirect behavior from the non-canonical hostname.
- [ ] Confirm sitemap and robots URLs use the chosen canonical host.
- [ ] Check production deployment status and open the production domain directly.
- [ ] Do not treat a successful GitHub Actions build as proof that domain routing is complete.