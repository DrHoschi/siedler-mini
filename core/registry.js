/* ============================================================================
 * Datei    : core/registry.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.10.19-final +res-values
 * Zweck    : Zentrale Registry (Buildings / Units / Resources / Balance)
 *
 *  (1) Lädt JSON-Daten (buildings, units, balance, resources)
 *  (2) Normalisiert verschiedene Formate (Array, Wrapper, Map-Objekte)
 *  (3) API: list(), get(), balance(), categories(), iconsBase(), snapshot()
 *  (4) Events:
 *      - cb:registry:ready { ok, counts:{buildings, units, resources} }
 *      - req:registry:snapshot  -> cb:registry:snapshot { snapshot }
 *      - req:res:snapshot       -> cb:res:snapshot { resources }    (NEU)
 *  (5) NEU: Registry.resources (Live-Werte) und Spiegel unter data.resources
 * ========================================================================== */
(function(root, factory){
  root.Registry = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  // -------------------------------------------------------------------------
  // Konstanten & Utils
  // -------------------------------------------------------------------------
  const JSON_PATHS = {
    buildings : 'data/buildings.json',
    units     : 'data/units.json',
    balance   : 'data/balance.json',
    resources : 'data/resources.json',
  };

  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); }
    catch(e){ (console.warn||(()=>{}))('[registry] emit failed', name, e); }
  }

  const byId = (list, id) => Array.isArray(list) ? (list.find(e => e && e.id === id) || null) : null;

  // -------------------------------------------------------------------------
  // Normalisierung buildings.json
  // -------------------------------------------------------------------------
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
  // Normalisierung resources.json  → Definitionsliste (keine Mengen!)
  // -------------------------------------------------------------------------
  function normalizeResources(payload){
    const out = [];
    const legacyToModernIcon = (id, icon) => {
      if (typeof icon === 'string' && /\/res_/.test(icon)) {
        return `assets/icons/resources/${id}.png`;
      }
      if (!icon) return `assets/icons/resources/${id}.png`;
      return icon;
    };

    if (payload && !Array.isArray(payload) && typeof payload === 'object') {
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

    out.sort((a,b) => (a.order||999) - (b.order||999));
    return out;
  }

  // -------------------------------------------------------------------------
  // Registry
  // -------------------------------------------------------------------------
  class RegistryClass {
    constructor(){
      this._data = {
        buildings : [],
        units     : [],
        balance   : {},
        resources : [],     // Definitionsliste (IDs, Icons …)
      };
      this._meta = {
        categories: [],
        iconsBase : '',
      };
      this._ready = false;
    }

    async init(loadJSON){
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
      this._data.buildings = (B.buildings || []).map(e => ({ ...e, epoche: Number(e?.epoche || 1) }));
      this._meta.categories = Array.isArray(B.categories) ? B.categories.slice() : [];
      this._meta.iconsBase  = typeof B.iconsBase === 'string' ? B.iconsBase : '';

      // Units / Balance
      this._data.units   = Array.isArray(unitsRaw) ? unitsRaw : [];
      this._data.balance = (balanceRaw && typeof balanceRaw==='object') ? balanceRaw : {};

      // Resources (Definitionsliste)
      this._data.resources = normalizeResources(resRaw || {});

      this._ready = true;
      emit('cb:registry:ready', { ok:true, counts:{
        buildings : this._data.buildings.length,
        units     : this._data.units.length,
        resources : this._data.resources.length,
      }});
    }

    isReady(){ return !!this._ready; }

    // --- API ---------------------------------------------------------------
    list(kind, { epoche=null, category=null } = {}){
      let src;
      switch (kind) {
        case 'units'     : src = this._data.units; break;
        case 'resources' : src = this._data.resources; break;
        case 'buildings' :
        default          : src = this._data.buildings; break;
      }
      if (!Array.isArray(src)) return [];
      let out = src.slice();

      if (epoche != null)   out = out.filter(e => Number(e?.epoche || 1) === Number(epoche));
      if (category != null && kind === 'buildings')
                            out = out.filter(e => (e?.category || '') === category);

      return out;
    }

    get(kind, id){
      let src;
      switch (kind) {
        case 'units'     : src = this._data.units; break;
        case 'resources' : src = this._data.resources; break;
        case 'buildings' :
        default          : src = this._data.buildings; break;
      }
      return byId(src, id);
    }

    balance(){    return this._data.balance; }
    categories(){ return this._meta.categories.slice(); }
    iconsBase(){  return this._meta.iconsBase || ''; }

    snapshot(){
      return {
        data: JSON.parse(JSON.stringify(this._data)),
        meta: JSON.parse(JSON.stringify(this._meta)),
      };
    }
  }

  // Singleton
  const REG = new RegistryClass();

  // Snapshot-Request → Response
  window.addEventListener('req:registry:snapshot', ()=>{
    emit('cb:registry:snapshot', { snapshot: REG.snapshot() });
  });

  // -------------------------------------------------------------
  // NEU: Live-Resource-Werte (für Inspector & Game)
  //  - nach registry:ready einmalig initialisieren
  //  - unter Registry.resources und Registry.data.resources verfügbar
  //  - Snapshot-Request/Response für Inspector
  // -------------------------------------------------------------
  (function setupResourceValues(){
    const RES_VALUES = (window.RegistryValues = window.RegistryValues || {}); // globaler, langlebiger Speicher

    window.addEventListener('cb:registry:ready', ()=>{
      try{
        const ids = REG.list('resources').map(r=>r.id);
        // sanft initialisieren (nur fehlende Ressourcen auf 0 setzen)
        ids.forEach(id => { if (RES_VALUES[id] == null) RES_VALUES[id] = 0; });

        // unter Registry spiegeln (so sucht der Inspector zuerst)
        const R = (window.Registry = window.Registry || {});
        R.resources = RES_VALUES;
        R.data = R.data || {};
        R.data.resources = RES_VALUES;
      }catch(_){}
    });

    // Inspector-Snapshot anfragen/liefern
    window.addEventListener('req:res:snapshot', ()=>{
      emit('cb:res:snapshot', { resources: RES_VALUES });
    });
  })();

  // Sofort-Init (lädt JSONs & feuert cb:registry:ready)
  REG.init(); // <— identisch zu deiner Version

  return REG;
});
