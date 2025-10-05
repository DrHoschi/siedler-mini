/* ============================================================================
 * Datei    : core/registry.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v19.0.3 (2025-10-05)
 * Zweck    : Zentrale Registry (Buildings/Units/Balance) + Events
 *           -> robust gegenüber 2 Formaten von buildings.json:
 *              (A) Array auf Top-Level  oder  (B) Wrapper-Objekt mit {buildings, categories, iconsBase}
 * Events   :
 *   - cb:registry:ready
 *   - req:registry:snapshot  -> cb:registry:snapshot
 * ============================================================================
 */
(function(root, factory){
  root.Registry = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  const JSON_PATHS = {
    buildings : 'data/buildings.json',
    units     : 'data/units.json',
    balance   : 'data/balance.json'
  };

  function emit(name, detail={}) { window.dispatchEvent(new CustomEvent(name, { detail })); }
  const byId = (list, id) => list.find(e => e.id === id) || null;

  // ---------- Normalisierung für buildings.json ----------
  function normalizeBuildings(payload){
    // Fall A: direkt ein Array
    if (Array.isArray(payload)) {
      return { buildings: payload, categories: [], iconsBase: '' };
    }
    // Fall B: Wrapper-Objekt
    if (payload && typeof payload === 'object') {
      const buildings  = Array.isArray(payload.buildings)  ? payload.buildings  : [];
      const categories = Array.isArray(payload.categories) ? payload.categories : [];
      const iconsBase  = typeof payload.iconsBase === 'string' ? payload.iconsBase : '';
      return { buildings, categories, iconsBase };
    }
    // Fallback
    return { buildings: [], categories: [], iconsBase: '' };
  }

  class RegistryClass {
    constructor(){
      this._data = { buildings: [], units: [], balance: {} };
      this._meta = { categories: [], iconsBase: '' };
      this._ready = false;
    }

    async init(loadJSON){
      const [bRaw, units, balance] = await Promise.all([
        loadJSON(JSON_PATHS.buildings).catch(()=>null),
        loadJSON(JSON_PATHS.units).catch(()=>[]),
        loadJSON(JSON_PATHS.balance).catch(()=>({}))
      ]);

      const B = normalizeBuildings(bRaw || []);
      // Grundsäuberung: epoche-Wert in Zahl gießen, defaults setzen
      this._data.buildings = B.buildings.map(e => ({
        ...e,
        epoche: Number(e.epoche || 1)
      }));
      this._meta.categories = B.categories;
      this._meta.iconsBase  = B.iconsBase;

      this._data.units   = Array.isArray(units) ? units : [];
      this._data.balance = (balance && typeof balance === 'object') ? balance : {};

      this._ready = true;
      emit('cb:registry:ready', { ok:true, counts:{
        buildings: this._data.buildings.length,
        units: this._data.units.length
      }});
    }

    isReady(){ return this._ready; }

    list(kind, {epoche=null, category=null} = {}){
      let src = (kind === 'units') ? this._data.units : this._data.buildings;
      if (epoche   != null) src = src.filter(e => Number(e.epoche||1) === Number(epoche));
      if (category != null) src = src.filter(e => (e.category||'') === category);
      return src.slice();
    }

    get(kind, id){ return byId((kind==='units')?this._data.units:this._data.buildings, id); }

    balance(){ return this._data.balance; }
    categories(){ return this._meta.categories.slice(); }
    iconsBase(){ return this._meta.iconsBase; }

    snapshot(){
      return {
        data: JSON.parse(JSON.stringify(this._data)),
        meta: JSON.parse(JSON.stringify(this._meta))
      };
    }
  }

  const REG = new RegistryClass();

  window.addEventListener('req:registry:snapshot', ()=>{
    emit('cb:registry:snapshot', { snapshot: REG.snapshot() });
  });

  return REG;
});
