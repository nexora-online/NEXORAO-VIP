import "server-only";

/** Call from server startup/route modules that require these controls. */
export function assertSecurityEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  const required = ["NEXT_PUBLIC_SITE_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required security environment variables: ${missing.join(", ")}`);
  let site: URL;
  try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL!); } catch { throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTPS URL"); }
  if (site.protocol !== "https:") throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS");
  if (!["nexoraonline.de", "www.nexoraonline.de", "nexorao-vip-store.vercel.app"].includes(site.hostname)) {
    throw new Error("NEXT_PUBLIC_SITE_URL host is not in the approved production allowlist");
  }
}
