/* ============================================================================
 * Datei   : core/registry.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.13-registry-units-res-v1
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

    // Buildings
    buildingsList : [],                 // Array der Gebäude
    buildingsById : Object.create(null),// Map: id → Def

    // Resources
    resourcesList : [],                 // Array der Ressourcen (sortiert)
    resourcesById : Object.create(null),// Map: id → Def

    // Units
    unitsList     : [],                 // Array der Units (sortiert)
    unitsById     : Object.create(null) // Map: id → Def
  };

  // Registry-Objekt vorbereiten
  const Registry = {
    version : 'v25.12.13-registry-units-res-v1',

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
      return [];
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
      if ((t === 'resources' || t === 'resource') && id) {
        return this.getResource(id);
      }
      if ((t === 'units' || t === 'unit') && id) {
        return this.getUnit(id);
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
     * getResource(id)
     * -------------------------------------------------------------------- */
    getResource(id){
      if (!id) return null;
      return state.resourcesById[id] || null;
    },

    /* -----------------------------------------------------------------------
     * getUnit(id)
     * -------------------------------------------------------------------- */
    getUnit(id){
      if (!id) return null;
      return state.unitsById[id] || null;
    },

    /* -----------------------------------------------------------------------
     * resources() / units()
     * -------------------------------------------------------------------- */
    resources(){
      return state.resourcesList.slice();
    },
    units(){
      return state.unitsList.slice();
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
      counts     : {
        buildings  : state.buildingsList.length,
        categories : state.categories.length,
        resources  : state.resourcesList.length,
        units      : state.unitsList.length
      },
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


  function applyResourcesPayload(payload){
    // resources.json liegt bei dir als Map: { wood:{...}, stone:{...} }
    // Wir normalisieren das zu Defs mit id-Feld und sortieren nach order.
    state.resourcesList = [];
    state.resourcesById = Object.create(null);

    if (!payload || typeof payload !== 'object'){
      // kein harter Fehler → Ressourcen sind optional
      return;
    }

    for (const [id, def0] of Object.entries(payload)){
      if (!id) continue;
      const def = Object.assign({ id }, def0 || {});
      state.resourcesById[id] = def;
      state.resourcesList.push(def);
    }

    // stabile Sortierung: order, dann id
    state.resourcesList.sort((a,b)=>{
      const ao = Number(a.order); const bo = Number(b.order);
      const aok = Number.isFinite(ao) ? ao : 9999;
      const bok = Number.isFinite(bo) ? bo : 9999;
      if (aok !== bok) return aok - bok;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function applyUnitsPayload(payload){
    // units.json liegt als Array: [{id,name,...}, ...]
    state.unitsList = [];
    state.unitsById = Object.create(null);

    if (!Array.isArray(payload)){
      // kein harter Fehler → Units sind optional
      return;
    }

    for (const u of payload){
      if (!u || !u.id) continue;
      state.unitsById[u.id] = u;
      state.unitsList.push(u);
    }

    // sortiert nach name, dann id (nur für UI/Inspector)
    state.unitsList.sort((a,b)=>{
      const an = String(a.name || a.id);
      const bn = String(b.name || b.id);
      const c  = an.localeCompare(bn);
      if (c !== 0) return c;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  /* =============================== [INIT] =================================== */

  async function init(){
    try {
      const [buildingsJson, resourcesJson, unitsJson] = await Promise.all([
        loadJSON('data/buildings.json'),
        loadJSON('data/resources.json'),
        loadJSON('data/units.json')
      ]);
      applyBuildingsPayload(buildingsJson);
      applyResourcesPayload(resourcesJson);
      applyUnitsPayload(unitsJson);
      // Backward-Compat: direkte Maps (manche Module nutzen Registry.resources[id])
      Registry.resources = state.resourcesById;
      Registry.units     = state.unitsById;
      emitReady();
    } catch (e) {
      // Genau hier kam bei dir bisher das "string did not match the expected pattern"
      // → entweder kaputtes JSON oder die URL lieferte HTML / etwas anderes.
      ERR('Fehler beim Laden:', e?.message || e);
      // Kein emitReady → Boot bleibt absichtlich stehen, damit du den Fehler siehst.
    }
  }

  init();
})();
