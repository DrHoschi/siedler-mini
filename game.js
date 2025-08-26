/* =========================================================
   Projekt: City-Builder
   Datei:   game.js
   Version: v16.0.6
   Zweck:   Minimal-Bootstrapping + GameLoader API + Debug-Events
   ========================================================= */

(() => {
  const GAME_VERSION = "16.0.6";

  // Kleines internes Log (für Konsolen-Debug; UI-Log macht index.html)
  function klog(...a){ try { console.log("[game.js]", ...a); } catch(_){} }

  // Root-Element, an das das Canvas/Spiel gebunden werden kann
  const root = document.getElementById("game-root") || document.body;

  // ----------------------------------------------------------------------------
  // Minimaler GameLoader — liefert die API, die index.html erwartet.
  // Deine eigentliche Logik kannst du hier nach und nach wieder einhängen.
  // ----------------------------------------------------------------------------
  const GameLoader = {
    _started: false,

    /**
     * Startet das Spiel / lädt die Map.
     * @param {string} mapPath - Pfad zur Map-JSON
     */
    start(mapPath = "./assets/maps/map-mini.json") {
      if (this._started) {
        klog("Start ignoriert (bereits gestartet).");
        return;
      }
      this._started = true;

      // Canvas anlegen (Platzhalter, bis deine Engine rendert)
      const cvs = document.createElement("canvas");
      cvs.width = root.clientWidth || window.innerWidth;
      cvs.height = root.clientHeight || window.innerHeight;
      cvs.style.position = "absolute";
      cvs.style.inset = "0";
      root.appendChild(cvs);

      const ctx = cvs.getContext("2d");
      ctx.fillStyle = "#3f8f4a";
      ctx.fillRect(0,0,cvs.width, cvs.height);
      ctx.font = "16px ui-monospace, monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText("City-Builder v" + GAME_VERSION + " — Map lädt: " + mapPath, 16, 28);

      // --- Hier würdest du nun:
      // 1) Tileset/Atlas laden
      // 2) Map JSON laden
      // 3) Renderer initialisieren
      // Für jetzt nur Dummy-Fetch, damit Fehler sichtbar werden.
      fetch(mapPath, {cache:"no-store"})
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(json => {
          klog("Map geladen:", json);
          // Minimalanzeige
          ctx.fillText("Map OK: " + (json.width || "?") + "x" + (json.height || "?") + " (tile " + (json.tileSize || "?") + ")", 16, 50);
          // Signal an UI wäre dort bereits geschehen (index schreibt selber „Game started“)
        })
        .catch(err => {
          klog("Map Load FAIL:", err);
          ctx.fillStyle = "#b00020";
          ctx.fillText("Map Load FAIL: " + (err.message || err), 16, 50);
          // Fehler fliegt NICHT weiter nach oben, damit UI nicht crasht.
          // (index.html loggt Start/Fehler bereits)
        });

      // Resize (einfach gehalten)
      const onResize = () => {
        cvs.width = root.clientWidth || window.innerWidth;
        cvs.height = root.clientHeight || window.innerHeight;
        ctx.fillStyle = "#3f8f4a";
        ctx.fillRect(0,0,cvs.width, cvs.height);
        ctx.fillStyle = "#fff";
        ctx.fillText("City-Builder v" + GAME_VERSION, 16, 28);
      };
      window.addEventListener("resize", onResize);
    },
  };

  // Exponieren
  window.GameLoader = GameLoader;

  // Editor-Hook / Inspector: index.html toggelt dieses Event
  window.addEventListener('inspector:toggle', () => {
    // Hier kannst du deinen bestehenden Inspector einhängen.
    // Für jetzt: simpler Hinweis in der Konsole.
    klog("Inspector toggled (Hook).");
    alert("Inspector (Hook) – später verknüpfen.");
  });

  // Ready-Signal an die UI
  window.dispatchEvent(new CustomEvent('game:ready', {
    detail: { gameVersion: GAME_VERSION }
  }));

  // Zusätzlich: sichtbare Konsole
  klog(`game.js init done (v${GAME_VERSION})`);
})();
