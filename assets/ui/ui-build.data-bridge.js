<script>
/*!
 * UIBuild – Data Bridge v1.2.0
 * Holt Items aus der Registry, mappt sie auf feste Kategorien
 * und liefert ansonsten einen stabilen Fallback-Katalog.
 *
 * Erwartet:
 *   - window.BuildCategories  (aus assets/core/build.categories.js)
 *   - optional: window.Registry  (assets/core/registry.js)
 *   - window.UIBuild.setItems(items, categories)
 *
 * Liefert:
 *   - saubere Zuordnung & Reihenfolge ohne Endlosschleifen
 */

(function () {
  const logI = (window.CBLog?.info  || console.log).bind(console);
  const logW = (window.CBLog?.warn  || console.warn).bind(console);
  const logE = (window.CBLog?.error || console.error).bind(console);

  const CATS = (window.BuildCategories || []).slice();

  // ------------- Hilfsfunktionen ------------------------------------------------
  const img = (p) => p; // relative Pfade 1:1
  const asCard = (id, name, imgPath, catId, extra={}) => ({
    id, name, img: img(imgPath), category: catId, ...extra
  });

  // Map „alte/registry“-Kategorien -> neue feste Kategorien
  // (alles, was wir nicht kennen, fällt auf 'misc' und wird nicht gerendert)
  const CATEGORY_MAP = {
    // mögliche alte Namen:
    'verwaltung': 'admin',
    'allg': 'admin',
    'general': 'admin',

    'nahrung': 'food',
    'food': 'food',
    'produktion_nahrung': 'food',

    'rohstoffe': 'raw',
    'produktion_rohstoffe': 'raw',
    'resources': 'raw',

    'wohnen': 'housing',
    'housing': 'housing',

    'infrastruktur': 'infra',
    'infra': 'infra',
    'wege': 'infra',
    'straßen': 'infra',

    'landschaft': 'deco',
    'deko': 'deco',
    'terrain': 'deco',

    'militär': 'mil',
    'mil': 'mil'
  };

  // ------------- HARDCODED FALLBACK-KATALOG ------------------------------------
  // -> wird verwendet, wenn Registry fehlt oder unvollständig ist.
  // => Bilder: aus deiner Repo-Struktur (siehe file list).
  const FALLBACK = [
    // Allg./Verwaltung
    asCard('rathaus',   'Rathaus',   'assets/buildings/rathaus_wood1.png', 'admin'),
    asCard('depot',     'Depot',     'assets/buildings/depot_wood.png',    'admin'),
    // Wohnen
    asCard('wohnhaus',  'Wohnhaus',  'assets/buildings/wohnhaus_wood1_ug0.png', 'housing'),
    // Nahrung
    asCard('fischer',   'Fischer',   'assets/buildings/fischer_wood1.png', 'food'),
    asCard('farm',      'Farm',      'assets/buildings/farm_wood.png',     'food'),
    asCard('muehle',    'Mühle',     'assets/buildings/windmuehle_wood.png', 'food'),
    // Rohstoffe
    asCard('holzfaeller', 'Holzfäller', 'assets/buildings/lumberjack_wood.png', 'raw'),
    asCard('steinmetz',   'Steinmetz',  'assets/buildings/steinmetz_wood.png',  'raw'),
    asCard('schmied',     'Schmied',    'assets/buildings/schmied_wood0.png',   'raw'),
    // Infrastruktur (Roads)
    asCard('road_straight','Straße – gerade',   'assets/road_straight.png', 'infra', {kind:'road'}),
    asCard('road_curve',  'Straße – Kurve',     'assets/road_curve.png',    'infra', {kind:'road'}),
    asCard('road_cross',  'Straße – Kreuzung',  'assets/road.png',          'infra', {kind:'road'}),
    // Deko / Landschaft (Terrain-Placeholders)
    asCard('tile_meadow','Wiese',   'assets/grass.png', 'deco', {kind:'tile'}),
    asCard('tile_dirt',  'Erde',    'assets/dirt.png',  'deco', {kind:'tile'}),
    asCard('tile_sand',  'Sand',    'assets/sand.png',  'deco', {kind:'tile'}),
    asCard('tile_rock',  'Fels',    'assets/rocky.png', 'deco', {kind:'tile'}),
    asCard('tile_shore', 'Ufer',    'assets/shore.png', 'deco', {kind:'tile'}),
    asCard('tile_water', 'Wasser',  'assets/water.png', 'deco', {kind:'tile'}),
    // Militär (Platzhalter + echtes Gebäude)
    asCard('wachturm', 'Wachturm', 'assets/buildings/wachturm_wood.png', 'mil'),
  ];

  // ------------- Registry -> Normalisierung ------------------------------------
  function readFromRegistry() {
    // Registry-API ist bei dir sehr schlank; wir gehen tolerant vor.
    try {
      const R = window.Registry;
      if (!R) return null;

      // mögliche API-Formen:
      // - R.getBuildings() -> [{id,title,category,icon}, ...]
      // - R.getAll()       -> dto ähnlich
      const raw = (R.getBuildings?.() || R.getAll?.() || []).slice();
      if (!raw.length) return null;

      // auf unsere Kartenform bringen
      const mapped = raw.map(b => {
        // id/label/img
        const id    = b.id || b.key || b.name;
        const name  = b.title || b.label || id;
        const icon  = b.icon || b.img || b.sprite || `assets/placeholder64.PNG`;

        // Kategorie zuordnen
        let cat = (b.category || b.cat || '').toString().trim().toLowerCase();
        // evtl. bekannte Registry-Kürzel?
        cat = CATEGORY_MAP[cat] || cat;
        // falls Registry kategorisch zu grob ist → heuristische Zuordnung
        if (!CATS.find(c => c.id === cat)) {
          if (/wohn/i.test(name)) cat = 'housing';
          else if (/fisch|farm|m(ü|ue)hle/i.test(name)) cat = 'food';
          else if (/holz|stein|schmied|lumber|stone/i.test(name)) cat = 'raw';
          else if (/weg|road|straße/i.test(name)) cat = 'infra';
          else if (/turm|wacht/i.test(name)) cat = 'mil';
          else if (/rathaus|depot|hq|verwaltung/i.test(name)) cat = 'admin';
          else cat = 'deco';
        }

        return asCard(id, name, icon, cat, { kind: b.kind || 'building' });
      });

      // Damit nichts fehlt: Fallback ergänzen (ohne Duplikate)
      const have = new Set(mapped.map(m => m.id));
      FALLBACK.forEach(fb => { if (!have.has(fb.id)) mapped.push(fb); });

      return mapped;
    } catch (e) {
      logW('[ui-build.bridge] Registry-Lesen fehlgeschlagen – nutze Fallback.', e);
      return null;
    }
  }

  // ------------- Zusammenstellen & an UI liefern -------------------------------
  function assembleCatalog() {
    const items = readFromRegistry() || FALLBACK.slice();

    // Reihenfolge: erst nach unserer festen Kategorie-Reihenfolge gruppieren,
    // innerhalb einer Kategorie dann nach Name.
    const catIndex = Object.fromEntries(CATS.map((c,i)=>[c.id,i]));
    items.sort((a,b)=>{
      const ca = catIndex[a.category] ?? 999;
      const cb = catIndex[b.category] ?? 999;
      return ca!==cb ? ca-cb : a.name.localeCompare(b.name,'de');
    });

    return { items, categories: CATS };
  }

  function deliverToUI() {
    const { items, categories } = assembleCatalog();

    // bevorzugter Weg
    if (window.UIBuild?.setItems) {
      window.UIBuild.setItems(items, categories);
      logI(`[ui-build.bridge] Items gesetzt (${items.length} / ${categories.length})`);
      return;
    }
    // spätes Laden / Legacy: wir versuchen es erneut, aber ohne Spam
    let tries = 0, maxTries = 20;
    const t = setInterval(()=>{
      tries++;
      if (window.UIBuild?.setItems) {
        clearInterval(t);
        window.UIBuild.setItems(items, categories);
        logI(`[ui-build.bridge] Items gesetzt (spät) (${items.length} / ${categories.length})`);
      }
      if (tries>=maxTries) clearInterval(t);
    }, 150);
  }

  // beim DOM-Ready bzw. wenn ui-build fertig ist
  // (du loggst „[index] ui-build ready event fired“ – das unterstützen wir)
  function onReady() { try { deliverToUI(); } catch(e){ logE(e);} }

  document.addEventListener('DOMContentLoaded', onReady);
  window.addEventListener('cb:ui-build-ready', onReady);  // eigenes Ready-Signal
  window.addEventListener('ui-build:ready', onReady);     // kompatibles Signal

})();
</script>
