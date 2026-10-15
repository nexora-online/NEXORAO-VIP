export type PreviewProduct = {
  id: string;
  name: string;
  brand: string;
  category: "DAMEN" | "HERREN" | "SCHMUCK & UHREN" | "BEAUTY" | "ACCESSOIRES" | "LIFESTYLE";
  price: number;
  currency: "EUR";
  imageUrl: string;
  available: null;
  luxuryTag: "simulated";
};

export const FALLBACK_PRODUCTS: PreviewProduct[] = [
  { id: "preview-women-dress", name: "Demo — Elegantes Abendkleid", brand: "NEXORA Preview", category: "DAMEN", price: 89, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-women-bag", name: "Demo — Klassische Designer-Handtasche", brand: "NEXORA Preview", category: "DAMEN", price: 119, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-men-jacket", name: "Demo — Elegante Herrenjacke", brand: "NEXORA Preview", category: "HERREN", price: 149, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-men-shirt", name: "Demo — Klassisches Herrenhemd", brand: "NEXORA Preview", category: "HERREN", price: 59, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-watch", name: "Demo — Minimalistische Armbanduhr", brand: "NEXORA Preview", category: "SCHMUCK & UHREN", price: 79, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-beauty", name: "Demo — Skincare Geschenkset", brand: "NEXORA Preview", category: "BEAUTY", price: 35, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-perfume", name: "Demo — Duftkollektion", brand: "NEXORA Preview", category: "BEAUTY", price: 59, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-lingerie", name: "Demo — Lingerie Kollektion", brand: "NEXORA Preview", category: "DAMEN", price: 39, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1566479179817-c0c0f9f5a4a5?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-sunglasses", name: "Demo — Sonnenbrille", brand: "NEXORA Preview", category: "ACCESSOIRES", price: 29, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" },
  { id: "preview-lifestyle", name: "Demo — Wohnaccessoire", brand: "NEXORA Preview", category: "LIFESTYLE", price: 25, currency: "EUR", imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80", available: null, luxuryTag: "simulated" }
];
