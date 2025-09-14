/* ============================================================================
 * Neue Siedler – Entities Registry (Legacy-Wrapper)
 * Version: v1.1.1
 * Aufgabe: Für ältere Module/Tests. Reicht alles an Registry weiter.
 * ============================================================================
 */
(function (global){
  const logI = (global.CBLog?.info  || console.log).bind(console, "[entities.registry]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[entities.registry]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[entities.registry]");

  function ensureRegistry(){
    if (!global.Registry || !global.Registry.__ready) { logW("Registry noch nicht bereit – warte auf cb:registry:ready"); return false; }
    return true;
  }

  // Beispiel: Altcode könnte window.EntitiesRegistry?.register('building', {...}) aufrufen
  const EntitiesRegistry = {
    register(type, data){
      if (!ensureRegistry()) return;
      try { global.Registry.register(type, data); }
      catch (e){ logE("register() Fehler:", e); }
    },
    list(kind){ return ensureRegistry() ? global.Registry.list(kind) : []; },
    get(kind,id){ return ensureRegistry() ? global.Registry.get(kind,id) : null; },
    where(kind, pred){ return ensureRegistry() ? global.Registry.where(kind,pred) : []; }
  };

  Object.defineProperty(global, "EntitiesRegistry", { value: EntitiesRegistry, writable:false, configurable:false });
  logI("bereit v1.1.1 – delegiert an Registry");
})(window);
