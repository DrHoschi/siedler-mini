/* ============================================================================
 * Datei: assets/core/game.bootstrap.js  (Ausschnitt – EVENTS für Inspector-Tests)
 * Version: v17.7.8-tests-bridge
 * Zweck: Konsumiert Test-Events vom Inspector und delegiert an Spielsysteme
 * ========================================================================= */

(function(){
  "use strict";
  const MOD = "[bootstrap.tests]";
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const info = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // Helper: HQ/Depot finden (sehr defensiv)
  function findHQandDepot(){
    try{
      const ents = window.Game?.getEntities?.() || [];
      let hq = null, depot = null;
      for (const e of ents){
        const id = (e?.id || e?.type || "").toLowerCase();
        if (!hq && (id==="hq" || id==="hauptquartier")) hq = e;
        if (!depot && id==="depot") depot = e;
      }
      return { hq, depot };
    }catch(_){ return { hq:null, depot:null }; }
  }

  // Pfad-Test: HQ ⇄ Depot
  window.addEventListener("cb:test:path-hq-depot", ()=>{
    const { hq, depot } = findHQandDepot();
    if (!hq || !depot){
      warn("HQ/Depot nicht gefunden.");
      window.dispatchEvent(new CustomEvent("cb:test:err", { detail:{ msg:"HQ/Depot nicht gefunden" } }));
      return;
    }
    // Versuche Pfadfinder zu benutzen (API unbekannt → defensiv):
    try{
      const pf  = window.PathFinder || window.Game?.pathfinder;
      const res = pf?.findPath
        ? pf.findPath({ from:{tx:hq.tx,ty:hq.ty}, to:{tx:depot.tx,ty:depot.ty} })
        : null;

      if (res && res.path && res.path.length){
        ok("Pfad gefunden HQ→Depot, Länge:", res.path.length);
        // Falls OverlayHooks Heatmap/Highlight hat:
        try{ window.OverlayHooks?.highlight?.(res.path); }catch(_){}
        window.dispatchEvent(new CustomEvent("cb:test:ok", { detail:{ msg:`Pfad HQ→Depot Länge=${res.path.length}` } }));
      } else {
        warn("Kein Pfad zurückgegeben.");
        window.dispatchEvent(new CustomEvent("cb:test:warn", { detail:{ msg:"Pfad nicht gefunden / leer" } }));
      }
    }catch(e){
      warn("Pfad-Test Fehler:", e?.message||e);
      window.dispatchEvent(new CustomEvent("cb:test:err", { detail:{ msg:"Pfad-Test Fehler" } }));
    }
  });

  // Carrier-Test: HQ ⇄ Depot, count Zyklen
  window.addEventListener("cb:test:carrier-hq-depot", (ev)=>{
    const count = Math.max(1, ev.detail?.count|0 || 1);
    const { hq, depot } = findHQandDepot();
    if (!hq || !depot){
      warn("Carrier-Test: HQ/Depot nicht gefunden");
      window.dispatchEvent(new CustomEvent("cb:test:err", { detail:{ msg:"Carrier: HQ/Depot fehlt" } }));
      return;
    }
    try{
      // Mögliche APIs: Game.Carriers.spawn / Game.spawnCarrier / Carriers.spawn …
      const spawn = window.Game?.Carriers?.spawn
                 || window.Game?.spawnCarrier
                 || window.Carriers?.spawn;

      if (typeof spawn !== "function"){
        warn("Keine Carrier-Spawn-API gefunden.");
        window.dispatchEvent(new CustomEvent("cb:test:warn", { detail:{ msg:"Carrier-API fehlt" } }));
        return;
      }

      for (let i=0;i<count;i++){
        spawn({ from:{tx:hq.tx,ty:hq.ty}, to:{tx:depot.tx,ty:depot.ty}, loop:true });
      }
      ok(`Carrier-Test gestartet (Zyklen=${count})`);
      window.dispatchEvent(new CustomEvent("cb:test:ok", { detail:{ msg:`Carrier gestartet (x${count})` } }));
    }catch(e){
      warn("Carrier-Test Fehler:", e?.message||e);
      window.dispatchEvent(new CustomEvent("cb:test:err", { detail:{ msg:"Carrier-Test Fehler" } }));
    }
  });

  // Stopp
  window.addEventListener("cb:test:stop", ()=>{
    try{
      window.Game?.Carriers?.stopAll?.();
      ok("Tests gestoppt.");
      window.dispatchEvent(new CustomEvent("cb:test:ok", { detail:{ msg:"Tests gestoppt" } }));
    }catch(_){
      window.dispatchEvent(new CustomEvent("cb:test:warn", { detail:{ msg:"Kein Stop-Hook vorhanden" } }));
    }
  });

  info("Test-Event-Bridge aktiv.");
})();
