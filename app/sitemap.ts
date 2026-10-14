import type { MetadataRoute } from "next";

const baseUrl = "https://nexoraonline.de";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "", "/impressum", "/datenschutz", "/agb", "/widerruf", "/versand",
    "/kontakt", "/zahlung", "/faq", "/ueber-uns", "/kollektionen", "/vip",
  ];
  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.4,
  }));
}