"use client";

import { useMemo, useState } from "react";

const categories = [
  { name: "DAMEN", subtitle: "Eleganz für jeden Moment", image: "photo-1483985988355-763728e1935b" },
  { name: "HERREN", subtitle: "Zeitloser Stil", image: "photo-1617137968427-85924c800a22" },
  { name: "SCHMUCK & UHREN", subtitle: "Kostbare Details", image: "photo-1523170335258-f5ed11844a49" },
  { name: "BEAUTY", subtitle: "Rituale voller Luxus", image: "photo-1596462502278-27bfdc403348" },
  { name: "ACCESSOIRES", subtitle: "Das gewisse Etwas", image: "photo-1584917865442-de89df76afd3" },
  { name: "LIFESTYLE", subtitle: "Ein Leben mit Stil", image: "photo-1600210492486-724fe5c67fb0" },
];

const products = [
  { id: 1, name: "Abendtasche Noir", brand: "NEXORA EDITION", category: "ACCESSOIRES", price: 129, image: "photo-1584917865442-de89df76afd3", tag: "VIP SELECTION" },
  { id: 2, name: "Goldene Chronograph-Uhr", brand: "TIMELESS", category: "SCHMUCK & UHREN", price: 249, image: "photo-1523170335258-f5ed11844a49", tag: "EXCLUSIVE" },
  { id: 3, name: "Signature Parfum", brand: "MAISON PRIVÉE", category: "BEAUTY", price: 89, image: "photo-1541643600914-78b084683601", tag: "VIP SELECTION" },
  { id: 4, name: "Abendkleid Noir", brand: "NEXORA EDITION", category: "DAMEN", price: 219, image: "photo-1566174053879-31528523f8ae", tag: "LIMITED" },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("ALLE");
  const [cart, setCart] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const filtered = useMemo(() => products.filter(p => (active === "ALLE" || p.category === active) && (p.name + p.brand + p.category).toLowerCase().includes(search.toLowerCase())), [active, search]);
  const money = (price: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(price);

  return <main>
    <div className="announcement">✦ EXCLUSIVE LIFESTYLE · VIP ONLY ✦ <span>Eine neue Welt der Eleganz</span></div>
    <header className="header">
      <button className="language" aria-label="Sprache auswählen">🇩🇪 DE⌄</button>
      <label className="search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Luxus, Marken oder Kategorien..." /><span>⌕</span></label>
      <a className="brand" href="#" aria-label="NEXORA Startseite"><span className="crest">♛</span><span className="brand-name">NEXORA</span><small>EXCLUSIVE LIFESTYLE · VIP ONLY</small></a>
      <div className="actions"><button aria-label="Konto">♙</button><button aria-label="Favoriten">♡ <sup>{favorites.length}</sup></button><button aria-label="Warenkorb">♧ <sup>{cart.length}</sup></button><button aria-label="Menü">☰</button></div>
    </header>
    <nav className="nav">{["HOME","DAMEN","HERREN","SCHMUCK & UHREN","BEAUTY","ACCESSOIRES","LIFESTYLE","VIP"].map(n => <a key={n} href={n === "VIP" ? "#vip" : n === "HOME" ? "#" : "#kollektionen"}>{n}</a>)}</nav>

    <section className="hero">
      <div className="hero-image" />
      <div className="hero-copy">
        <div className="ornament">♛ ───────── ✧ ───────── ♛</div>
        <div className="hero-kicker">N E X O R A</div>
        <h1><em>More Than Shopping</em><br/>IT’S A LIFESTYLE</h1>
        <p>Exklusive Produkte. Für besondere Menschen.<br/><i>Nur das Beste. Nur für Sie.</i></p>
        <a className="gold-button" href="#kollektionen">VIP ENTDECKEN <span>⟶</span></a>
      </div>
      <aside className="vip-panel" id="vip">
        <div className="vip-heading"><span>♛</span><div><strong>VIP ONLY</strong><small>Exklusiver Zugang</small></div></div>
        <div className="vip-heading"><span>◇</span><div><strong>Premium Qualität</strong><small>Sorgfältig ausgewählte Produkte</small></div></div>
        <div className="vip-heading"><span>♧</span><div><strong>Diskreter Versand</strong><small>Sicher & zuverlässig</small></div></div>
        <div className="vip-heading"><span>♢</span><div><strong>Originalität zählt</strong><small>Markenware nach Prüfung</small></div></div>
      </aside>
    </section>

    <section className="categories" id="kollektionen" aria-label="Kollektionen">{categories.map(c => <a className="category-card" key={c.name} href="#produkte" style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,.03) 75%),url(https://images.unsplash.com/${c.image}?auto=format&fit=crop&w=800&q=85)`}}><span className="vip-stamp">VIP</span><div><h2>{c.name}</h2><p>{c.subtitle}</p><span className="discover">JETZT ENTDECKEN ⟶</span></div></a>)}</section>

    <section className="product-section" id="produkte">
      <div className="section-heading"><span>CURATED FOR YOU</span><h2>Die Kunst des Besonderen</h2><p>Eine Auswahl mit Charakter. Für Momente, die bleiben.</p></div>
      <div className="filters"><button className={active === "ALLE" ? "selected" : ""} onClick={() => setActive("ALLE")}>ALLE</button>{categories.map(c => <button key={c.name} className={active === c.name ? "selected" : ""} onClick={() => setActive(c.name)}>{c.name}</button>)}</div>
      <div className="products">{filtered.map(p => <article className="product-card" key={p.id}><div className="product-image" style={{backgroundImage:`url(https://images.unsplash.com/${p.image}?auto=format&fit=crop&w=800&q=85)`}}><span className="product-tag">{p.tag}</span><button className="heart" aria-label="Zu Favoriten hinzufügen" onClick={() => setFavorites(old => old.includes(p.id) ? old.filter(id => id !== p.id) : [...old, p.id])}>{favorites.includes(p.id) ? "♥" : "♡"}</button></div><div className="product-info"><small>{p.brand}</small><h3>{p.name}</h3><div className="product-bottom"><strong>{money(p.price)}</strong><button onClick={() => setCart(old => [...old, p.id])}>IN DEN WARENKORB +</button></div></div></article>)}</div>
      {filtered.length === 0 && <p className="empty">Keine Produkte gefunden. Bitte ändern Sie Ihre Suche.</p>}
      <p className="demo-note">Produktdarstellung zur Gestaltungsvorschau · Preise und Artikel sind Beispiele, noch nicht käuflich.</p>
    </section>

    <section className="benefits"><div><span>◇</span><strong>EXKLUSIVE AUSWAHL</strong><small>Mit Sorgfalt kuratiert</small></div><div><span>◎</span><strong>WELTWEITER VERSAND</strong><small>Details je nach Liefergebiet</small></div><div><span>♙</span><strong>SICHERER CHECKOUT</strong><small>Geschützte Zahlungsabwicklung</small></div><div><span>♧</span><strong>VIP SUPPORT</strong><small>Persönlich & diskret</small></div><div className="signature">Nexora<br/><i>For a life of elegance</i></div></section>
    <footer className="footer"><div className="footer-brand"><span>♛</span><strong>NEXORA</strong><small>A BRAND OF DIGITAL FUTURE</small></div><div className="footer-links"><a href="#impressum">Impressum</a><a href="#datenschutz">Datenschutz</a><a href="#agb">AGB</a><a href="#widerruf">Widerruf & Rückgabe</a><a href="#versand">Versand & Zahlung</a><a href="#kontakt">Kontakt</a></div><div className="footer-bottom">© 2026 NEXORA · Eine Marke von digital future · Alle Rechte vorbehalten.<br/><small>Vor dem Verkaufsstart sind rechtliche Angaben, Produktdaten und Zahlungsanbieter zu vervollständigen.</small></div></footer>
  </main>;
}
