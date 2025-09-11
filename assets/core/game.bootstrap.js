/* game.bootstrap.js — v17.8.4 (stabil) */
(function () {
  "use strict";

  const MOD = "[bootstrap]";
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // -------- kleine Helfer ---------------------------------------------------
  function fire(evt, detail){ try{ window.dispatchEvent(new CustomEvent(evt,{detail})); }catch(_){} }
  function $(sel, root=document){ return root.querySelector(sel); }

  // Event-gesteuerter Render-Ticker für core.render.js
  function startRenderLoop(){
    let alive = true;
    function tick(){
      if (!alive) return;
      try { fire("cb:render-frame"); } finally { requestAnimationFrame(tick); }
    }
    requestAnimationFrame(tick);
    return ()=>{ alive = false; };
  }

  // Overlay/Fallback, der ggf. noch über dem Canvas liegt, sicher wegräumen
  function nukeOverlays(){
    ["#inspector-fallback", "#start-panel"].forEach(sel=>{
      const el = $(sel);
      if (el && el.parentNode) el.remove();
    });
  }

  // Map gemäß data-map am Canvas laden (nur zum Validieren/Logging)
  async function ensureMapReachable(canvas){
    const url = canvas?.dataset?.map || canvas?.getAttribute("data-map") || "assets/maps/map-mini.json";
    try{
      const res = await fetch(url, {cache:"no-store"});
      if (!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      info("Map geprüft/geladen: %s", url);
      return { url, data };
    }catch(e){
      err("Map konnte nicht geladen werden → %s", e?.message || e);
      return null;
    }
  }

  // -------- Boot-Flow -------------------------------------------------------
  async function startGame(){
    const canvas = $("#game");
    if (!canvas){ err("Canvas #game fehlt"); return; }

    // 1) etwaige Overlays entfernen (kann sonst „dunkel“ wirken)
    nukeOverlays();

    // 2) Map vorbereiten / validieren
    const map = await ensureMapReachable(canvas);

    // 3) Engine starten (legacy- und moderne Pfade abgedeckt)
    try{
      if (window.CBGame?.start){
        await window.CBGame.start(canvas, map?.url ?? "");
        ok("ready (CBGame.start)");
      } else if (window.Game?.start){
        await window.Game.start(canvas, map?.url ?? "");
        ok("ready (legacy Game.start)");
      } else if (window.Game?.Map?.load && map?.data){
        await window.Game.Map.load(map.data);
        ok("Map in Engine geladen (Game.Map.load)");
      } else {
        warn("Keine bekannte start()-API gefunden – Render-Ticker läuft trotzdem.");
      }
    }catch(e){
      err("Engine-Start fehlgeschlagen: %s", e?.message || e);
    }

    // 4) Render-Ticker auf jeden Fall anschieben
    startRenderLoop();
    // optional: Signal für Tools/Inspector
    fire("cb:map-ready");
  }

  // Modul-Init
  (function init(){
    ok("Modul geladen (v17.8.4)");

    // Starten, wenn ui-start das Event schickt
    window.addEventListener("cb:game-start", startGame, { once:true });

    // Safety: falls jemand autostart wünscht
    if (window.__cb?.autostart === true){
      startGame();
    }
  })();
})();
