/*!
 * Datei:  game.js
 * Version: v16.0.6
 * Zweck:  Minimaler Game-Bootstrap, der mit index.html (v16.0.6) harmoniert.
 *
 * Features:
 * - Setzt window.__APP_VERSION__.game = "16.0.6" (für sichtbare Versionslogs).
 * - Exponiert window.GameLoader.start(mapUrl): Promise<void>
 * - Simulierter Tileset/Map-Load mit Logs (nutzt window.__devLog, wenn vorhanden).
 * - Start-Guard intern (mehrfacher Aufruf wird abgefangen).
 */

(function () {
  const VERSION = "16.0.6";

  // Version global sichtbar machen
  if (!window.__APP_VERSION__) window.__APP_VERSION__ = {};
  window.__APP_VERSION__.game = VERSION;

  // Logger abholen (vom Index bereitgestellt), ansonsten Fallback auf console
  const L = window.__devLog || {
    ok:  (m)=>console.log("✅ (ok) "  + m),
    warn:(m)=>console.warn("⚠️ (warn) " + m),
    err: (m)=>console.error("❌ (err) " + m),
  };

  // Hilfsfunktionen (simulierter Asset-Loader)
  async function fakeLoad(name, ms = 200) {
    await new Promise(r => setTimeout(r, ms));
    return name;
  }

  // Canvas/Stage vorbereiten (in echter App: Renderer init)
  function mountStage() {
    const stage = document.getElementById('gameStage');
    if (!stage) return;
    stage.innerHTML = '🎮 Spiel läuft … (Stage initialisiert)';
  }

  let _starting = false;

  window.GameLoader = {
    /**
     * Startet das Spiel:
     * 1) Tileset/Atlas laden (simuliert)
     * 2) Map laden (simuliert)
     * 3) Stage mounten
     */
    async start(mapUrl) {
      if (_starting) {
        L.warn('Start bereits im Gang – erneuter Aufruf ignoriert.');
        return;
      }
      _starting = true;
      try {
        // 1) Tileset / Atlas (simuliert)
        await fakeLoad('Tileset (atlas) OK 1024x1024', 150);
        L.ok('Tileset (atlas) OK 1024x1024');

        // 2) Map laden
        if (!mapUrl) throw new Error('Map-URL fehlt');
        await fakeLoad(`Map OK from ${mapUrl}`, 150);
        L.ok('Map OK size 16x10 tile 64');

        // 3) Stage mounten
        mountStage();
      } catch (e) {
        L.err('Fehler beim Start: ' + (e && e.message || e));
        throw e;
      } finally {
        _starting = false;
      }
    }
  };

  // Direkt nach Laden Info ins Log
  L.ok(`game.js initialisiert (v${VERSION})`);
})();
