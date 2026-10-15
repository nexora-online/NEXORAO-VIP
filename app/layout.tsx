import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "NEXORA — Exclusive Lifestyle • VIP Only", template: "%s | NEXORA VIP" },
  description: "Exklusive Produkte. Für besondere Menschen. Nur das Beste. Nur für Sie.",
  applicationName: "NEXORA VIP",
  keywords: ["NEXORA", "VIP Lifestyle", "Premium Mode", "Schmuck", "Beauty", "Accessoires", "Exklusive Auswahl"],
  openGraph: {
    title: "NEXORA — Exclusive Lifestyle • VIP Only",
    description: "Exklusive Produkte. Für besondere Menschen. Nur das Beste. Nur für Sie.",
    siteName: "NEXORA VIP",
    type: "website",
    locale: "de_DE",
  },
  twitter: {
    card: "summary",
    title: "NEXORA — Exclusive Lifestyle • VIP Only",
    description: "Exklusive Produkte. Für besondere Menschen. Nur das Beste. Nur für Sie.",
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body>{children}</body></html>; }