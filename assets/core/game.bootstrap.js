/* game.bootstrap.js — v17.8.3 (stabil, bereinigt) */
(function () {
  "use strict";

  // ---- Logging-Helfer -------------------------------------------------------
  const MOD = "[bootstrap]";
  const info = (window.CBLog?.info || console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   || console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  || console.error).bind(console, MOD);

  // Mehrfach-Init verhindern
  if (window.__BOOT_WIRED__) { warn("bereits verkabelt – skip"); return; }
  window.__BOOT_WIRED__ = true;

  // ---- Utils ----------------------------------------------------------------
  const on   = (evt, fn) => { try { window.addEventListener(evt, fn); } catch(_){} };
  const fire = (evt, detail) => { try { window.dispatchEvent(new CustomEvent(evt,{detail})); } catch(_){} };

  // ---- Map-Laden (aus data-map am Canvas) -----------------------------------
  async function loadMapFromCanvas() {
    const cvs = document.getElementById("game");
    if (!cvs) { err("Canvas #game fehlt"); return false; }

    const url = cvs.getAttribute("data-map") || "assets/maps/map-mini.json";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Übergabe an deine Engine (neu/alt)
      if (window.Game?.Map?.load) {
        await window.Game.Map.load(data);
      } else if (window.CBGame?.start) {
        // Fallback – ältere API erwartet direkten Start
        await window.CBGame.start(cvs, url);
      }
      // für Debug/Tests
      window.__CURRENT_MAP__ = data;

      ok(`Map geladen: ${url}`);
      fire("cb:map-ready", { url });
      return true;
    } catch (e) {
      err("Map konnte nicht geladen werden:", e?.message || e);
      return false;
    }
  }

  // ---- Render anschieben (Event-getriebener Ticker) -------------------------
  function startRender() {
    function tick() {
      try { fire("cb:render-frame"); } finally { requestAnimationFrame(tick); }
    }
    tick();
  }

  // ---- Test-/Demo-Brücke (nur Logs, keine harte Abhängigkeit) --------------
  function wireTestBridge() {
    ok("Test-Event-Bridge aktiv.");
    // Beispiel: fire("tests:ready");
  }

  // ---- Start-Panel sauber entfernen -----------------------------------------
  function removeStartPanelIfAny() {
    const sp = document.getElementById("start-panel");
    if (sp && sp.parentNode) { sp.remove(); ok("start-panel entfernt."); }
  }

  // ---- Boot-Sequenz ----------------------------------------------------------
  async function boot() {
    ok("Modul geladen (v17.6.1)");

    // Auf UI-Start warten (Button „Neues Spiel“ feuert cb:game-start)
    on("cb:game-start", async () => {
      removeStartPanelIfAny();

      // Map laden
      await loadMapFromCanvas();

      // Render-Loop starten (falls dein Renderer event-getrieben arbeitet)
      startRender();

      // Tests/Demos
      wireTestBridge();

      ok("ready (v17.6.1) [Legacy-Bridge aktiv]");
    });
  }

  // ---- Optional: Auto-Start für Legacy-Flows --------------------------------
  if (window.__cb?.autostart) {
    // Autostart simuliert den Button-Klick
    setTimeout(() => fire("cb:game-start"), 0);
  }

  // ---- Diagnose (optional einschalten) --------------------------------------
  // Setze window.__BOOT_DIAG__ = true in der Konsole, um einen einmaligen Probe-Load zu sehen.
  if (window.__BOOT_DIAG__) {
    on("cb:game-start", async () => {
      const cvs = document.getElementById("game");
      info("DIAG: cb:game-start empfangen – data-map:", cvs?.dataset?.map || "(leer)");
    });
  }

  // ---- Start -----------------------------------------------------------------
  boot();
})();
