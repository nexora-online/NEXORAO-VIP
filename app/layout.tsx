import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NEXORA — Exclusive Lifestyle • VIP Only", description: "Exklusive Produkte. Für besondere Menschen. Nur das Beste. Nur für Sie.", applicationName: "NEXORA VIP" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body>{children}</body></html>; }