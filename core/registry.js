/* ============================================================================
 * Datei    : core/registry.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v19.0.0 (2025-10-05)
 * Zweck    : Zentrale Registry (Buildings/Units/Balance) + Events
 * Events   :
 *   - cb:registry:ready          → wenn alle JSON-Daten geladen/validiert sind
 *   - req:registry:snapshot      → Antwort: cb:registry:snapshot (für Inspector)
 * Abhäng.  : core/asset.js (loadJSON), window.dispatchEvent
 * Struktur : Imports → Konstanten → Helpers → Klasse → Hauptlogik → Exports
 * ============================================================================
 */

(function(root, factory){
  root.Registry = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  // --------------------------------------------------------------------------
  // Imports (indirekt): Wir erwarten eine globale Asset-API mit loadJSON(path)
  // --------------------------------------------------------------------------
  const JSON_PATHS = {
    buildings : 'data/buildings.json',
    units     : 'data/units.json',
    balance   : 'data/balance.json'
  };

  // --------------------------------------------------------------------------
  // Hilfsfunktionen
  // --------------------------------------------------------------------------
  function emit(name, detail={}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function byId(list, id){ return list.find(e => e.id === id) || null; }

  // --------------------------------------------------------------------------
  // Registry-Klasse
  // --------------------------------------------------------------------------
  class RegistryClass {
    constructor(){
      this._data = {
        buildings: [],
        units: [],
        balance: {}
      };
      this._ready = false;
    }

    async init(loadJSON){
      // 1) Laden
      const [buildings, units, balance] = await Promise.all([
        loadJSON(JSON_PATHS.buildings).catch(()=>[]),
        loadJSON(JSON_PATHS.units).catch(()=>[]),
        loadJSON(JSON_PATHS.balance).catch(()=>({}))
      ]);

      // 2) Minimal-Validierung
      this._data.buildings = Array.isArray(buildings) ? buildings : [];
      this._data.units     = Array.isArray(units) ? units : [];
      this._data.balance   = (balance && typeof balance === 'object') ? balance : {};

      // 3) Fertig
      this._ready = true;
      emit('cb:registry:ready', { ok:true });
    }

    // ------------------- Query-API -------------------
    isReady(){ return this._ready; }
    list(kind, {epoche=null, category=null} = {}){
      let src = (kind === 'units') ? this._data.units : this._data.buildings;
      if(epoche)   src = src.filter(e => (e.epoche||1) === epoche);
      if(category) src = src.filter(e => (e.category||'') === category);
      return src.slice();
    }
    get(kind, id){ return byId((kind==='units')?this._data.units:this._data.buildings, id); }
    balance(){ return this._data.balance; }

    snapshot(){
      return JSON.parse(JSON.stringify(this._data));
    }
  }

  // --------------------------------------------------------------------------
  // Singleton + Event-Brücke
  // --------------------------------------------------------------------------
  const REG = new RegistryClass();

  window.addEventListener('req:registry:snapshot', ()=>{
    emit('cb:registry:snapshot', { snapshot: REG.snapshot() });
  });

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------
  return REG;
});
