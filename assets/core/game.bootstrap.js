/* game.bootstrap.js — v17.8.4 (stabil & kompatibel) */
(function () {
  "use strict";

  const MOD = "[bootstrap]";
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // kleine Helfer
  const on   = (evt, fn) => { try { window.addEventListener(evt, fn); } catch(_) {} };
  const fire = (evt, detail) => { try { window.dispatchEvent(new CustomEvent(evt, { detail })); } catch(_) {} };

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  }

  // Render-Ticker (nur falls kein Engine-Loop vorhanden)
  function startRenderLoop() {
    function tick() {
      try { fire("cb:render-frame"); } catch (_) {}
      requestAnimationFrame(tick);
    }
    tick();
  }

  // Map-Laden (für den Fallback-Weg)
  async function loadMapDataFromCanvas() {
    const cvs = document.getElementById("game");
    if (!cvs) throw new Error("Canvas #game fehlt");
    const url = cvs.getAttribute("data-map") || "assets/maps/map-mini.json";
    const data = await fetchJSON(url);
    ok("Map geladen: %s", url);
    return { cvs, url, data };
  }

  // Start-Panel garantiert entfernen
  function removeStartPanelIfAny() {
    const sp = document.getElementById("start-panel");
    if (sp && sp.parentNode) {
      sp.remove();
      ok("start-panel entfernt.");
    }
  }

  // Haupteinstieg: Engine richtig starten
  async function startEngine() {
    try {
      removeStartPanelIfAny();

      // Canvas + Map-URL
      const cvs = document.getElementById("game");
      if (!cvs) throw new Error("Canvas #game fehlt");
      const mapUrl = cvs.getAttribute("data-map") || "assets/maps/map-mini.json";

      // 1) Moderner Weg: CBGame.start / Game.start
      if (window.CBGame?.start) {
        await window.CBGame.start(cvs, mapUrl);
        ok("ready (CBGame.start)");
        return;
      }
      if (window.Game?.start) {
        await window.Game.start(cvs, mapUrl);
        ok("ready (legacy Game.start)");
        return;
      }

      // 2) Fallback: Map selbst laden + Engine minimal kicken
      warn("Keine start()-Funktion gefunden → Fallback-Pfad.");
      const { data } = await loadMapDataFromCanvas();

      // Map an bekannte Stellen reichen (je nach deiner Engine)
      try {
        if (window.Game?.Map?.load) {
          await window.Game.Map.load(data);
        } else {
          window.__CURRENT_MAP__ = data; // Notanker
        }
      } catch (e) {
        warn("Game.Map.load nicht verfügbar oder fehlgeschlagen:", e?.message || e);
      }

      // Renderer anschieben, falls kein Loop existiert
      if (!(window.Game?.Engine?.tick)) {
        startRenderLoop();
        ok("Render-Loop (Fallback) aktiv.");
      } else {
        try { window.Game.Engine.tick(); } catch (_) {}
      }

      ok("ready (Fallback)");
    } catch (e) {
      err("Start fehlgeschlagen:", e?.message || e);
    }
  }

  // ---------------------------------------------------------------------------
  // Modul-Lifecycle
  (function init() {
    info("Modul geladen (v17.6.2)");

    // Safety: Sichtbares Fehler-Logging für fehlgeschlagene fetches
    const _fetch = window.fetch;
    window.fetch = async function(url, opts) {
      const res = await _fetch(url, opts);
      if (!res.ok) err("fetch failed:", url, res.status, res.statusText);
      return res;
    };

    // Wenn UI „cb:game-start“ feuert → Engine starten
    on("cb:game-start", startEngine);

    // Optional: Auto-Start, falls gewünscht/konfiguriert
    if (window.__cb?.autostart === true) {
      startEngine();
    }

    // Diagnose: einmalig Loggen, ob Tilesets erreichbar sind
    (async () => {
      try {
        // passe das an dein Tileset an (terrain oder main tileset)
        await fetch("assets/tiles/tileset.terrain.png", { cache: "no-store" });
        ok("Tileset erreichbar (assets/tiles/tileset.terrain.png)");
      } catch {
        warn("Tileset nicht erreichbar → prüfe Pfad/Datei!");
      }
    })();

  })();
})();
