"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SupplierProduct = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  image: string;
  supplier?: string;
  available?: boolean;
};

type CatalogResponse = {
  products?: SupplierProduct[];
  message?: string;
  source?: string;
};

const categories = ["ALLE", "DAMEN", "HERREN", "SCHMUCK & UHREN", "BEAUTY", "ACCESSOIRES", "LIFESTYLE"];

export default function CollectionsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [category, setCategory] = useState("ALLE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Der Lieferantenkatalog wird geladen …");
  const [attempt, setAttempt] = useState(0);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setMessage("Der Lieferantenkatalog wird geladen …");
    try {
      const response = await fetch("/api/catalog?limit=1000", { cache: "no-store" });
      const data = (await response.json()) as CatalogResponse;
      if (!response.ok) throw new Error(data.message || "Der Katalog ist momentan nicht verfügbar.");
      const safeProducts = (Array.isArray(data.products) ? data.products : [])
        .slice(0, 1000)
        .filter((p) => p && typeof p.id === "string" && p.name && Number.isFinite(Number(p.price)) && Number(p.price) >= 0 && typeof p.image === "string" && /^https:\/\//i.test(p.image))
        .map((p) => ({ ...p, price: Number(p.price) }));
      setProducts(safeProducts);
      setMessage(safeProducts.length
        ? `${safeProducts.length} verfügbare Produkte`
        : data.message || "Der automatische Lieferantenimport ist vorbereitet. Sobald die autorisierte Lieferanten-Schnittstelle eingerichtet ist, erscheinen hier bis zu 1.000 Produkte.");
    } catch (error) {
      setProducts([]);
      setMessage(error instanceof Error ? error.message : "Der Katalog konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog, attempt]);

  const filtered = useMemo(() => products.filter(p =>
    (category === "ALLE" || (p.category || "LIFESTYLE").toUpperCase() === category) &&
    [p.name, p.brand || p.supplier || "", p.category || ""].join(" ").toLocaleLowerCase("de").includes(search.toLocaleLowerCase("de"))
  ), [products, category, search]);

  const money = (price: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);

  return <main className="collection-page">
    <header className="collection-header">
      <a className="collection-brand" href="/" aria-label="Zur NEXORA Startseite"><span>♛</span><strong>NEXORA</strong><small>EXCLUSIVE LIFESTYLE · VIP ONLY</small></a>
      <a className="collection-home" href="/">⌂ Zur Startseite</a>
    </header>
    <section className="collection-hero">
      <span className="collection-ornament">✦ ───────── ♛ ───────── ✦</span>
      <p className="collection-kicker">N E X O R A · V I P C O L L E C T I O N</p>
      <h1>Die Kunst des Besonderen</h1>
      <p>Eine Welt aus Eleganz, Romantik und zeitlosem Luxus – sorgfältig für Sie kuratiert.</p>
      <div className="collection-divider">✧ ❖ ✧</div>
    </section>
    <section className="collection-catalog" aria-label="Produktkatalog">
      <div className="collection-toolbar">
        <label className="collection-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Produkte, Marken oder Kategorien suchen …" /></label>
        <div className="collection-catalog-actions">
          <span className="collection-count" role="status">{loading ? "Katalog wird geladen …" : `${filtered.length} von ${products.length} Produkten`}</span>
          <button type="button" className="collection-refresh" onClick={() => setAttempt(value => value + 1)} disabled={loading}>{loading ? "Wird geladen …" : "↻ Katalog aktualisieren"}</button>
        </div>
      </div>
      <div className="collection-filters" aria-label="Kategorien">{categories.map(item =>
        <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
      )}</div>
      {filtered.length > 0 ? <div className="collection-grid">{filtered.slice(0, 1000).map((p, index) =>
        <article className="collection-product" key={p.id}>
          <div className="collection-product-image" style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,rgba(0,0,0,.5)),url("${p.image}")` }}>
            <span className="collection-vip-stamp">VIP</span><span className="collection-product-number">{String(index + 1).padStart(3, "0")}</span>
          </div>
          <div className="collection-product-info"><small>{p.brand || p.supplier || "NEXORA SELECTION"}</small><h2>{p.name}</h2><p>{p.category || "LIFESTYLE"}</p><strong>{money(p.price)}</strong><span className="collection-product-rule">✧ ───── ✧</span></div>
        </article>
      )}</div> : <div className="collection-empty"><span>♛</span><h2>{loading ? "Willkommen in unserer VIP-Kollektion" : search ? "Keine passenden Produkte gefunden" : "Ihre Auswahl wird vorbereitet"}</h2><p>{message}</p><small>Bis zu 1.000 Produkte werden angezeigt, sobald der autorisierte Lieferantenfeed verbunden ist. Es werden keine Produkte oder Preise erfunden.</small><button type="button" className="collection-refresh" onClick={() => setAttempt(value => value + 1)} disabled={loading}>{loading ? "Wird geladen …" : "↻ Erneut versuchen"}</button></div>}
      {filtered.length > 0 && <p className="collection-status">{message}. Maximal 1.000 Produkte werden in dieser Ansicht angezeigt.</p>}
    </section>
    <footer className="collection-footer"><span>♛ NEXORA</span><p>For a life of elegance · Exclusive lifestyle · VIP only</p><a href="/">Zurück zur Startseite</a></footer>
  </main>;
}
