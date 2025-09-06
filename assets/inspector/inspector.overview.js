/* ============================================================================
 * Datei: assets/inspector/inspector.overview.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck:
 *   - Neuer Tab "Übersicht" mit Live-Runtime-Werten:
 *       • FPS (rAF + cb:render-frame-Fallback)
 *       • Canvas-Größe (CSS/Backbuffer), devicePixelRatio
 *       • Map-Name (data-map bzw. Game?.getMapName)
 *       • Entities (Game?.getEntities().length)
 *
 * Einbindung:
 *   <script defer src="assets/inspector/inspector.overview.js?v=18.11.0"></script>
 *
 * Abhängigkeit:
 *   - inspector.core.js stellt window.__INSPECTOR_CORE__.api bereit:
 *       • core.api.mount(tabId, renderFn)
 *       • core.api.getSlot(name)  -> bevorzugt ('overview-body'), sonst Fallback
 *       • core.api.signal(name, payload) (optional)
 *   - Keine harten Game-Abhängigkeiten (defensiv).
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.overview]";
  const VER = "v18.11.0";

  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function"){
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // -- Hilfsfunktionen -------------------------------------------------------
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  function qSlot(name){
    // Primär Slot-API des Core, sonst defensiv im Panel suchen
    return core.api.getSlot?.(name)
        || document.getElementById(`ins-${name}`)
        || document.querySelector(`#inspector .slot-${name}`)
        || document.querySelector(`#inspector .ins-body`);
  }

  function getCanvas(){
    return document.getElementById("game") || null;
  }
  function getMapName(){
    try{
      // 1) aus Canvas-Attribut
      const c = getCanvas();
      const url = c?.getAttribute("data-map") || "";
      if (url) return url.split("/").pop();
    }catch(_){}
    try{
      // 2) aus Game-API
      if (window.Game?.getMapName) return window.Game.getMapName();
    }catch(_){}
    return "(unbekannt)";
  }
  function getEntityCount(){
    try{
      if (window.Game?.getEntities){
        const list = window.Game.getEntities();
        return Array.isArray(list) ? list.length : 0;
      }
    }catch(_){}
    return 0;
  }

  // -- FPS / Takt ------------------------------------------------------------
  const fpsState = {
    rafId: null,
    last: performance.now(),
    samples: [],
    avg: 0,
    attachedFrameListener: false,
  };

  function sampleFPS(){
    const now = performance.now();
    const dt  = now - fpsState.last;
    fpsState.last = now;
    const fps = dt > 0 ? 1000 / dt : 0;
    fpsState.samples.push(fps);
    if (fpsState.samples.length > 30) fpsState.samples.shift();
    fpsState.avg = Math.round(
      fpsState.samples.reduce((a,b)=>a+b,0) / Math.max(1,fpsState.samples.length)
    );
  }

  function loop(){
    sampleFPS();
    fpsState.rafId = window.requestAnimationFrame(loop);
  }

  function attachFrameFallback(){
    if (fpsState.attachedFrameListener) return;
    try{
      window.addEventListener("cb:render-frame", sampleFPS);
      fpsState.attachedFrameListener = true;
    }catch(_){}
  }

  function detachFrameFallback(){
    if (!fpsState.attachedFrameListener) return;
    try{
      window.removeEventListener("cb:render-frame", sampleFPS);
    }catch(_){}
    fpsState.attachedFrameListener = false;
  }

  // -- UI --------------------------------------------------------------------
  function renderOverview(){
    const host = qSlot("overview-body");
    if (!host) return;

    // Reset
    host.innerHTML = "";

    // Layout
    const box = document.createElement("div");
    box.className = "ins-grid";
    // 2-Spalten Key/Value
    const addKV = (k, v, id=null)=>{
      const row = document.createElement("div");
      row.className = "kv";
      const l = document.createElement("div");
      const r = document.createElement("div");
      l.className = "k"; r.className = "v";
      l.textContent = k; r.textContent = v;
      if (id) r.id = id;
      row.append(l,r);
      box.appendChild(row);
    };

    const cvs = getCanvas();
    const cssW = cvs ? (cvs.clientWidth|0)  : 0;
    const cssH = cvs ? (cvs.clientHeight|0) : 0;
    const bufW = cvs?.width|0;
    const bufH = cvs?.height|0;
    const dpr  = (window.devicePixelRatio||1).toFixed(2);

    addKV("FPS",               "--",       "ov-fps");
    addKV("Canvas (CSS)",      `${cssW} × ${cssH}px`);
    addKV("Canvas (Buffer)",   `${bufW} × ${bufH}px`);
    addKV("devicePixelRatio",  String(dpr));
    addKV("Map",               getMapName(), "ov-map");
    addKV("Entities",          String(getEntityCount()), "ov-ent");

    host.appendChild(box);
  }

  function tickOverviewUI(){
    const fpsEl = document.getElementById("ov-fps");
    if (fpsEl) fpsEl.textContent = String(fpsState.avg);

    const mapEl = document.getElementById("ov-map");
    if (mapEl) mapEl.textContent = getMapName();

    const entEl = document.getElementById("ov-ent");
    if (entEl) entEl.textContent = String(getEntityCount());
  }

  let uiTimer = null;

  // -- Mount -----------------------------------------------------------------
  core.api.mount("overview", ()=>{
    renderOverview();

    // FPS-Loop (rAF) + Fallback-Hook auf Engine-Events
    fpsState.last = performance.now();
    fpsState.samples.length = 0;
    if (!fpsState.rafId) fpsState.rafId = window.requestAnimationFrame(loop);
    attachFrameFallback();

    // UI-Refresh
    uiTimer = window.setInterval(tickOverviewUI, 500);

    core.api?.signal?.("overview:ready", { version: VER });
    ok("bereit", VER);

    // Unmount
    return ()=>{
      if (fpsState.rafId){ cancelAnimationFrame(fpsState.rafId); fpsState.rafId = null; }
      detachFrameFallback();
      if (uiTimer){ clearInterval(uiTimer); uiTimer = null; }
    };
  });

})();
