/* =============================================================================
   Datei: assets/inspector/inspector.api-compat.js
   Version: v1.3.2
   Zweck:
     - Ergänzt eine minimale Inspector-API, falls eure Module nur Events feuern.
     - Überschreibt NICHTS, wenn bereits eine API existiert.
============================================================================= */

/* ---------------------------------- Imports --------------------------------- */
// (keine)

/* --------------------------------- Hauptlogik -------------------------------- */
(function(){
  const log = (m)=> (window.CBLog?.info||console.log)(`[inspector.compat] ${m}`);

  if (window.Inspector && typeof window.Inspector.toggle === "function"){
    log("API vorhanden – kein Shim nötig");
    return;
  }

  function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(_){ } }

  window.Inspector = {
    open:   (src)=> emit("cb:inspector:open",  {from:src||"api"}),
    close:  (src)=> emit("cb:inspector:close", {from:src||"api"}),
    toggle: (src)=>{
      // alle bekannten Toggle-Namen abfeuern (alt/legacy/neu)
      emit("inspector:toggle",{from:src||"api"});
      emit("cb:inspector-toggle",{from:src||"api"});
      emit("cb:inspector:toggle",{from:src||"api"});
    },
    setTab: (tab)=> emit("cb:inspector:tab:change",{tab:String(tab||"logs")})
  };

  log("Shim aktiv (v1.3.2)");
})();
/* =============================================================================
   inspector.api-compat.js – ergänzt API nur, wenn keine vorhanden
============================================================================= */
(function(){
  const log = (m)=> (window.CBLog?.info||console.log)(`[inspector.compat] ${m}`);
  if (window.Inspector && typeof window.Inspector.toggle === "function"){ log("API vorhanden – kein Shim nötig"); return; }

  function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(_){ } }

  window.Inspector = {
    open:   (src)=> emit("cb:inspector:open",  {from:src||"api"}),
    close:  (src)=> emit("cb:inspector:close", {from:src||"api"}),
    toggle: (src)=>{
      ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"]
        .forEach(e=>emit(e,{from:src||"api"}));
    },
    setTab: (tab)=> emit("cb:inspector:tab:change",{tab:String(tab||"logs")})
  };

  log("Shim aktiv");
})();
/* =============================================================================
   Datei: assets/inspector/inspector.api-compat.js
   Zweck: Ergänzt eine minimal-API, falls eure Module keine globale API binden.
   Überschreibt NICHTS, wenn bereits window.Inspector.toggle vorhanden ist.
============================================================================= */
(function(){
  const log = (m)=> (window.CBLog?.info || console.log)(`[inspector.compat] ${m}`);
  if (window.Inspector && typeof window.Inspector.toggle === "function"){ log("API vorhanden – kein Shim nötig"); return; }

  function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(_){ } }

  window.Inspector = {
    open:   (src)=> emit("cb:inspector:open",  {from:src||"api"}),
    close:  (src)=> emit("cb:inspector:close", {from:src||"api"}),
    toggle: (src)=> {
      // Feuert ALLE bekannten Toggle-Events (entspricht deinem funktionierenden Stand)
      emit("inspector:toggle",{from:src||"api"});      // alt
      emit("cb:inspector-toggle",{from:src||"api"});   // legacy
      emit("cb:inspector:toggle",{from:src||"api"});   // neu
    },
    setTab: (tab)=> emit("cb:inspector:tab:change",{tab:String(tab||"logs")})
  };

  log("Shim aktiv");
})();
