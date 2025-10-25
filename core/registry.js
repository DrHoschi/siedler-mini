/* ============================================================================
 * Datei    : core/registry.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.10.25-final+publish
 * Zweck    : Zentrale Registry (Buildings / Units / Resources / Balance)
 *
 * Lädt & normalisiert:
 *  - data/buildings.json   → { buildings[], categories[], iconsBase }
 *  - data/units.json       → units[]
 *  - data/balance.json     → balance{}
 *  - data/resources.json   → Definitionsliste der Ressourcen (IDs, Icons, Epoche)
 *
 * Öffentliche API (global: window.Registry / REG):
 *  - isReady()                    → boolean
 *  - onReady(cb)                  → cb nach cb:registry:ready (sofort, falls bereit)
 *  - list(kind, {epoche?,category?})
 *  - get(kind, id)
 *  - where(kind, predFn)
 *  - upsert(kind, item)
 *  - balance() / categories() / iconsBase()
 *  - snapshot()                   → tiefe Kopie der Daten + Meta
 *
 * Events:
 *  - cb:registry:ready      { ok:true, counts:{buildings,units,resources} }
 *  - cb:registry:snapshot   { buildings[], categories[], resources[]? (Werte s.u.) }
 *  - cb:registry:error      { ok:false, message }
 *  - req:registry:snapshot  → cb:registry:snapshot { snapshot }
 *  - req:res:snapshot       → cb:res:snapshot { resources } (Live-Werte)
 *
 * Live-Ressourcen:
 *  - window.RegistryValues (globaler langlebiger Speicher, z. B. { wood:0, stone:0, ... })
 *  - Spiegel unter Registry.data.resources (Werte-Map, kein Definitions-Array)
 *
 * Design:
 *  - Defensive Fetches (cache:no-store, Bust-Query)
 *  - Ready-Marker: Registry.__ready = true
 *  - Doppelte Ready-Events (window & document), damit Altcode sicher reagiert
 *  - NEU: Öffentliche Spiegel unter Registry.data.{buildings,categories,resources}
 *         → Inspector erkennt „Quelle: registry“ zuverlässig
 * ============================================================================ */
