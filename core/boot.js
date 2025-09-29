// ============================================================================
// Datei : core/boot.js
// Projekt: Neue Siedler
// Version: v1.0.1
// Zweck : Orchestrierung: UI → Assets → Registry → (Start-Event) → Game
// Events: wartet auf cb:ui-ready, cb:assets-ready, cb:registry-ready
//         startet Game NUR bei cb:start:new | cb:start:continue
// Hinweise:
//   • Kein Autostart per Default (optional via ?autostart=1 oder localStorage('dev.autostart')==='1')
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[boot]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[boot]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[boot]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const ready = { ui:false, assets:false, registry:true /* optional vorerst */, gameInit:false };
  let startRequested = null; // 'new' | 'continue' | null

  const qs = new URLSearchParams(location.search);
  const devAutostart = (
    (qs.has('autostart') && qs.get('autostart') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('dev.autostart') === '1')
  );

  function canvas(){ return document.getElementById('game'); }

  function maybeInitGame(){
    if (ready.gameInit) return;
    const c = canvas();
    if (!c) { err('Canvas #game fehlt'); return; }
    if (!c.getContext) { err('Canvas Context fehlt'); return; }
    window.Game?.init?.(c);
    ready.gameInit = true;
    log('game init ✓');
  }

  function allReady(){ return ready.ui && ready.assets && ready.registry && ready.gameInit; }
  function requested(){ return !!startRequested; }

  function tryStart(){
    if (!allReady() || !requested()) return;
    const mapId = canvas()?.dataset?.map || 'data/maps/map-mini.json';
    log('game-start →', { mapId, via: startRequested });
    // Boot emittiert game-start (UI reagiert darauf: HUD/Dock zeigen, BG ausblenden)
    EVT('cb:game-start', { mapId });
    // Engine starten (Game emittiert NICHT noch einmal cb:game-start)
    window.Game?.start?.(mapId);
  }

  // --- Wiring ---
  window.addEventListener('cb:ui-ready', () => {
    ready.ui = true; log('ui-ready ✓');
    maybeInitGame();
    // Assets laden (Stub meldet sofort „ready“ im nächsten Tick)
    window.Assets?.loadAll?.();
    if (devAutostart) startRequested = 'new';
    tryStart();
  });

  window.addEventListener('cb:assets-ready', () => { ready.assets = true; log('assets-ready ✓'); tryStart(); });
  window.addEventListener('cb:assets:ready', () => { ready.assets = true; log('assets-ready (alias) ✓'); tryStart(); });

  // Registry (falls/ sobald eingebaut)
  window.addEventListener('cb:registry-ready', () => { ready.registry = true; log('registry-ready ✓'); tryStart(); });

  // Start-Buttons
  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });
})();
