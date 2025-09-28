// ============================================================================
// Datei: boot.js
// Zweck : Bootstrap & Orchestrierung der Startsequenz
// Kette : cb:ui-ready → cb:assets-ready → cb:registry:ready → cb:game-start
// Hinweise:
//   • KEINE globale STATE-Variable anlegen – Game kapselt seinen Zustand selbst.
//   • Unterstützt alte Event-Schreibweisen (mit "-" und mit ":").
//   • Liest die Map aus <canvas id="game" data-map="...">.
//   • Schreibt klare Logs (CBLog-Fallback).
// ============================================================================

(() => {
  // ------------------------ kleine Helpers ------------------------
  const log  = (m, ...a) => (window.CBLog?.ok   || console.log)  (`[boot] ${m}`, ...a);
  const warn = (m, ...a) => (window.CBLog?.warn || console.warn) (`[boot] ${m}`, ...a);
  const err  = (m, ...a) => (window.CBLog?.err  || console.error)(`[boot] ${m}`, ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  let uiReady = false;
  let assetsReady = false;
  let registryReady = false;

  // ------------------------ ready-check ---------------------------
  function maybeStart() {
    // Wir starten das Spiel, sobald UI UND Assets UND Registry bereit sind.
    if (!(uiReady && assetsReady && registryReady)) return;

    const canvas = document.getElementById('game');
    if (!canvas) { err('Canvas #game fehlt – index.html prüfen.'); return; }

    // Map aus data-Attribut lesen (Fallback auf eine kleine Demo-Map)
    const mapId = canvas.dataset.map || 'data/maps/map-mini.json';

    try {
      // Game initialisieren (Canvas wird an die Engine übergeben)
      Game.init(canvas);
      // und Spielstart auslösen
      Game.start(mapId);
      log('game-start', { mapId });
      EVT('cb:game-start', { mapId });
    } catch (e) {
      err('Game.init/start Fehler:', e);
    }
  }

  // ------------------------ Lifecycle: DOM ready -------------------
  window.addEventListener('DOMContentLoaded', () => {
    log('DOM ready');

    // 1) Assets laden
    try { Assets.loadAll?.(); log('Assets.loadAll() angestoßen'); }
    catch (e) { err('Assets.loadAll Fehler:', e); }

    // 2) Registry initialisieren (liest z. B. data/buildings.json)
    try { Registry.init?.(); log('Registry.init() angestoßen'); }
    catch (e) { err('Registry.init Fehler:', e); }

    // (Game.init() ruft maybeStart() NICHT, das machen wir selbst,
    //  sobald alle drei Flags gesetzt sind – siehe maybeStart()).
  });

  // ------------------------ UI ready -------------------------------
  // offiziell
  window.addEventListener('cb:ui-ready', () => {
    uiReady = true;
    log('ui-ready ✓');
    maybeStart();
  });
  // (Fallback alias – falls dein UI noch „ui:ready“ feuert)
  window.addEventListener('cb:ui:ready', () => {
    uiReady = true;
    log('ui:ready (alias) ✓');
    maybeStart();
  });

  // ------------------------ Assets ready ---------------------------
  // beide Schreibweisen akzeptieren
  window.addEventListener('cb:assets-ready', () => {
    assetsReady = true;
    log('assets-ready ✓');
    maybeStart();
  });
  window.addEventListener('cb:assets:ready', () => {
    assetsReady = true;
    log('assets:ready (alias) ✓');
    maybeStart();
  });

  // ------------------------ Registry ready -------------------------
  // beide Schreibweisen akzeptieren
  window.addEventListener('cb:registry-ready', () => {
    registryReady = true;
    log('registry-ready ✓');
    maybeStart();
  });
  window.addEventListener('cb:registry:ready', () => {
    registryReady = true;
    log('registry:ready (alias) ✓');
    maybeStart();
  });

  // ------------------------ Startpanel-Events ----------------------
  // Falls dein UI zusätzliche Buttons verwendet:
  window.addEventListener('cb:start:new', (e) => {
    // Optional: andere Map per Detail übergeben: { mapId: "data/maps/xyz.json" }
    const canvas = document.getElementById('game');
    const given  = e?.detail?.mapId;
    if (given) canvas && (canvas.dataset.map = given);
    log('start:new', { map: canvas?.dataset.map });
    // Falls alle ready-Flags schon true sind, sofort starten/neu laden:
    maybeStart();
  });

  window.addEventListener('cb:start:continue', () => {
    log('start:continue (noch kein Save-Wiring, starte normale Map)');
    maybeStart();
  });

  window.addEventListener('cb:start:reset', () => {
    warn('start:reset → Reload');
    location.reload();
  });

  window.addEventListener('cb:fullscreen', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
  });

  // ------------------------ Sicherheits-Fallbacks ------------------
  // Falls eins der Ready-Events nie kommt, entsperren wir nach kurzer Zeit
  // zumindest den Start, damit du testen kannst.
  setTimeout(() => {
    if (!uiReady)        { warn('Fallback: ui-ready fehlte – erzwinge uiReady=true'); uiReady = true; }
    if (!assetsReady)    { warn('Fallback: assets-ready fehlte – erzwinge assetsReady=true'); assetsReady = true; }
    if (!registryReady)  { warn('Fallback: registry-ready fehlte – erzwinge registryReady=true'); registryReady = true; }
    maybeStart();
  }, 2500);
})();