(function(root, factory){
  root.Registry = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  // -------------------------------------------------------------------------
  // [Konstanten & Utils]
  // -------------------------------------------------------------------------
  const MOD = '[registry]';
  const LOG  = (...a)=> (window.CBLog?.ok   || console.log ).apply(console, [MOD, ...a]);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn).apply(console, [MOD, ...a]);
  const ERR  = (...a)=> (window.CBLog?.err  || console.error).apply(console, [MOD, ...a]);

  const JSON_PATHS = {
    buildings : 'data/buildings.json',
    units     : 'data/units.json',
    balance   : 'data/balance.json',
    resources : 'data/resources.json',
  };

  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_){}
    // einige Alt-Listener hängen am document:
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch(_){}
  }

  const byId = (list, id) => Array.isArray(list) ? (list.find(e => e && e.id === id) || null) : null;

  async function defaultLoader(url){
    const bust = (url.includes('?')?'&':'?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }

  // -------------------------------------------------------------------------
  // [Normalisierung: Buildings]
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
  // [Normalisierung: Resources (Definitionsliste, keine Mengen)]
  // -------------------------------------------------------------------------
  function normalizeResources(payload){
    const out = [];
    const iconFor = (id, icon) => {
      if (typeof icon === 'string' && icon) return icon;
      return `assets/icons/resources/${id}.png`;
    };

    if (payload && !Array.isArray(payload) && typeof payload === 'object') {
      for (const id of Object.keys(payload)) {
        const r = payload[id] || {};
        out.push({
          id,
          name  : r.name  || id,
          icon  : iconFor(id, r.icon),
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
          icon  : iconFor(id, r.icon),
          epoche: Number(r.epoche || 1),
          order : Number(r.order ?? (1000 + i)),
          type  : 'resource',
        });
      });
    }

    out.sort((a,b) => (a.order||999) - (b.order||999));
    return out;
  }
  
// Liefert die Werte-Map mit ALLEN Resource-IDs (Definitionsliste ∪ bisherige Werte)
function getResourceValuesFull(REG) {
  const V = (window.RegistryValues = window.RegistryValues || {});
  try {
    const defs = (REG?.list('resources') || []).map(r => r.id);
    for (const id of defs) if (V[id] == null) V[id] = 0;  // fehlende auf 0 setzen
  } catch(_) {}
  return V;
}
  
  // -------------------------------------------------------------------------
  // [Registry-Klasse]
  // -------------------------------------------------------------------------
  class RegistryClass {
    constructor(){
      this._data = {
        buildings : [],
        units     : [],
        balance   : {},
        resources : [],     // Definitionsliste
      };
      this._meta = {
        categories: [],
        iconsBase : '',
      };
      this._ready = false;
      this.__ready = false;  // öffentlicher Marker für Bridges
      this._initting = false;
      this._onReady = [];
    }

    async init(loadJSON){
      if (this._ready || this._initting) return;
      this._initting = true;
      const _load = typeof loadJSON === 'function' ? loadJSON : defaultLoader;

      try{
        const [bRaw, unitsRaw, balanceRaw, resRaw] = await Promise.all([
          _load(JSON_PATHS.buildings).catch(()=>null),
          _load(JSON_PATHS.units).catch(()=>[]),
          _load(JSON_PATHS.balance).catch(()=>({})),
          _load(JSON_PATHS.resources).catch(()=>null),
        ]);

        // Buildings
        const B = normalizeBuildings(bRaw || []);
        this._data.buildings  = (B.buildings || []).map(e => ({ ...e, epoche: Number(e?.epoche || 1) }));
        this._meta.categories = Array.isArray(B.categories) ? B.categories.slice() : [];
        this._meta.iconsBase  = typeof B.iconsBase === 'string' ? B.iconsBase : '';

        // Units / Balance
        this._data.units   = Array.isArray(unitsRaw) ? unitsRaw.slice() : [];
        this._data.balance = (balanceRaw && typeof balanceRaw==='object') ? { ...balanceRaw } : {};

        // Resources (Definitionsliste)
        this._data.resources = normalizeResources(resRaw || {});

        // Ready markieren
        this._ready = true;
        this.__ready = true;         // <- wichtig für EntitiesRegistry-Bridge
        window.Registry = window.Registry || {};
        window.Registry.__ready = true;

        // Live-Res-Werte initialisieren/spiegeln
        this._setupResourceValuesOnce();

        // >>> NEU: Öffentliche Spiegel publizieren (Inspector liest hieraus)
        this._publishPublicData();

        // Ready-Events (window & document) + onReady-Queue leeren
        const counts = {
          buildings : this._data.buildings.length,
          units     : this._data.units.length,
          resources : this._data.resources.length,
        };
        emit('cb:registry:ready', { ok:true, counts });

        // >>> NEU: Sofort ein Snapshot-Event mit Kern-Arrays senden
        emit('cb:registry:snapshot', {
          buildings : this._data.buildings,
          categories: this._meta.categories,
          resources : getResourceValuesFull(REG) // Werte-Map (aktuelle Mengen)
        });

        this._onReady.splice(0).forEach(fn => { try{ fn(); }catch(_){ } });

        LOG('bereit', counts);
      } catch(e){
        this._ready = false;
        this.__ready = false;
        emit('cb:registry:error', { ok:false, message: e?.message || String(e) });
        ERR('Fehler beim Laden:', e?.message || e);
      } finally {
        this._initting = false;
      }
    }

    // ---- API ----------------------------------------------------------------
    isReady(){ return !!this._ready; }

    /** onReady(cb): führt cb sofort aus, wenn schon bereit – sonst später. */
    onReady(cb){
      if (typeof cb !== 'function') return;
      if (this._ready) { try{ cb(); }catch(_){ } }
      else this._onReady.push(cb);
    }

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

    /** where(kind, predFn): kleines Helferlein für Filter aus Altcode/Inspector */
    where(kind, predFn){
      if (typeof predFn !== 'function') return this.list(kind);
      return this.list(kind).filter(predFn);
    }

    /** upsert(kind, item): einfügen oder aktualisieren (id Pflicht) */
    upsert(kind, item){
      if (!item || !item.id) return false;
      let arr;
      switch (kind) {
        case 'units'     : arr = this._data.units; break;
        case 'resources' : arr = this._data.resources; break;
        case 'buildings' :
        default          : arr = this._data.buildings; break;
      }
      const idx = Array.isArray(arr) ? arr.findIndex(e => e && e.id === item.id) : -1;
      if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
      else { (arr ||= []); arr.push({ ...item }); }
      return true;
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

    // ---- Live-Res-Speicher einmalig einrichten ------------------------------
    _setupResourceValuesOnce(){
      if (this.__resSetupDone) return;
      this.__resSetupDone = true;

      const RES_VALUES = (window.RegistryValues = window.RegistryValues || {}); // langlebig, global
      try{
        const ids = this.list('resources').map(r => r.id);
        ids.forEach(id => { if (RES_VALUES[id] == null) RES_VALUES[id] = 0; });
      }catch(_){}

      // Spiegel unter Registry.* (Inspector schaut hier zuerst hin)
      try{
        const R = (window.Registry = window.Registry || {});
        R.data = R.data || {};
        // Werte-Map (Mengen) – NICHT die Definitionsliste
        R.data.resources = RES_VALUES;
      }catch(_){}

      // Snapshot-Requests beantworten
      window.addEventListener('req:res:snapshot', ()=>{
        emit('cb:res:snapshot', { resources: getResourceValuesFull(REG) });
      });
    }

    // ---- NEU: Öffentliche Spiegel bereitstellen (für Inspector/Tools) -------
    _publishPublicData(){
      try{
        const R = (window.Registry = window.Registry || {});
        R.data = R.data || {};
        // !!! WICHTIG: Nur unter data/ spiegeln, um Methoden-Namen nicht zu überschreiben
        R.data.buildings   = this._data.buildings;     // Referenz, stets aktuell
        R.data.categories  = this._meta.categories;    // Referenz
        // R.data.resources → wird in _setupResourceValuesOnce() gesetzt (Werte-Map)
      }catch(e){
        WARN('publish public data failed:', e?.message || e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // [Singleton + Requests]
  // -------------------------------------------------------------------------
  const REG = new RegistryClass();

  window.addEventListener('req:registry:snapshot', ()=>{
    emit('cb:registry:snapshot', { snapshot: REG.snapshot() });
  });

  // Sofort-Init (lädt JSONs & feuert cb:registry:ready / cb:registry:error)
  REG.init();

  return REG;
});
