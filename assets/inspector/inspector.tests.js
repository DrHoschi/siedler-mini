/* ============================================================================
 * Datei: assets/inspector/inspector.tests.js
 * Projekt: Siedler-Mini
 * Version: v18.11.3
 *
 * Zweck:
 *  - Live-Status im TESTS-Tab (FPS, TPS, Entities, Canvas, Input, Map, Versionen)
 *  - Keine Seiteneffekte; arbeitet nur lesend + eigene Timer
 *
 * Abhängigkeiten:
 *  - inspector.core.js  -> window.__INSPECTOR_CORE__.api.mount/getSlot/signal
 *  - Optionale Signale/Ereignisse:
 *      • 'cb:render-frame'  (wenn eure Engine das feuert)
 *      • 'cb:tick'          (optional; falls ihr einen Game-Tick auslöst)
 *  - Optionale Game/Render APIs:
 *      • window.Render.getContext()
 *      • window.Game.getEntities(), window.Game.getCamera(), window.Game.getTileSize()
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.tests]";
  const VER = "v18.11.3";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // ---- kleine Helfer -------------------------------------------------------
  const log = (...a) => (window.CBLog?.ok || console.log)(MOD, ...a);

  function qSlot(name) {
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // ---- Messung: FPS/TPS ----------------------------------------------------
  let frames = 0, ticks = 0;
  let fps = 0, tps = 0;
  let fpsTimer = null;

  function startMeters() {
    stopMeters();

    // Wenn eure Engine Events feuert, zählen wir komfortabel mit
    window.addEventListener("cb:render-frame", onFrame, { passive: true });
    window.addEventListener("cb:tick", onTick, { passive: true });

    // Fallback: falls nichts feuert, versuchen wir per rAF Frames mitzuzählen
    let rafId = null;
    (function rafLoop(){
      frames++;
      rafId = window.requestAnimationFrame(rafLoop);
    })();
    // speichern, damit wir es stoppen können
    window.__INS_TESTS_RAF__ = rafId;

    // 1-Sekunden-Fenster
    fpsTimer = setInterval(() => {
      fps = frames; frames = 0;
      tps = ticks;  ticks  = 0;
      // UI wird im render() aktualisiert
    }, 1000);
  }
  function stopMeters() {
    window.removeEventListener("cb:render-frame", onFrame);
    window.removeEventListener("cb:tick", onTick);
    clearInterval(fpsTimer); fpsTimer = null;
    if (window.__INS_TESTS_RAF__) {
      cancelAnimationFrame(window.__INS_TESTS_RAF__);
      window.__INS_TESTS_RAF__ = null;
    }
  }
  function onFrame(){ frames++; }
  function onTick(){ ticks++; }

  // ---- UI ------------------------------------------------------------------
  let viewEl = null;
  let uiTimer = null;

  function mountView() {
    const host = qSlot("tests-view");
    if (!host) return;
    host.innerHTML = "";

    // Wir nutzen dasselbe „Karten“-Layout wie Logs (heller Kasten)
    const box = document.createElement("div");
    box.className = "ins-logview"; // bewusst, weil es bereits schön gestylt ist
    box.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    box.style.fontSize = "14px";
    box.style.lineHeight = "1.45";
    host.appendChild(box);
    viewEl = box;
  }

  function render() {
    if (!viewEl) return;

    const ctx = window.Render?.getContext?.() || null;
    const cvs = ctx?.canvas || document.getElementById("game") || null;

    const ents = (window.Game?.getEntities?.() || []);
    const cam  = (window.Game?.getCamera?.() || { x:0, y:0, zoom:1 });
    const tile = (window.Game?.getTileSize?.() || 64);
    const mapName = (document.getElementById("game")?.dataset?.map || "–");

    const ok = (s) => `<span style="color:#27AE60">●</span> ${s}`;
    const no = (s) => `<span style="color:#E74C3C">●</span> ${s}`;

    // Best-Effort Status
    const hasCtx   = !!ctx;
    const hasInput = !!window.Input || !!window.Game?.input;
    const hasMap   = !!mapName && mapName !== "–";

    const rows = [
      `<div style="margin-bottom:8px;"><strong>Live-Status</strong> (Tests v${VER})</div>`,

      `<div><strong>FPS / TPS:</strong> ${fps} / ${tps}</div>`,

      `<div><strong>Canvas:</strong> ${cvs ? `${cvs.width}×${cvs.height}` : "–"}</div>`,
      `<div><strong>Render-Context:</strong> ${hasCtx ? ok("ok") : no("fehlt")}</div>`,

      `<div><strong>Entities:</strong> ${ents.length}</div>`,
      `<div><strong>Camera:</strong> x=${cam.x|0}, y=${cam.y|0}, zoom=${(cam.zoom||1).toFixed(2)}</div>`,
      `<div><strong>Tile-Size:</strong> ${tile}</div>`,

      `<div><strong>Map:</strong> ${hasMap ? ok(mapName) : no("unbekannt")}</div>`,
      `<div><strong>Input:</strong> ${hasInput ? ok("gebunden") : no("fehlt")}</div>`,

      `<hr style="border:none;border-top:1px solid rgba(0,0,0,.1);margin:10px 0;">`,

      `<div style="opacity:.8">
         <strong>Module:</strong>
         Render ${window.Render?.version || "?"} ·
         Inspector ${window.__INSPECTOR_CORE__?.version || "?"}
       </div>`
    ];

    viewEl.innerHTML = rows.join("");
  }

  // ---- Mount ins Inspector-Tab --------------------------------------------
  core.api.mount("tests", () => {
    mountView();
    startMeters();

    // Regelmäßig die Werte aktualisieren
    uiTimer = setInterval(render, 300);
    render();

    // Meldung nach „außen“
    core.api?.signal?.("tests:ready", { version: VER });
    log("bereit", VER);

    // Unmount/Cleanup
    return () => {
      stopMeters();
      clearInterval(uiTimer); uiTimer = null;
    };
  });
})();
