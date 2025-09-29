// ============================================================================
// Datei : core/boot.js
// Zweck : Orchestrierung: UI → Assets → Registry → (nur bei Start-Event) Game
// Events: wartet auf cb:ui-ready, cb:assets-ready, cb:registry-ready
//         startet Game NUR bei cb:start:new | cb:start:continue
// Hinweise:
//   • Kein Autostart mehr per Default
//   • Optionaler Dev-Autostart via ?autostart=1 oder localStorage('dev.autostart') === '1'
// ============================================================================

(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[boot]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[boot]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[boot]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // --- Ready-Flags -----------------------------------------------------------
  const ready = { ui:false, assets:false, registry:false, gameInit:false };
  let startRequested = null; // 'new' | 'continue' | null
  let autostartArmed = false;

  // --- Helpers ---------------------------------------------------------------
  function qsHas(name) {
    return new URLSearchParams(location.search).get(name) != null;
  }
  const devAutostart = () => (
    (qsHas('autostart') && new URLSearchParams(location.search).get('autostart') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('dev.autostart') === '1')
  );

  function canvas() { return document.getElementById('game'); }

  function maybeInitGame() {
    if (ready.gameInit) return;
    const c = canvas();
    if (!c) { err('Canvas #game fehlt'); return; }
    if (!c.getContext) { err('Canvas Context fehlt'); return; }
    window.Game?.init?.(c);
    ready.gameInit = true;
    log('game init ✓');
  }

  function allReady() {
    return ready.ui && ready.assets && ready.registry && ready.gameInit;
  }

  function requested() { return !!startRequested; }

  function tryStart() {
    if (!allReady() || !requested()) return;
    // Map-ID aus dem Canvas data-map oder Default
    const mapId = canvas()?.dataset?.map || 'data/maps/map-mini.json';
    log('game-start →', { mapId, via: startRequested });
    EVT('cb:game-start', { mapId }); // für UI-HUD etc.
    window.Game?.start?.(mapId);
    // Panel wird von ui-start.js bei cb:game-start ausgeblendet
  }

  // --- Event-Wiring ----------------------------------------------------------
  // UI ready
  window.addEventListener('cb:ui-ready', () => {
    ready.ui = true;
    log('ui-ready ✓');
    maybeInitGame();  // Canvas schon da → Game init
    if (devAutostart()) { autostartArmed = true; startRequested = 'new'; }
    tryStart();
  });

  // Assets ready
  window.addEventListener('cb:assets-ready', () => {
    ready.assets = true;
    log('assets-ready ✓');
    tryStart();
  });
  // Alias (falls verwendet)
  window.addEventListener('cb:assets:ready', () => {
    ready.assets = true;
    log('assets-ready (alias) ✓');
    tryStart();
  });

  // Registry ready
  window.addEventListener('cb:registry-ready', () => {
    ready.registry = true;
    log('registry-ready ✓');
    tryStart();
  });
  window.addEventListener('cb:registry:ready', () => {
    ready.registry = true;
    log('registry-ready (alias) ✓');
    tryStart();
  });

  // Start-Buttons aus UI
  window.addEventListener('cb:start:new', () => {
    startRequested = 'new';
    log('start:new angefordert');
    tryStart();
  });
  window.addEventListener('cb:start:continue', () => {
    startRequested = 'continue';
    log('start:continue angefordert');
    tryStart();
  });

  // Reset (optional)
  window.addEventListener('cb:start:reset', () => {
    try { location.reload(); } catch {}
  });

  // DOM → Assets/Registry anstoßen
  document.addEventListener('DOMContentLoaded', () => {
    log('DOM ready');
    // 1) Assets laden (Stub feuert sofort cb:assets-ready)
    window.Assets?.loadAll?.();
    // 2) Registry initialisieren (lädt data/buildings.json)
    window.Registry?.init?.();
    // 3) Game-Canvas vorbereiten
    maybeInitGame();

    // Dev-Hinweis
    if (devAutostart()) log('[dev] Autostart scharf (Query/LocalStorage)');
    else log('Autostart AUS – Startpanel bleibt bis Button-Klick sichtbar.');
  });
})();

window.addEventListener('cb:start:new', async (e) => {
  const mapId = e?.detail?.mapId || 'map_ch1';
  await GameBoot.start(mapId); // lädt Assets/Map, ruft intern Game.start
  window.dispatchEvent(new CustomEvent('cb:game-start', { detail: { mapId, seed: Date.now() }}));
});
