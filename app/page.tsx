"use client";

import { useEffect, useMemo, useState } from "react";

const storeLanguages = [
  { code: "DE", flag: "🇩🇪", name: "Deutsch" },
  { code: "EN", flag: "🇬🇧", name: "English" },
  { code: "FR", flag: "🇫🇷", name: "Français" },
  { code: "AR", flag: "🇸🇦", name: "العربية" },
  { code: "RU", flag: "🇷🇺", name: "Русский" },
  { code: "TR", flag: "🇹🇷", name: "Türkçe" },
  { code: "ES", flag: "🇪🇸", name: "Español" },
  { code: "IT", flag: "🇮🇹", name: "Italiano" },
  { code: "ZH", flag: "🇨🇳", name: "中文" },
  { code: "JA", flag: "🇯🇵", name: "日本語" },
];

const categories = [
  { name: "DAMEN", subtitle: "Eleganz für jeden Moment", image: "photo-1483985988355-763728e1935b" },
  { name: "HERREN", subtitle: "Zeitloser Stil", image: "photo-1617137968427-85924c800a22" },
  { name: "SCHMUCK & UHREN", subtitle: "Kostbare Details", image: "photo-1523170335258-f5ed11844a49" },
  { name: "BEAUTY", subtitle: "Rituale voller Luxus", image: "photo-1596462502278-27bfdc403348" },
  { name: "ACCESSOIRES", subtitle: "Das gewisse Etwas", image: "photo-1584917865442-de89df76afd3" },
  { name: "LIFESTYLE", subtitle: "Ein Leben mit Stil", image: "photo-1600210492486-724fe5c67fb0" },
];

type Product = { id: string; name: string; brand: string; category: string; price: number; image: string; tag: string; };
type CatalogResponse = { products?: Array<{ id: string; name: string; brand: string; category: string; price: number; image: string; supplier: string; available: boolean }>; source?: string; message?: string };

