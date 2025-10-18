/* ============================================================================
 * Datei   : core/eventbus.js
 * Projekt : Neue Siedler
 * Version : v1.0.0
 * Zweck   : Kleiner EventBus (emit/on/off/once), Wrapper um window-Events
 * Hinweis : Optional – wenn nicht eingebunden, nutzen Module window.addEventListener direkt.
 * ============================================================================ */
(function(){
  if (window.EventBus) return; // Singleton-Guard

  const toEvent = (name) => String(name || '');
  const EventBus = {
    emit(name, detail){
      window.dispatchEvent(new CustomEvent(toEvent(name), { detail }));
    },
    on(name, handler){
      const n = toEvent(name);
      const fn = (ev)=> handler(ev?.detail, ev);
      window.addEventListener(n, fn);
      // Rückgabe zum komfortablen Deregistrieren
      return () => window.removeEventListener(n, fn);
    },
    once(name, handler){
      const n = toEvent(name);
      const fn = (ev)=>{ window.removeEventListener(n, fn); handler(ev?.detail, ev); };
      window.addEventListener(n, fn, { once:true });
    },
    off(name, handler){
      window.removeEventListener(toEvent(name), handler);
    }
  };

  window.EventBus = EventBus;
  (window.CBLog?.ok || console.log)('[eventbus] bereit');
})();
