<script>
/*!
 * Registry JSON-Adapter – lädt buildings.json und füttert Registry
 * Version: v1.0.9
 * Pfad: assets/core/registry.json-adapter.js
 */
(function (w) {
  'use strict';
  const VER = '1.0.9';
  const log = (m, ...a) => (w.CBLog?.info || console.log)(`[registry.json-adapter] ${m}`, ...a);
  const warn = (m, ...a) => (w.CBLog?.warn || console.warn)(`[registry.json-adapter] ${m}`, ...a);

  // Feste Quelle – DU hast sie bereits so abgelegt:
  const URL = 'assets/data/buildings.json';

  function normString(s) { return (s ?? '').toString(); }
  function normBool(b, def=false){ return typeof b === 'boolean' ? b : !!def; }
  function normSize(v){ 
    if (Array.isArray(v) && v.length === 2) return [v[0]|0, v[1]|0];
    return [1,1];
  }

  function normalize(raw) {
    // Erwartetes Format:
    // { iconsBase: "assets/ui/build/", buildings: [ ... ] }
    const base = normString(raw?.iconsBase || 'assets/ui/build/');
    const arr  = Array.isArray(raw?.buildings) ? raw.buildings : [];
    const cats = new Map(); // id -> {id,name,order}

    const buildings = arr.map((b, idx) => {
      const id    = normString(b.id || `b${idx}`);
      const name  = normString(b.name || id);
      const cat   = normString(b.cat || 'misc');
      const icon  = base + normString(b.icon || `${id}.png`);
      const sprite= normString(b.sprite || '');
      const enabled = normBool(b.enabled, true);
      const size  = normSize(b.size);
      const place = normString(b.place || '');

      // Kategorien sammeln (deutsche Labels aus Lastenheft konventionell)
      if (!cats.has(cat)) cats.set(cat, { id: cat, name: cat, order: cats.size });

      return { id, name, cat, icon, sprite, enabled, size, place };
    });

    const categories = Array.from(cats.values());
    return { categories, buildings };
  }

  async function load() {
    try {
      const res = await fetch(URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      log(`geladen: ${URL}`);
      return normalize(json);
    } catch (e) {
      warn(`Fehler beim Laden: ${e?.message || e}`);
      return { categories: [], buildings: [] };
    }
  }

  async function boot() {
    if (!w.Registry) { warn('Registry fehlt – lade Reihenfolge prüfen'); return; }

    const { categories, buildings } = await load();

    // **WICHTIG:** exakte Typnamen (Plural!)
    w.Registry.register('categories', categories);
    w.Registry.register('buildings',  buildings);

    const c = w.Registry.counts();
    log(`applied ${c.buildings} buildings / ${c.categories} categories`);

    // Events: ready (einmalig), update wird von Registry.register gesendet
    if (!w.__registryReadySent) {
      w.__registryReadySent = true;
      w.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail: { counts: c, source: 'json-adapter' }
      }));
    }

    // Für UI-Bridge/Inspector
    w.dispatchEvent(new CustomEvent('cb:assets-ready', {
      detail: { ok:true, counts: c, source: 'json-adapter' }
    }));
  }

  // sofort starten
  (w.addEventListener ? w.addEventListener('load', boot) : boot());
  log(`Modul geladen v${VER}`);
})(window);
</script>
