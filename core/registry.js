/* ============================================================================
 * Datei    : core/registry.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v21.0.0 (2025-10-07)
 * Zweck    : Zentrale Registry (Buildings / Units / Resources / Balance)
 *
 *  (1) Lädt JSON-Daten (buildings, units, balance, resources)
 *  (2) Normalisiert verschiedene Formate (Array, Wrapper, Map-Objekte)
 *  (3) Stellt API bereit: list(), get(), balance(), iconsBase(), snapshot()
 *  (4) Events:
 *      - cb:registry:ready { ok, counts:{buildings, units, resources} }
 *      - req:registry:snapshot  -> cb:registry:snapshot { snapshot }
 *
 * Hinweise:
 *  - Buildings-Icons-Basis (optional) aus buildings.json->iconsBase
 *  - Ressourcen erhalten type:'resource' (für HUD-Filter)
 *  - Legacy-Icon-Pfade wie "assets/icons/res_wood.png" werden auf
 *    "assets/icons/resources/wood.png" normalisiert.
 * ========================================================================== */
(function(root, factory){
  root.Registry = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  // -------------------------------------------------------------------------
  // [00] Konstanten & Utils
  // -------------------------------------------------------------------------
  const JSON_PATHS = {
    buildings : 'data/buildings.json',
    units     : 'data/units.json',
    balance   : 'data/balance.json',
    resources : 'data/resources.json',  // NEU
  };

  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); }
    catch(e){ (console.warn||(()=>{}))('[registry] emit failed', name, e); }
  }

  const byId = (list, id) => Array.isArray(list) ? (list.find(e => e && e.id === id) || null) : null;

  // -------------------------------------------------------------------------
  // [01] Normalisierung buildings.json
  // -------------------------------------------------------------------------
  // Unterstützte Formate:
  //  A) Array auf Top-Level
  //  B) Wrapper-Objekt: { buildings:[], categories?:[], iconsBase?:string }
  function normalizeBuildings(payload){
    if (Array.isArray(payload)) {
      return { buildings: payload.slice(), categories: [], iconsBase: '' };
    }
    if (payload && typeof payload === 'object') {
      const buildings  = Array.isArray(payload.buildings)  ? payload.buildings.slice()  : [];
      const categories = Array.isArray(payload.categories) ? payload.categories.slice() : [];
      const iconsBase  = (typeof payload.iconsBase === 'string') ? payload.iconsBase : '';
      return { buildings, categories, iconsBase };
    }
    return { buildings: [], categories: [], iconsBase: '' };
  }

  // -------------------------------------------------------------------------
  // [02] Normalisierung resources.json
  // -------------------------------------------------------------------------
  // Unterstützte Formate:
  //  A) Map-Objekt: { wood:{name, icon, epoche, order?}, stone:{...}, ... }
  //  B) Array:      [ {id, name, icon, epoche, order?}, ... ]
  function normalizeResources(payload){
    const out = [];
    const legacyToModernIcon = (id, icon) => {
      // Legacy: assets/icons/res_wood.png → Ziel: assets/icons/resources/wood.png
      if (typeof icon === 'string' && /\/res_/.test(icon)) {
        return `assets/icons/resources/${id}.png`;
      }
      // Kein Icon gegeben → Standardpfad
      if (!icon) return `assets/icons/resources/${id}.png`;
      return icon;
    };

    if (payload && !Array.isArray(payload) && typeof payload === 'object') {
      // Map-Objekt
      for (const id of Object.keys(payload)) {
        const r = payload[id] || {};
        out.push({
          id,
          name  : r.name  || id,
          icon  : legacyToModernIcon(id, r.icon),
          epoche: Number(r.epoche || 1),
          order : Number(r.order ?? 999),
          type  : 'resource',
        });
      }
    } else if (Array.isArray(payload)) {
      // Array-Form
      payload.forEach((r, i) => {
        if (!r) return;
        const id = r.id || String(r.name || `res_${i}`).toLowerCase();
        out.push({
          id,
          name  : r.name  || id,
          icon  : legacyToModernIcon(id, r.icon),
          epoche: Number(r.epoche || 1),
          order : Number(r.order ?? (1000 + i)),
          type  : 'resource',
        });
      });
    }
    // Sortierung nach order, stabil
    out.sort((a,b) => (a.order||999) - (b.order||999));
    return out;
  }

  // -------------------------------------------------------------------------
  // [03] Registry-Klasse
  // -------------------------------------------------------------------------
  class RegistryClass {
    constructor(){
      this._data = {
        buildings : [],
        units     : [],
        balance   : {},
        resources : [],        // NEU
      };
      this._meta = {
        categories: [],
        iconsBase : '',        // aus buildings.json (optional)
      };
      this._ready = false;
    }

    async init(loadJSON){
      // Loader vorbereiten (fetch-basiert, no-store)
      const _load = typeof loadJSON === 'function'
        ? loadJSON
        : async function(url){
            const bust = (url.includes('?')?'&':'?') + 'v=' + Date.now();
            const res = await fetch(url + bust, { cache:'no-store' });
            if (!res.ok) throw new Error('[registry] fetch failed ' + res.status + ' @ ' + url);
            return await res.json();
          };

      const [bRaw, unitsRaw, balanceRaw, resRaw] = await Promise.all([
        _load(JSON_PATHS.buildings).catch(()=>null),
        _load(JSON_PATHS.units).catch(()=>[]),
        _load(JSON_PATHS.balance).catch(()=>({})),
        _load(JSON_PATHS.resources).catch(()=>null),
      ]);

      // Buildings
      const B = normalizeBuildings(bRaw || []);
      this._data.buildings = (B.buildings || []).map(e => ({
        ...e,
        epoche: Number(e?.epoche || 1)
      }));
      this._meta.categories = Array.isArray(B.categories) ? B.categories.slice() : [];
      this._meta.iconsBase  = typeof B.iconsBase === 'string' ? B.iconsBase : '';

      // Units / Balance
      this._data.units   = Array.isArray(unitsRaw)                  ? unitsRaw : [];
      this._data.balance = (balanceRaw && typeof balanceRaw==='object') ? balanceRaw : {};

      // Resources
      this._data.resources = normalizeResources(resRaw || {});

      this._ready = true;
      emit('cb:registry:ready', { ok:true, counts:{
        buildings : this._data.buildings.length,
        units     : this._data.units.length,
        resources : this._data.resources.length,
      }});
    }

    isReady(){ return !!this._ready; }

    // -----------------------------------------------------------------------
    // [API] list(kind, filter?)
    // kind: 'buildings' | 'units' | 'resources'
    // filter: { epoche?:number, category?:string }
    // -----------------------------------------------------------------------
    list(kind, { epoche=null, category=null } = {}){
      let src;
      switch (kind) {
        case 'units'     : src = this._data.units; break;
        case 'resources' : src = this._data.resources; break; // NEU
        case 'buildings' :
        default          : src = this._data.buildings; break;
      }
      if (!Array.isArray(src)) return [];
      let out = src.slice();

      if (epoche != null) {
        out = out.filter(e => Number(e?.epoche || 1) === Number(epoche));
      }
      if (category != null && kind === 'buildings') {
        out = out.filter(e => (e?.category || '') === category);
      }
      return out;
    }

    // -----------------------------------------------------------------------
    // [API] get(kind, id)
    // -----------------------------------------------------------------------
    get(kind, id){
      let src;
      switch (kind) {
        case 'units'     : src = this._data.units; break;
        case 'resources' : src = this._data.resources; break; // NEU
        case 'buildings' :
        default          : src = this._data.buildings; break;
      }
      return byId(src, id);
    }

    // -----------------------------------------------------------------------
    // [API] Sonstiges
    // -----------------------------------------------------------------------
    balance(){ return this._data.balance; }
    categories(){ return this._meta.categories.slice(); }
    iconsBase(){ return this._meta.iconsBase || ''; }

    snapshot(){
      return {
        data: JSON.parse(JSON.stringify(this._data)),
        meta: JSON.parse(JSON.stringify(this._meta)),
      };
    }
  }

  // Singleton
  const REG = new RegistryClass();

  // Snapshot-Request
  window.addEventListener('req:registry:snapshot', ()=>{
    emit('cb:registry:snapshot', { snapshot: REG.snapshot() });
  });

  return REG;
});
