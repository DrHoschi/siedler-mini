// ============================================================================
// Datei: core/boot.js
// Projekt: Neue Siedler
// Version: v19.3.0 (2025-09-28)
// Zweck:
//   • Bootstrapping & Event-Wiring (UI ⇄ Boot ⇄ Core)
//   • Reihenfolge: DOMReady → Assets.loadAll → Registry.init → Game.init
//   • Reagiert auf cb:start:new|continue|reset|fullscreen
// Leitplanken (wichtig):
//   1) KEIN globales doppeltes „const STATE“ (State ist in core/game.js gekapselt)
//   2) Events ausschließlich über window.(addEventListener|dispatchEvent) (cb:…)
//   3) Inspector/Debug bleibt erhalten (CBLog wird NICHT entfernt)
// Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
// ============================================================================

(() => {
  // --------------------------- Konstanten ---------------------------
  const on  = (n, cb) => window.addEventListener(n, cb);
  const EVT = (n, detail) => window.dispatchEvent(new CustomEvent(n, { detail }));

  let assetsReady   = false;
  let registryReady = false;

  // --------------------------- Hilfsfunktionen ----------------------
  function maybeReady() {
    if (assetsReady && registryReady) {
      (window.CBLog?.ok || console.log)('[boot] ready → UI darf starten');
      EVT('cb:boot-ready');
    }
  }

  // --------------------------- Hauptlogik ---------------------------
  // 1) DOM bereit → Canvas initialisieren + Ladevorgang starten
  window.addEventListener('DOMContentLoaded', () => {
    (window.CBLog?.ok || console.log)('[boot] DOM ready');

    const canvas = document.getElementById('game');
    if (!canvas) {
      (window.CBLog?.err || console.error)('[boot] #game Canvas fehlt!');
      return;
    }

    // Core initialisieren
    // Achtung: Game kapselt den State intern; hier KEIN globales STATE anlegen!
    try { Game.init(canvas); } catch (e) { (window.CBLog?.err || console.error)('[boot] Game.init Fehler:', e); }

    // Assets + Registry laden
    try { Assets.loadAll(); }  catch (e) { (window.CBLog?.err || console.error)('[boot] Assets.loadAll Fehler:', e); }
    try { Registry.init(); }   catch (e) { (window.CBLog?.err || console.error)('[boot] Registry.init Fehler:', e); }
  });

  // 2) Ready-Events aus Core
  on('cb:assets-ready',   () => { assetsReady   = true; maybeReady(); });
  on('cb:registry-ready', () => { registryReady = true; maybeReady(); });

  // 3) UI-Events (Startpanel)
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
    if (!document.fullscreenElement) { el.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
  });

  // (Optional) Weitere globale Hooks, z. B. Tastatur-Shortcuts/Inspector:
  // on('cb:inspector:toggle', () => { /* dein Inspector reagiert selbst */ });
})();
