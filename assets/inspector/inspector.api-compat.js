/* =============================================================================
Datei: assets/inspector/inspector.api-compat.js
Version: v1.3.2
Ziel: Ergänzt eine minimale API, falls eure Module nur über Events arbeiten.
      Überschreibt NICHTS, wenn bereits eine API existiert.
============================================================================= */
(function(){
  const logI = (m)=> (window.CBLog?.info||console.log)(`[inspector.compat] ${m}`);
  if (window.Inspector && typeof window.Inspector.toggle === "function"){ logI("API vorhanden – kein Shim nötig"); return; }

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

  logI("Shim aktiv (v1.3.2)");
})();
