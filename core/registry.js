// ============================================================================
// Datei : core/registry.js
// Projekt: Neue Siedler
// Version: v1.2.0
// Zweck : Zentrale Daten-Drehscheibe (Gebäude, Kategorien, Meta)
//          • Liest data/buildings.json
//          • Normalisiert Felder (id, label, cat, icon, cost, size, entrances)
//          • Stellt Komfort-APIs bereit: get(), byId(), getBuildingDef()
// Events: cb:registry-ready (Kompat: cb:registry:ready)
// Hinweise: Vorgaben vgl. Lastenheft Kap. 3 & 6 + Registry-Patch. 
//           (IDs eindeutig, Editor/Inspector nutzen Registry-Daten)
// ============================================================================

(() => {
  // -------------------------------------
  // Konstanten & Logging
  // -------------------------------------
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[registry]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[registry]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[registry]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // Globale Meta + Cache
  const _data = {
    meta: { iconsBase: 'assets/ui/build/' },
    buildings: [],       // normalisierte Einträge aus JSON
    categories: []       // { id, label }
  };

  // -------------------------------------
  // Hilfsfunktionen
  // -------------------------------------
  const ensureTrailingSlash = (s) => (!s ? '' : s.endsWith('/') ? s : (s + '/'));
  const uniqBy = (arr, keyFn) => {
    const seen = new Set(); const out = [];
    for (const x of arr) { const k = keyFn(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
    return out;
  };
  const isNum = (n) => Number.isFinite(n);
  const asInt = (n, d=0) => (isNum(+n) ? (+n|0) : d);

  function deriveCategories(fromBuildings, providedCats) {
    if (Array.isArray(providedCats) && providedCats.length) {
      return providedCats.map(c => ({ id: String(c.id), label: String(c.label ?? c.id) }));
    }
    const cats = fromBuildings
      .map(b => b.cat ?? 'misc')
      .map(id => ({ id: String(id), label: String(id) }));
    return uniqBy(cats, c => c.id);
  }

  // Normalisiert Kosten-Objekt
  function normCost(cost) {
    if (!cost || typeof cost !== 'object') return undefined;
    return {
      wood : asInt(cost.wood, 0),
      stone: asInt(cost.stone, 0),
      gold : asInt(cost.gold, 0)
    };
  }

  // Normalisiert Größe (Tiles) → [w,h], mind. [1,1]
  function normSize(size) {
    if (Array.isArray(size) && size.length === 2) {
      const w = Math.max(1, asInt(size[0], 1));
      const h = Math.max(1, asInt(size[1], 1));
      return [w, h];
    }
    if (Number.isFinite(size)) {    // falls mal als Zahl angegeben wurde
      const s = Math.max(1, asInt(size, 1));
      return [s, s];
    }
    return [1, 1];
  }

  // Normalisiert entrances → Array<[x,y]>
  function normEntrances(ent) {
    if (!Array.isArray(ent)) return [];
    const out = [];
    for (const e of ent) {
      if (Array.isArray(e) && e.length === 2) {
        const x = asInt(e[0], 0);
        const y = asInt(e[1], 0);
        out.push([x, y]);
      } else {
        warn('Überspringe ungültigen entrance-Eintrag:', e);
      }
    }
    return out;
  }

  // Normalisiert Buildings inkl. size/entrances/icon
  function normalizeBuildings(json, iconsBase) {
    const base = ensureTrailingSlash(json.iconsBase || iconsBase || _data.meta.iconsBase);
    _data.meta.iconsBase = base;

    const list = Array.isArray(json.buildings) ? json.buildings : [];
    const norm = list.map(b => {
      const id      = String(b.id);
      const cat     = String(b.cat ?? 'misc');
      const label   = String(b.label ?? id);
      const icon    = (b.icon && !/^https?:|^\//i.test(b.icon)) ? (base + b.icon) : (b.icon || b.sprite || '');
      const cost    = normCost(b.cost);
      const size    = normSize(b.size);
      const doors   = normEntrances(b.entrances);
      const sprite  = b.sprite ? String(b.sprite) : ''; // optional, kann getrennt gepflegt werden

      // Sanfter Check: Türen im Rahmen der Größe?
      for (const [dx, dy] of doors) {
        if (dx < 0 || dy < 0 || dx > (size[0]) || dy > (size[1] + 1)) {
          // Hinweis: dy==h ist „unterer Rand“ ok, wenn Tür vor dem Gebäude am „Boden“ liegt
          warn(`Türkoordinate scheint außerhalb zu liegen (id=${id} size=${size} door=[${dx},${dy}])`);
          break;
        }
      }

      return { ...b, id, cat, label, icon, cost, size, entrances: doors, sprite };
    });
    return norm;
  }

  // Liefert ein „vollständiges“ Building-Def mit Defaults
  function composeBuildingDef(raw) {
    if (!raw) return null;
    return {
      id: raw.id,
      label: raw.label,
      cat: raw.cat,
      icon: raw.icon || '',
      sprite: raw.sprite || '',
      cost: raw.cost || { wood:0, stone:0, gold:0 },
      size: Array.isArray(raw.size) ? raw.size : [1,1],
      entrances: Array.isArray(raw.entrances) ? raw.entrances : [],
      // Platz für zukünftige Felder gem. Lastenheft Kap. 6 (inputs/outputs/cycle/epoche/…)
      // z.B.: inputs: raw.inputs || undefined, outputs: raw.outputs || undefined, cycle: +raw.cycle||undefined
    };
  }

  // -------------------------------------
  // Public API
  // -------------------------------------
  async function init() {
    try {
      const res = await fetch('data/buildings.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von data/buildings.json`);
      const json = await res.json();

      _data.buildings  = normalizeBuildings(json, _data.meta.iconsBase);
      _data.categories = deriveCategories(_data.buildings, json.categories);

      log('bereit:', { buildings: _data.buildings.length, categories: _data.categories.length, iconsBase: _data.meta.iconsBase });

      const detail = { ok: true, data: { buildings: _data.buildings, categories: _data.categories, meta: _data.meta } };
      EVT('cb:registry-ready', detail);
      EVT('cb:registry:ready', detail); // Kompat-Alias
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
    return _data.buildings.find(b => b.id === want) || null;
  }

  // Komfort: Immer vollständiges Def inkl. Defaults
  function getBuildingDef(id) {
    return composeBuildingDef(byId(id));
  }

  // Export (kein globales STATE-Objekt!)
  window.Registry = { init, get, byId, getBuildingDef };
})();
