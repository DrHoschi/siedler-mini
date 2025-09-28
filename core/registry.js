// ============================================================================
// Datei : core/registry.js
// Zweck : Lädt Gameplay-Daten (data/buildings.json) und stellt sie der UI bereit
// Events: cb:registry-ready (und Kompat: cb:registry:ready)
// API   : Registry.init(), Registry.get('buildings'|'categories'), Registry.byId(id)
// Hinweise:
//   • iconsBase wird mit trailing Slash normalisiert
//   • Kategorien werden aus buildings abgeleitet, falls im JSON nicht vorhanden
//   • Keine Abhängigkeit von Assets-Pfaden außer Bildreferenzen aus den JSONs
// ============================================================================

(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[registry]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[registry]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[registry]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const _data = {
    meta: { iconsBase: 'assets/ui/build/' },
    buildings: [],
    categories: []   // { id, label }
  };

  // Hilfsfunktionen -----------------------------------------------------------
  const ensureTrailingSlash = (s) => (!s ? '' : s.endsWith('/') ? s : (s + '/'));
  const uniqBy = (arr, keyFn) => {
    const seen = new Set(); const out = [];
    for (const x of arr) { const k = keyFn(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
    return out;
  };

  function deriveCategories(fromBuildings, providedCats) {
    if (Array.isArray(providedCats) && providedCats.length) {
      // Falls JSON Kategorien mitliefert, benutzen wir sie (id/label erwartet)
      return providedCats.map(c => ({ id: String(c.id), label: String(c.label ?? c.id) }));
    }
    // Sonst aus den Buildings ableiten (cat-Feld)
    const cats = fromBuildings
      .map(b => b.cat ?? 'misc')
      .map(id => ({ id: String(id), label: String(id) }));
    return uniqBy(cats, c => c.id);
  }

  function normalizeBuildings(json, iconsBase) {
    const base = ensureTrailingSlash(json.iconsBase || iconsBase || _data.meta.iconsBase);
    _data.meta.iconsBase = base;

    const list = Array.isArray(json.buildings) ? json.buildings : [];
    const norm = list.map(b => {
      const id    = String(b.id);
      const cat   = String(b.cat ?? 'misc');
      const label = String(b.label ?? id);
      // icon: entweder b.icon (relativ) oder b.sprite; wir leiten einen sinnvollen Pfad ab
      const icon  = (b.icon && !/^https?:|^\//i.test(b.icon)) ? (base + b.icon) : (b.icon || b.sprite || '');
      const cost  = b.cost ? { wood:+(b.cost.wood||0), stone:+(b.cost.stone||0), gold:+(b.cost.gold||0) } : undefined;
      return { ...b, id, cat, label, icon, cost };
    });
    return norm;
  }

  // Public API ----------------------------------------------------------------
  async function init() {
    try {
      // Hauptquelle: data/buildings.json (gemäß neuer Struktur)
      const res = await fetch('data/buildings.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von data/buildings.json`);
      const json = await res.json();

      // Normalisieren
      _data.buildings  = normalizeBuildings(json, _data.meta.iconsBase);
      _data.categories = deriveCategories(_data.buildings, json.categories);

      // Bereit
      log('bereit:', { buildings: _data.buildings.length, categories: _data.categories.length, iconsBase: _data.meta.iconsBase });
      const detail = { ok: true, data: { buildings: _data.buildings, categories: _data.categories, meta: _data.meta } };

      // Offizielles Event + Kompat-Alias
      EVT('cb:registry-ready', detail);
      EVT('cb:registry:ready', detail);
    } catch (e) {
      err('Fehler beim Initialisieren:', e);
      EVT('cb:registry-ready', { ok: false, error: String(e) });
    }
  }

  function get(key) {
    if (key === 'buildings')  return _data.buildings;
    if (key === 'categories') return _data.categories;
    if (key === 'meta')       return _data.meta;
    return undefined;
  }

  function byId(id) {
    const want = String(id);
    return _data.buildings.find(b => b.id === want);
  }

  // Export ins Window (keine globale STATE-Variable!)
  window.Registry = { init, get, byId };
})();
