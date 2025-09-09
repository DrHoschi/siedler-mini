/* game.bootstrap.js — v17.8.3 (stabil) */
(function(){
  "use strict";
  const MOD='[bootstrap]';
  const ok  =(m)=> (window.CBLog?.ok||console.log)(`${MOD} ${m}`);
  const warn=(m)=> (window.CBLog?.warn||console.warn)(`${MOD} ${m}`);

  // kleine Helfer
  function on(evt, fn){ try{ window.addEventListener(evt, fn); }catch(_){} }
  function fire(evt, detail){ try{ window.dispatchEvent(new CustomEvent(evt,{detail})); }catch(_){} }

  // Map laden (Datei aus data-map am Canvas)
  async function loadMapFromCanvas(){
    const cvs = document.getElementById("game");
    const url = cvs?.getAttribute("data-map") || "assets/maps/map-mini.json";
    try{
      const res = await fetch(url, { cache:"no-store" });
      const data = await res.json();
      // Übergib der Engine
      if(window.Game?.Map?.load) { await window.Game.Map.load(data); }
      // Falls deine Engine nur Overlay-Hooks nutzt:
      window.__CURRENT_MAP__ = data;
      return true;
    }catch(e){
      warn("Map konnte nicht geladen werden: "+(e&&e.message));
      return false;
    }
  }

  // Render anschieben (ein einfacher Ticker → Event-gesteuert zeichnen)
  function startRender(){
    // Deine Renderer-Datei registriert auf 'cb:render-frame'
    function tick(){ try{ fire('cb:render-frame'); requestAnimationFrame(tick); }catch(_){ requestAnimationFrame(tick); } }
    tick();
  }

  // Demo: Carrier/Tests brücken (damit bekannte Demos wieder funktionieren)
  function wireTestBridge(){
    // Tests feuern eigene Logs; hier nur „Brücke“, damit nichts crasht
    ok("Test-Event-Bridge aktiv.");
  }

  async function boot(){
    ok("Modul geladen (v17.6.1)");

    // Reihenfolge:
    // 1) Renderer initialisiert sich selbst beim Laden (core.render.js)
    // 2) Map laden (nach cb:game-start)
    // 3) UI & Build getrennt

    on('cb:game-start', async ()=>{
      // Map
      await loadMapFromCanvas();
      // Render-Loop
      startRender();
      // Tests/Demos anklemmen
      wireTestBridge();
      ok("ready (v17.6.1) [Legacy-Bridge aktiv]");
    });
  }

  boot();
// === DIAGNOSE: Map-Start sichtbar machen =========================
(function(){
  try{
    // nur einmal verkabeln
    if (window.__MAP_DIAG_WIRED__) return;
    window.__MAP_DIAG_WIRED__ = true;

    const ok   = (window.CBLog?.ok   || console.log).bind(console, "[map]");
    const info = (window.CBLog?.info || console.log).bind(console, "[ui-start]");
    const err  = (window.CBLog?.err  || console.error).bind(console, "[map]");

    async function tryLoadMap(){
      const canvas = document.getElementById("game");
      const url = canvas?.dataset?.map;
      info("Start → %s", url || "(kein data-map)");

      if (!url){
        err("Kein data-map am #game Canvas gefunden.");
        return;
      }
      try{
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP "+res.status);
        await res.json(); // nur zum Validieren
        ok("geladen: %s", url);
        // Optional: nach erfolgreichem Laden Event senden
        try { window.dispatchEvent(new CustomEvent("cb:map-ready", { detail:{ url } })); } catch(_){}
      }catch(e){
        err("Laden fehlgeschlagen: %s → %s", url, e && e.message || e);
      }
    }

    // Wenn das UI startbereit ist, versuchen wir den Map-Load anzustoßen
    window.addEventListener("cb:game-start", tryLoadMap);

    // Falls dein Button bereits cb:game-start gefeuert hat, sofort testen:
    // (z.B. wenn dieses Snippet später geladen wurde)
    setTimeout(()=>{
      try {
        // kleiner Probelauf, ohne doppelt zu nerven
        tryLoadMap();
      } catch(_){}
    }, 0);

  }catch(_){}
})();
