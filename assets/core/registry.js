/* ============================================================================
 * Neue Siedler – Core Registry
 * Version: v1.2.0
 * Aufgabe: Zentrale Datenhaltung (Buildings, Kategorien, …)
 * Events:  cb:registry:ready   – wenn Registry initialisiert ist
 *          cb:registry:update  – bei Updates
 * ============================================================================
 */
(function initRegistry (global) {
  const logI = (global.CBLog?.info  || console.log).bind(console, "[registry]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[registry]");

  if (global.Registry && global.Registry.__ready) {
    logW("bereits initialisiert – skip");
    dispatch("cb:registry:ready", { ready: true });
    return;
  }

  // --- Helpers --------------------------------------------------------------
  function dispatch(type, detail) {
    try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch { /* noop */ }
  }
  function deepFreeze(o){ Object.freeze(o); Object.getOwnPropertyNames(o).forEach(p=>{
    if (o[p] && typeof o[p]==="object" && !Object.isFrozen(o[p])) deepFreeze(o[p]);
  }); return o; }

  // --- Datenmodell ----------------------------------------------------------
  // Pfade und IDs gemäß deiner aktuellen File-Liste (alles in assets/buildings/, lowercase)
  const CATEGORIES = [
    { id:"admin",   name:"Allg. / Verwaltung",   sort:10 },
    { id:"food",    name:"Produktion / Nahrung", sort:20 },
    { id:"raw",     name:"Produktion / Rohstoffe", sort:30 },
    // weitere Kategorien können später ergänzt werden
  ];

  const BUILDINGS = [
    // Verwaltung
    { id:"rathaus",   name:"Rathaus",    cat:"admin", sprite:"assets/buildings/rathaus_wood1.png",  enabled:true,  size:[1,1], place:"place-rathaus" },
    { id:"house",     name:"Wohnhaus",   cat:"admin", sprite:"assets/buildings/wohnhaus_wood0_ug0.png", enabled:true, size:[1,1], place:"place-house" },
    { id:"depot",     name:"Depot",      cat:"admin", sprite:"assets/buildings/depot_wood.png",   enabled:true,  size:[1,1], place:"place-depot" },

    // Nahrung
    { id:"fischer",   name:"Fischer",    cat:"food",  sprite:"assets/buildings/fischer_wood1.png", enabled:true,  size:[1,1], place:"place-fisher" },
    { id:"farm",      name:"Farm",       cat:"food",  sprite:"assets/buildings/farm_wood.png",     enabled:true,  size:[1,1], place:"place-farm" },
    { id:"muehle",    name:"Mühle",      cat:"food",  sprite:"assets/buildings/windmuehle_wood.png",enabled:true, size:[1,1], place:"place-mill" },

    // Rohstoffe
    { id:"lumberjack",name:"Holzfäller", cat:"raw",   sprite:"assets/buildings/lumberjack_wood.png", enabled:true, size:[1,1], place:"place-lumberjack" },
    { id:"steinmetz", name:"Steinmetz",  cat:"raw",   sprite:"assets/buildings/steinmetz_wood.png",  enabled:true, size:[1,1], place:"place-stonecutter" },
    { id:"schmied",   name:"Schmied",    cat:"raw",   sprite:"assets/buildings/schmied_wood0.png",   enabled:true, size:[1,1], place:"place-smith" },

    // Optional vorhandene Assets – bleiben vorerst deaktiviert (können im Inspector aktiviert werden)
    { id:"baecker",   name:"Bäcker",     cat:"food",  sprite:"assets/buildings/baecker_wood.png",   enabled:false, size:[1,1], place:"place-bakery" },
    { id:"wachtturm", name:"Wachturm",   cat:"admin", sprite:"assets/buildings/wachturm_wood.png",  enabled:false, size:[1,1], place:"place-tower" },
    { id:"hq",        name:"HQ",         cat:"admin", sprite:"assets/tex/building/wood/hq_wood.PNG",enabled:false, size:[2,2], place:"place-hq" }
  ];

  // --- API ------------------------------------------------------------------
  const _state = {
    categories: [...CATEGORIES],
    buildings:  [...BUILDINGS],
  };

  const Registry = {
    version: "1.2.0",
    __ready: true,

    list(kind){
      if (kind==="categories") return _state.categories.slice().sort((a,b)=>a.sort-b.sort);
      if (kind==="buildings")  return _state.buildings.slice();
      logW("unbekannte list-Art:", kind); return [];
    },
    where(kind, pred){
      const src = kind==="categories" ? _state.categories : kind==="buildings" ? _state.buildings : [];
      if (!src.length) { logW("where(): unbekannte Art", kind); return []; }
      return src.filter(entry=>{
        return Object.keys(pred||{}).every(k => entry[k]===pred[k]);
      });
    },
    get(kind, id){
      const src = kind==="categories" ? _state.categories : kind==="buildings" ? _state.buildings : [];
      return src.find(e=>e.id===id) || null;
    },
    upsert(kind, item){
      const list = kind==="categories" ? _state.categories : kind==="buildings" ? _state.buildings : null;
      if (!list) { logW("upsert(): unbekannte Art", kind); return; }
      const i = list.findIndex(e=>e.id===item.id);
      if (i>=0) list[i] = { ...list[i], ...item };
      else list.push(item);
      dispatch("cb:registry:update", { kind, id:item.id });
    },

    // Legacy-Brücke für altes entities.registry.js:
    register(type, payload){
      if (type==="building") return Registry.upsert("buildings", payload);
      if (type==="category") return Registry.upsert("categories", payload);
      logW("register(): unbekannter type", type);
    },

    freeze(){ return deepFreeze(_state); } // readonly View
  };

  Object.defineProperty(global, "Registry", { value: Registry, writable:false, configurable:false });
  logI(`bereit v${Registry.version} (Kategorien: ${_state.categories.length} , Gebäude: ${_state.buildings.length})`);
  dispatch("cb:registry:ready", { ready:true, counts:{ categories:_state.categories.length, buildings:_state.buildings.length }});
})(window);
