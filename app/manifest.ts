import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {name: "NEXORA — Exclusive Lifestyle", short_name: "NEXORA", description: "NEXORA Exclusive Lifestyle · VIP Only", start_url: "/", display: "standalone", background_color: "#090909", theme_color: "#090909", lang: "de"};
}