const products: Product[] = [];

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("DE");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activeLegal, setActiveLegal] = useState<string | null>(null);
  const [active, setActive] = useState("ALLE");
  const [cart, setCart] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setCatalogLoading(true);
    fetch("/api/catalog?limit=1000", { cache: "no-store" })
      .then(response => response.json())
      .then((data: CatalogResponse) => {
        if (!alive) return;
        const imported = (data.products ?? []).slice(0, 1000).map(p => ({ id: p.id, name: p.name, brand: p.brand || p.supplier, category: p.category || "LIFESTYLE", price: p.price, image: p.image, tag: "LIEFERANT" }));
        setSupplierProducts(imported);
        setCatalogMessage(data.source === "supplier-feed" ? `${imported.length} Lieferantenprodukte geladen` : data.message ?? "Lieferantenkatalog noch nicht verbunden");
      })
      .catch(() => { if (alive) setCatalogMessage("Lieferantenkatalog derzeit nicht erreichbar"); })
      .finally(() => { if (alive) setCatalogLoading(false); });
    return () => { alive = false; };
  }, [catalogAttempt]);
  const allProducts = useMemo(() => [...products, ...supplierProducts], [supplierProducts]);
  const imageUrl = (image: string, width = 800) => /^https?:\/\//i.test(image) ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;
  const cartProducts = [...new Set(cart)].map(id => { const product = allProducts.find(p => p.id === id); return product ? { ...product, quantity: cart.filter(cartId => cartId === id).length } : null; }).filter((p): p is Product & { quantity: number } => Boolean(p));
  const cartTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const filtered = useMemo(() => allProducts.filter(p => (active === "ALLE" || p.category === active) && (p.name + p.brand + p.category).toLowerCase().includes(search.toLowerCase())), [active, search, allProducts]);
  const money = (price: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(price);

  return <main>
    <div className="announcement">✦ EXCLUSIVE LIFESTYLE · VIP ONLY ✦ <span>Eine neue Welt der Eleganz</span></div>
    <header className="header">
      <div className="language-picker"><button className="language" aria-label="Sprache auswählen" aria-expanded={languageMenuOpen} onClick={() => setLanguageMenuOpen(open => !open)}>{storeLanguages.find(language => language.code === selectedLanguage)?.flag} {selectedLanguage}⌄</button>{languageMenuOpen && <div className="language-menu" role="listbox" aria-label="Shop-Sprache auswählen">{storeLanguages.map(language => <button type="button" role="option" aria-selected={selectedLanguage === language.code} className={selectedLanguage === language.code ? "language-option selected" : "language-option"} key={language.code} onClick={() => { setSelectedLanguage(language.code); setLanguageMenuOpen(false); setNotice(`${language.flag} ${language.name} ausgewählt. Die vollständige Übersetzung der Shop-Inhalte wird separat eingerichtet.`); }}><span className="language-flag">{language.flag}</span><span className="language-name">{language.name}</span><span className="language-code">{language.code}</span></button>)}</div>}</div>
      <label className="search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Luxus, Marken oder Kategorien..." /><span>⌕</span></label>
      <a className="brand" href="#" aria-label="NEXORA Startseite"><span className="crest">♛</span><span className="brand-name">NEXORA</span><small>EXCLUSIVE LIFESTYLE · VIP ONLY</small></a>
      <div className="actions"><button aria-label="Konto">♙</button><button aria-label="Favoriten anzeigen" onClick={() => { setActive("ALLE"); setSearch(""); setNotice(favorites.length ? `Sie haben ${favorites.length} Favorit(en) markiert.` : "Ihre Favoritenliste ist noch leer."); }}>{favorites.length ? "♥" : "♡"} <sup>{favorites.length}</sup></button><button aria-label="Warenkorb öffnen" onClick={() => setCartOpen(true)}>♧ <sup>{cart.length}</sup></button><button aria-label="Menü">☰</button></div>
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

    <section className="categories" id="kollektionen" aria-label="Kollektionen">{categories.map(c => <a className="category-card" key={c.name} href="#produkte" style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,.03) 75%),url(${imageUrl(c.image)})`}}><span className="vip-stamp">VIP</span><div><h2>{c.name}</h2><p>{c.subtitle}</p><span className="discover">JETZT ENTDECKEN ⟶</span></div></a>)}</section>

    <section className="product-section" id="produkte">
      <div className="section-heading"><span>CURATED FOR YOU</span><h2>Die Kunst des Besonderen</h2><p>Eine Auswahl mit Charakter. Für Momente, die bleiben.</p></div>
      <div className="filters"><button className={active === "ALLE" ? "selected" : ""} onClick={() => setActive("ALLE")}>ALLE</button>{categories.map(c => <button key={c.name} className={active === c.name ? "selected" : ""} onClick={() => setActive(c.name)}>{c.name}</button>)}</div>
      <div className="products">{filtered.map(p => <article className="product-card" key={p.id}><div className="product-image" style={{backgroundImage:`url(${imageUrl(p.image)})`}}><span className="product-tag">{p.tag}</span><button className="heart" aria-label="Zu Favoriten hinzufügen" onClick={() => setFavorites(old => old.includes(p.id) ? old.filter(id => id !== p.id) : [...old, p.id])}>{favorites.includes(p.id) ? "♥" : "♡"}</button></div><div className="product-info"><small>{p.brand}</small><h3>{p.name}</h3><div className="product-bottom"><strong>{money(p.price)}</strong><button onClick={() => setCart(old => [...old, p.id])}>IN DEN WARENKORB +</button></div></div></article>)}</div>
      {filtered.length === 0 && <div className="empty-catalog" role="status"><span className="empty-catalog-crown">♛</span><h3>{search ? "Keine passenden Produkte gefunden" : catalogLoading ? "Ihre VIP-Auswahl wird geladen" : "Die Kollektion wird vorbereitet"}</h3><p>{search ? "Bitte ändern Sie Ihre Suchbegriffe oder wählen Sie eine andere Kategorie." : catalogLoading ? "Der autorisierte Lieferantenkatalog wird abgefragt." : "Die Produktplätze sind vorbereitet. Echte Bilder, Produktdaten und Preise erscheinen nach der Verbindung zum Lieferanten."}</p>{!search && !catalogLoading && <button type="button" className="catalog-retry" onClick={() => setCatalogAttempt(value => value + 1)}>↻ Katalog erneut laden</button>}</div>}
      <p className="demo-note">{supplierProducts.length ? "Produktdaten und Preise werden aus dem verbundenen Lieferantenkatalog übernommen." : "Produktbilder und Preise erscheinen erst nach Verbindung des autorisierten Lieferantenkatalogs. Es werden keine Beispielprodukte oder erfundenen Preise angezeigt."}</p>
      {catalogMessage && <p className="catalog-status" role="status">{catalogMessage}</p>}
      {notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Hinweis schließen">×</button></div>}
    </section>

    <section className="benefits"><div><span>◇</span><strong>EXKLUSIVE AUSWAHL</strong><small>Mit Sorgfalt kuratiert</small></div><div><span>◎</span><strong>WELTWEITER VERSAND</strong><small>Details je nach Liefergebiet</small></div><div><span>♙</span><strong>SICHERER CHECKOUT</strong><small>Geschützte Zahlungsabwicklung</small></div><div><span>♧</span><strong>VIP SUPPORT</strong><small>Persönlich & diskret</small></div><div className="signature">Nexora<br/><i>For a life of elegance</i></div></section>
    {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Warenkorb" onClick={e => e.stopPropagation()}><div className="drawer-title"><div><small>NEXORA VIP</small><h2>Ihr Warenkorb</h2></div><button className="drawer-close" onClick={() => setCartOpen(false)} aria-label="Warenkorb schließen">×</button></div>{cartProducts.length === 0 ? <p className="cart-empty">Ihr Warenkorb ist noch leer.</p> : <div className="cart-items">{cartProducts.map(p => <div className="cart-item" key={p.id}><div className="cart-thumb" style={{backgroundImage:`url(${imageUrl(p.image, 200)})`}}/><div className="cart-item-copy"><strong>{p.name}</strong><small>{p.brand}</small><b>{money(p.price)} · Menge: {p.quantity}</b><div className="quantity-controls"><button type="button" aria-label={`${p.name} Menge verringern`} onClick={() => setCart(old => { const i = old.indexOf(p.id); return i < 0 ? old : [...old.slice(0,i), ...old.slice(i+1)]; })}>−</button><span>{p.quantity}</span><button type="button" aria-label={`${p.name} Menge erhöhen`} onClick={() => setCart(old => [...old, p.id])}>+</button></div></div><button className="remove-item" aria-label={`${p.name} entfernen`} onClick={() => setCart(old => old.filter(id => id !== p.id))}>×</button></div>)}</div>}<div className="cart-summary"><div><span>Zwischensumme</span><strong>{money(cartTotal)}</strong></div><small>Versandkosten und Steuern werden später anhand der Lieferadresse berechnet.</small><button className="gold-button checkout-button" disabled={!cart.length} onClick={() => setCheckoutOpen(true)}>BESTELLUNG PRÜFEN <span>⟶</span></button><p className="checkout-disclaimer">Der Shop befindet sich in der Vorschau. Es werden derzeit keine Zahlungen angenommen.</p></div></aside></div>}
    {checkoutOpen && <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={e => e.stopPropagation()}><button className="drawer-close modal-x" onClick={() => setCheckoutOpen(false)} aria-label="Dialog schließen">×</button><span className="modal-crown">♛</span><small>NEXORA VIP</small><h2 id="checkout-title">Bestellung prüfen</h2><p>Bitte kontrollieren Sie Artikel, Mengen und Gesamtbetrag. Die folgenden Felder zeigen den geplanten Bestellablauf; noch werden keine Bestellungen oder Zahlungen übermittelt.</p><div className="checkout-review">{cartProducts.map(p => <div key={p.id}><span>{p.name} × {p.quantity}</span><strong>{money(p.price * p.quantity)}</strong></div>)}</div><div className="checkout-total"><span>Zwischensumme</span><strong>{money(cartTotal)}</strong></div><div className="checkout-fields"><label>Vor- und Nachname<input autoComplete="name" placeholder="Name des Empfängers" /></label><label>E-Mail-Adresse<input type="email" autoComplete="email" placeholder="name@beispiel.de" /></label><label>Straße und Hausnummer<input autoComplete="street-address" placeholder="Straße und Hausnummer" /></label><label>Postleitzahl und Ort<input autoComplete="postal-code" placeholder="PLZ und Ort" /></label></div><fieldset className="checkout-payment"><legend>Gewünschte Zahlungsart</legend><label><input type="radio" name="payment-preview" value="bank" /> Banküberweisung</label><label><input type="radio" name="payment-preview" value="stripe" /> Stripe</label></fieldset><p className="checkout-disclaimer">Die Auswahl ist derzeit nur eine Vorschau. Es wird keine Bestellung angelegt, keine Zahlung ausgelöst und keine Kundendaten übertragen, bis Zahlungsanbieter, Bestellsystem und Sicherheitsprüfungen eingerichtet sind.</p><button className="gold-button" onClick={() => { setCheckoutOpen(false); setCartOpen(false); setNotice("Bestellablauf-Vorschau beendet. Noch wurde keine Bestellung oder Zahlung ausgelöst."); }}>SCHLIESSEN</button></section></div>}
    {activeLegal && <div className="nexora-legal-backdrop" onClick={() => setActiveLegal(null)}><section className="nexora-legal-modal" role="dialog" aria-modal="true" aria-labelledby="nexora-legal-title" onClick={event => event.stopPropagation()}><button className="nexora-legal-close" type="button" aria-label="Fenster schließen" onClick={() => setActiveLegal(null)}>×</button><div className="nexora-legal-crown">♛</div><div className="nexora-legal-brand">NEXORA</div><div className="nexora-legal-subtitle">EXCLUSIVE LIFESTYLE · VIP ONLY</div><div className="nexora-legal-ornament">✧ ───────── ❖ ───────── ✧</div><h2 id="nexora-legal-title">{({impressum:"Impressum",datenschutz:"Datenschutzerklärung",agb:"Allgemeine Geschäftsbedingungen",widerruf:"Widerruf & Rückgabe",versand:"Versand & Zahlung",kontakt:"Kontakt",faq:"Häufige Fragen",cookies:"Cookie-Einstellungen"} as Record<string,string>)[activeLegal] || "NEXORA VIP"}</h2><div className="nexora-legal-content">{activeLegal === "impressum" ? <><p><strong>Bitte vor dem Livegang rechtlich prüfen.</strong> Diese Angaben ersetzen keine Rechtsberatung. Ergänzen Sie nur Angaben, die Ihrem tatsächlichen rechtlichen Status entsprechen.</p><h3>Angaben gemäß § 5 DDG</h3><p><strong>Betreiber / Anbieter</strong><br/><span className="nexora-owner-signature"><span className="nexora-owner-name">Akhmed Ismail Saied</span><span className="nexora-owner-caption">Gründer · digital future</span></span><br/>digital future</p><p><strong>Anschrift</strong><br/>Ehndofer Str. 130<br/>24537 Neumünster<br/>Deutschland</p><p><strong>Kontakt</strong><br/>E-Mail: <a href="mailto:info@nexoraonline.de">info@nexoraonline.de</a></p><p><strong>Weitere Website</strong><br/><a href="https://www.digital-future.ai" target="_blank" rel="noreferrer">https://www.digital-future.ai</a></p><h3>Register- und Umsatzsteuerangaben</h3><p>Sofern zutreffend, sind die erforderlichen Register- und Umsatzsteuerangaben vor dem Livegang zu ergänzen.</p><h3>Inhaltlich verantwortlich</h3><p>Sofern gesetzlich erforderlich, sind Name und Anschrift der verantwortlichen Person zu ergänzen.</p><h3>Hinweis zur Plattform</h3><p>Die NEXORA-Website ist ein Online-Shop-Konzept. Angaben zu Produkten, Preisen, Lieferbarkeit und Marken müssen vor dem Verkaufsstart geprüft werden.</p></> : activeLegal === "kontakt" ? <><p>Wir freuen uns auf Ihre Nachricht.</p><p><strong>E-Mail</strong><br/><a href="mailto:info@nexoraonline.de">info@nexoraonline.de</a></p><p><strong>Unternehmen</strong><br/>digital future</p><p><a href="https://www.digital-future.ai" target="_blank" rel="noreferrer">www.digital-future.ai</a></p></> : activeLegal === "cookies" ? <><p>Die Cookie-Einstellungen für optionale Analyse- oder Marketing-Cookies müssen vor dem Livegang mit einer passenden Consent-Lösung verbunden werden.</p><p>Diese Vorschau speichert über dieses Fenster keine neue Cookie-Auswahl.</p></> : activeLegal === "datenschutz" ? <><p><strong>Bitte vor dem Livegang rechtlich prüfen.</strong></p><p>Die Datenschutzerklärung muss an die tatsächlich eingesetzten Hosting-, Shop-, Zahlungs-, Analyse- und Lieferantendienste angepasst werden.</p><p>Kontakt für Datenschutzanfragen: <a href="mailto:info@nexoraonline.de">info@nexoraonline.de</a></p><p>Unternehmenswebsite: <a href="https://www.digital-future.ai" target="_blank" rel="noreferrer">www.digital-future.ai</a></p></> : activeLegal === "agb" ? <><p>Die AGB sind vor dem Verkaufsstart rechtlich zu erstellen und zu prüfen. Insbesondere Bestellablauf, Preise, Zahlung, Lieferung, Eigentumsvorbehalt und Gewährleistung müssen zu den tatsächlichen Abläufen passen.</p><p>Bis dahin dient diese Seite nur der Vorschau; es werden keine verbindlichen Bestellungen angenommen.</p></> : activeLegal === "widerruf" ? <><p>Informationen zum Widerrufsrecht und ein gesetzeskonformes Muster-Widerrufsformular müssen vor dem Verkaufsstart passend zum tatsächlichen Geschäftsmodell ergänzt und geprüft werden.</p><p>Bitte vor dem Livegang rechtlich prüfen.</p></> : activeLegal === "versand" ? <><p>Liefergebiete, Lieferzeiten, Versandkosten und verfügbare Zahlungsarten werden veröffentlicht, sobald die tatsächlichen Lieferanten- und Zahlungsbedingungen bestätigt sind.</p><p>In dieser Vorschau werden keine Zahlungen angenommen.</p></> : <><p>Die häufigsten Fragen zu Produkten, Lieferung, Zahlung und Rückgabe werden ergänzt, sobald Lieferanten- und Bestellabläufe feststehen.</p><p>Kontakt: <a href="mailto:info@nexoraonline.de">info@nexoraonline.de</a></p></>}</div><div className="nexora-legal-bottom"><a href="https://www.digital-future.ai" target="_blank" rel="noreferrer">www.digital-future.ai</a><span>✦</span><a href="mailto:info@nexoraonline.de">info@nexoraonline.de</a></div></section></div>}
    <footer className="footer"><div className="footer-brand"><span>♛</span><strong>NEXORA</strong><small>A BRAND OF DIGITAL FUTURE</small></div><div className="footer-links">{[{id:"impressum",label:"Impressum"},{id:"datenschutz",label:"Datenschutz"},{id:"agb",label:"AGB"},{id:"widerruf",label:"Widerruf"},{id:"versand",label:"Versand & Zahlung"},{id:"kontakt",label:"Kontakt"},{id:"faq",label:"FAQ"}].map(item => <button type="button" key={item.id} onClick={() => setActiveLegal(item.id)}>{item.label}</button>)}<button type="button" onClick={() => setActiveLegal("cookies")}>Cookie settings</button></div><div className="footer-bottom">© 2026 NEXORA · Eine Marke von digital future · Alle Rechte vorbehalten.<br/><small>Vor dem Verkaufsstart sind rechtliche Angaben, Produktdaten und Zahlungsanbieter zu vervollständigen.</small></div></footer>
  </main>;
}
