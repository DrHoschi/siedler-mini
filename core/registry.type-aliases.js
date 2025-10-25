/* ============================================================================
 * Datei    : core/registry.type-aliases.js
 * Version  : v25.10.25-final
 * Zweck    : Type-Aliases & Abwärtskompatibilität für window.Registry
 *            (building↔buildings, category↔categories, sanfte Shims)
 *
 * Lädt NACH: core/registry.js
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[registry.alias]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  if (!window.Registry) {
    WARN('window.Registry fehlt – lade zuerst core/registry.js');
    return;
  }

  // Mappt Singular/Plural zu den kanonischen Typen
  const mapType = (t)=>{
    const x = String(t||'').toLowerCase().trim();
    if (x === 'building'   || x === 'buildings')  return 'buildings';
    if (x === 'category'   || x === 'categories') return 'categories';
    if (x === 'unit'       || x === 'units')      return 'units';
    if (x === 'resource'   || x === 'resources')  return 'resources';
    return x;
  };

  // Originale sichern
  const R = window.Registry;
  const orig = {
    list     : R.list?.bind(R),
    get      : R.get?.bind(R),
    where    : R.where?.bind(R),
    upsert   : R.upsert?.bind(R),
    categories: R.categories?.bind(R),
  };

  // ---- list(type, opts?) ----------------------------------------------------
  // Besonderheit: categories werden aus Registry.categories() bedient.
  if (orig.list) {
    R.list = function(type, opts){
      const t = mapType(type);
      if (t === 'categories') {
        // gibt ein Array von Kategorien zurück (Strings oder Objekte, je nach Registry)
        return orig.categories ? orig.categories() : [];
      }
      return orig.list(t, opts);
    };
  } else {
    WARN('Registry.list fehlt – Alias kann nicht aktiv werden.');
  }

  // ---- get(type, id) --------------------------------------------------------
  if (orig.get) {
    R.get = function(type, id){
      const t = mapType(type);
      if (t === 'categories') return null; // kein einzelnes Category-Objekt
      return orig.get(t, id);
    };
  }

  // ---- where(type, predFn) --------------------------------------------------
  if (orig.where && orig.list) {
    R.where = function(type, predFn){
      const t = mapType(type);
      if (t === 'categories') {
        const cats = orig.categories ? orig.categories() : [];
        return typeof predFn === 'function' ? cats.filter(predFn) : cats.slice();
      }
      return orig.where(t, predFn);
    };
  }

  // ---- register(type, payload)  (sehr alter Altcode) ------------------------
  // Shim: akzeptiert Arrays/Maps und leitet auf upsert weiter.
  if (!R.register) {
    R.register = function(type, payload){
      const t = mapType(type);
      if (!orig.upsert) { WARN('register: upsert nicht verfügbar'); return false; }

      // 1) Direkt-Array: [{id,...}, ...]
      if (Array.isArray(payload)) {
        payload.forEach(item => { if (item && item.id) orig.upsert(t, item); });
        return true;
      }

      // 2) Map-Objekt: { id1:{...}, id2:{...} }
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        // Sonderfall „Wrapper“ wie { buildings:[...], categories:[...] }
        if (t === 'buildings' && Array.isArray(payload.buildings)) {
          payload.buildings.forEach(item => { if (item && item.id) orig.upsert('buildings', item); });
          return true;
        }
        if (t === 'units' && Array.isArray(payload.units)) {
          payload.units.forEach(item => { if (item && item.id) orig.upsert('units', item); });
          return true;
        }
        if (t === 'resources' && Array.isArray(payload.resources)) {
          payload.resources.forEach(item => { if (item && item.id) orig.upsert('resources', item); });
          return true;
        }
        // generisch: key->item
        for (const [id, item] of Object.entries(payload)) {
          if (item && (item.id || id)) orig.upsert(t, { id: (item.id||id), ...item });
        }
        return true;
      }

      WARN('register: unbekanntes Payload-Format');
      return false;
    };
  }

  // Sanfter Hinweis im Log (einmalig)
  try {
    const cats = R.list('categories')?.length || 0;
    const blds = R.list('buildings') ?.length || 0;
    LOG(`aktiv – Kategorien:${cats} Gebäude:${blds}`);
  } catch(_) {}
})();
