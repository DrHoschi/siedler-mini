// ============================================================================
// Datei: boot.js
// Projekt: Neue Siedler
// Version: v19.3.1 (Kompat-Events + starke Logs)
// Zweck:
//   • Bootstrapping & Event-Wiring (UI ⇄ Boot ⇄ Core)
//   • Reihenfolge: DOMReady → Assets.loadAll → Registry.init → Game.init
//   • Reagiert auf cb:start:new|continue|reset|fullscreen
// Zusatz:
//   • Kompatibilitäts-Listener (cb:assets:ready → cb:assets-ready u. ä.)
// ============================================================================

(() => {
  const on  = (n, cb) => window.addEventListener(n, cb);
  const EVT = (n, detail) => window.dispatchEvent(new CustomEvent(n, { detail }));

  let assetsReady   = false;
  let registryReady = false;

  function maybeReady() {
    if (assetsReady && registryReady) {
      (window.CBLog?.ok || console.log)('[boot] ready → UI darf starten');
      EVT('cb:boot-ready');
    }
  }

  // DOM → init
  window.addEventListener('DOMContentLoaded', () => {
    (window.CBLog?.ok || console.log)('[boot] DOM ready');

    // Prüfen, ob boot.js wirklich geladen wurde (du siehst diesen Log)
    const canvas = document.getElementById('game');
    if (!canvas) {
      (window.CBLog?.err || console.error)('[boot] #game Canvas fehlt! index.html prüfen.');
      return;
    }

    try { Game.init(canvas); }
    catch (e) { (window.CBLog?.err || console.error)('[boot] Game.init Fehler:', e); }

    try { Assets.loadAll(); }
    catch (e) { (window.CBLog?.err || console.error)('[boot] Assets.loadAll Fehler:', e); }

    try { Registry.init(); }
    catch (e) { (window.CBLog?.err || console.error)('[boot] Registry.init Fehler:', e); }
  });

  // Offizielle Events
  on('cb:assets-ready',   () => { assetsReady = true;  (window.CBLog?.ok||console.log)('[boot] assets-ready');   maybeReady(); });
  on('cb:registry-ready', () => { registryReady = true;(window.CBLog?.ok||console.log)('[boot] registry-ready'); maybeReady(); });

  // Kompatibilitäts-Events (falls Monolith ältere Namen nutzt)
  on('cb:assets:ready',   () => { assetsReady = true;  (window.CBLog?.ok||console.log)('[boot] assets:ready (compat)');   maybeReady(); });
  on('cb:registry:ready', () => { registryReady = true;(window.CBLog?.ok||console.log)('[boot] registry:ready (compat)'); maybeReady(); });

  // UI-Events (Start)
  on('cb:start:new', (e) => {
    const mapId = e?.detail?.mapId || 'demo.ep1';
    (window.CBLog?.ok || console.log)('[boot] Neues Spiel', mapId);
    try { Game.start(mapId); } catch (err) { (window.CBLog?.err || console.error)('[boot] Game.start Fehler:', err); }
  });

  on('cb:start:continue', () => {
    (window.CBLog?.ok || console.log)('[boot] Weiterspielen');
    try { Game.start('last.save'); } catch (err) { (window.CBLog?.err || console.error)('[boot] Game.start Fehler:', err); }
  });

  on('cb:start:reset', () => {
    (window.CBLog?.warn || console.warn)('[boot] Reset → Seite neu laden');
    location.reload();
  });

  on('cb:fullscreen', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
})();
