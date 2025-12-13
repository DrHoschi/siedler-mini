/* ============================================================================
 * Datei   : core/registry.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.13-registry-v3-units-resources
 *
 * Zweck   :
 *   - Zentrale Datenbank für Buildings & Kategorien
 *   - Lädt data/buildings.json (Wrapper: { iconsBase, categories, buildings[] })
 *   - Stellt eine saubere API bereit:
 *       Registry.list(type)        → Array (z.B. 'buildings', 'categories')
 *       Registry.get(type, id)     → einzelnes Objekt
 *       Registry.getBuilding(id)   → Gebäude-Definition
 *       Registry.categories()      → Kategorien-Array
 *       Registry.onReady(cb)       → ruft cb nach erfolgreichem Laden
 *       Registry.isReady()         → true/false
 *
 *   - Kompatibilität:
 *       - Registry.buildings[id] → Building-Definition (Map per ID)
 *       - cb:registry:ready Event auf window + document
 *       - Flag: Registry.__ready === true
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[registry]';

  // Mehrfacheinbindung verhindern
  if (window.__REGISTRY_V2__) {
    (window.CBLog?.info || console.info)(TAG, 'skip (bereits geladen)');
    return;
  }
  window.__REGISTRY_V2__ = true;

  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error|| console.error).bind(console, TAG);

  // interner Speicher
  const state = {
    iconsBase     : '',
    categories    : [],
    buildingsList : [],                 // Array der Gebäude
    buildingsById : Object.create(null),// Map: id → Building-Def

    // Ressourcen (data/resources.json)
    resourcesList : [],                 // Array [{id,...}]
    resourcesById : Object.create(null),// Map: id → Resource-Def

    // Units (data/units.json)
    unitsList     : [],                 // Array [{id,...}]
    unitsById     : Object.create(null) // Map: id → Unit-Def
  };

  // Registry-Objekt vorbereiten
  const Registry = {
    version : 'v25.12.13',

    // Nur Leseflags
    __ready : false,

    /* -----------------------------------------------------------------------
     * list(type)
     *   type: 'buildings' | 'categories' | ...
     * -------------------------------------------------------------------- */
    list(type){
      const t = String(type || '').toLowerCase().trim();
      if (t === 'buildings' || t === 'building') {
        return state.buildingsList.slice();
      }
      if (t === 'categories' || t === 'category') {
        return state.categories.slice();
      }
      if (t === 'resources' || t === 'resource') {
        return state.resourcesList.slice();
      }
      if (t === 'units' || t === 'unit') {
        return state.unitsList.slice();
      }
      // andere Typen kannst du später ergänzen
      return [];
    },

    getResource(id){
      return state.resourcesById[id] || null;
    },

    getUnit(id){
      return state.unitsById[id] || null;
    },

    resources(){
      return state.resourcesList.slice();
    },

    units(){
      return state.unitsList.slice();
    },

    /* -----------------------------------------------------------------------
     * get(type, id)
     * -------------------------------------------------------------------- */
    get(type, id){
      const t = String(type || '').toLowerCase().trim();
      if ((t === 'buildings' || t === 'building') && id) {
        return this.getBuilding(id);
      }
      if ((t === 'categories' || t === 'category') && id) {
        return state.categories.find(c => c.id === id) || null;
      }
            if (t === 'resources' || t === 'resource') {
        return state.resourcesById[id] || null;
      }
      if (t === 'units' || t === 'unit') {
        return state.unitsById[id] || null;
      }

return null;
    },

    /* -----------------------------------------------------------------------
     * getBuilding(id)
     *   Direkter Helper für Game.buildings etc.
     * -------------------------------------------------------------------- */
    getBuilding(id){
      if (!id) return null;
      return state.buildingsById[id] || null;
    },

    /* -----------------------------------------------------------------------
     * categories()
     * -------------------------------------------------------------------- */
    categories(){
      return state.categories.slice();
    },

    /* -----------------------------------------------------------------------
     * onReady(cb) / isReady()
     * -------------------------------------------------------------------- */
    _readyQueue : [],
    onReady(cb){
      if (typeof cb !== 'function') return;
      if (this.__ready) {
        try { cb(this); } catch(_) {}
      } else {
        this._readyQueue.push(cb);
      }
    },
    isReady(){
      return !!this.__ready;
    }
  };

  // Für Altcode: Registry.buildings[id] → Definition
  Object.defineProperty(Registry, 'buildings', {
    get(){ return state.buildingsById; }
  });

  // Für Altcode: Registry.resources[id] → Resource-Def
  Object.defineProperty(Registry, 'resources', {
    get(){ return state.resourcesById; }
  });

  // Für Altcode: Registry.units[id] → Unit-Def
  Object.defineProperty(Registry, 'units', {
    get(){ return state.unitsById; }
  });

  // global machen
  window.Registry = Registry;

  /* ============================ [HILFSFUNKTIONEN] ========================== */

  async function loadJSON(url){
    // Einfache, robuste Variante → vermeidet komische URL-Fehler
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const r = await fetch(url + bust, { cache:'no-store' });
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} @ ${url}`);
    }
    // Wenn der Server aus Versehen HTML liefert, fliegt hier ein SyntaxError
    return r.json();
  }

  function emitReady(){
    Registry.__ready = true;

    // Wartende Callbacks abarbeiten
    try {
      while (Registry._readyQueue.length) {
        const fn = Registry._readyQueue.shift();
        try { fn(Registry); } catch(_) {}
      }
    } catch(_) {}

    const detail = {
      version    : Registry.version,
      counts     : { buildings: state.buildingsList.length, categories: state.categories.length, resources: state.resourcesList.length, units: state.unitsList.length },
      iconsBase  : state.iconsBase
    };

    try { window.dispatchEvent(new CustomEvent('cb:registry:ready', { detail })); } catch(_){}
    try { document.dispatchEvent(new CustomEvent('cb:registry:ready', { detail })); } catch(_){}

    LOG('bereit', detail);
  }

  function applyBuildingsPayload(payload){
    if (!payload || typeof payload !== 'object') {
      throw new Error('Ungültige buildings.json Struktur');
    }

    state.iconsBase  = payload.iconsBase || '';
    state.categories = Array.isArray(payload.categories) ? payload.categories.slice() : [];

    const arr = Array.isArray(payload.buildings) ? payload.buildings : [];
    state.buildingsList = arr.slice();
    state.buildingsById = Object.create(null);

    for (const b of arr) {
      if (!b || !b.id) continue;
      state.buildingsById[b.id] = b;
    }
  }
  /* -----------------------------------------------------------------------
   * applyResourcesPayload(payload)
   *  - data/resources.json ist ein Object: { wood:{...}, stone:{...}, ... }
   *  - Wir normalisieren zu: resourcesList [{id,...}] + resourcesById Map
   * -------------------------------------------------------------------- */
  function applyResourcesPayload(payload){
    state.resourcesList = [];
    state.resourcesById = Object.create(null);

    if (!payload || typeof payload !== 'object') {
      WARN('resources.json ungültig – nutze leere Ressourcen-Registry');
      return;
    }

    const list = [];
    for (const [id, def] of Object.entries(payload)) {
      if (!id) continue;
      const item = Object.assign({ id }, def || {});
      list.push(item);
      state.resourcesById[id] = item;
    }

    list.sort((a,b)=>{
      const ao = (typeof a.order === 'number') ? a.order : 9999;
      const bo = (typeof b.order === 'number') ? b.order : 9999;
      if (ao !== bo) return ao - bo;
      const an = String(a.name || a.id || '');
      const bn = String(b.name || b.id || '');
      return an.localeCompare(bn);
    });

    state.resourcesList = list;
  }

  /* -----------------------------------------------------------------------
   * applyUnitsPayload(payload)
   *  - data/units.json ist ein Array [{id,name,...}, ...]
   * -------------------------------------------------------------------- */
  function applyUnitsPayload(payload){
    state.unitsList = [];
    state.unitsById = Object.create(null);

    if (!Array.isArray(payload)) {
      WARN('units.json ungültig – nutze leere Units-Registry');
      return;
    }

    const list = payload.filter(Boolean).slice();
    for (const u of list) {
      if (!u || !u.id) continue;
      state.unitsById[u.id] = u;
    }

    list.sort((a,b)=>{
      const ao = (typeof a.order === 'number') ? a.order : 9999;
      const bo = (typeof b.order === 'number') ? b.order : 9999;
      if (ao !== bo) return ao - bo;
      const an = String(a.name || a.id || '');
      const bn = String(b.name || b.id || '');
      return an.localeCompare(bn);
    });

    state.unitsList = list;
  }


  /* =============================== [INIT] =================================== */

  async function init(){
    try {
      // buildings sind Pflicht (Build-Menü etc.)
      const buildingsJson = await loadJSON('data/buildings.json');
      applyBuildingsPayload(buildingsJson);

      // resources/units sind optional – wir warnen nur, damit Boot nicht blockiert
      const [resR, unitR] = await Promise.allSettled([
        loadJSON('data/resources.json'),
        loadJSON('data/units.json')
      ]);

      if (resR.status === 'fulfilled') {
        applyResourcesPayload(resR.value);
      } else {
        WARN('Konnte resources.json nicht laden:', resR.reason?.message || resR.reason);
      }

      if (unitR.status === 'fulfilled') {
        applyUnitsPayload(unitR.value);
      } else {
        WARN('Konnte units.json nicht laden:', unitR.reason?.message || unitR.reason);
      }

      emitReady();
    } catch (e) {
      ERR('Fehler beim Laden:', e?.message || e);
    }
  }

  init();
})();
