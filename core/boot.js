============================================================================
// Datei : core/boot.js
// Projekt: Neue Siedler
// Version: v1.1.0 (2025-10-04)
// Zweck : Orchestrierung UI→Assets→Registry→Game + Systeme (Production/Carrier)
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[boot]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[boot]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[boot]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const ready = { ui:false, assets:false, registry:false, gameInit:false };
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
    EVT('cb:game-start', { mapId });

    // Engine starten
    window.Game?.start?.(mapId);
  }

  // UI ready → Assets laden
  window.addEventListener('cb:ui-ready', () => {
    ready.ui = true; log('ui-ready ✓');
    maybeInitGame();
    window.Assets?.loadAll?.();
    if (devAutostart) startRequested = 'new';
    tryStart();
  });

  // Assets ready → Registry init
  window.addEventListener('cb:assets-ready', async () => {
    ready.assets = true; log('assets-ready ✓');
    // Registry starten (lädt buildings.json, emittiert cb:registry:ready)
    try {
      await window.Registry?.init?.();
    } catch(e){ warn('Registry init Fehler:', e); }
    tryStart();
  });
  window.addEventListener('cb:assets:ready', ()=>window.dispatchEvent(new Event('cb:assets-ready')));

  // Registry ready
  window.addEventListener('cb:registry:ready', () => { ready.registry = true; log('registry-ready ✓'); tryStart(); });

  // Start-Buttons
  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });

  // Beim Spielstart: Systeme (Production/Carriers/Overlay) verkabeln
  window.addEventListener('cb:game-start', (ev) => {
    const world = ev.detail?.world || window.Game?.world || { buildings:[], units:[] };
    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    // Optional zum Testen: Pfad-Overlay einschalten
    // window.PathOverlay?.toggle?.(true);
  });

  // Beim Spielstart: Systeme (Production/Carriers/Overlay/HUD) verkabeln
window.addEventListener('cb:game-start', (ev) => {
  const world = ev.detail?.world || window.Game?.world || { buildings:[], units:[] };
  try { window.Production?.start?.(world); } catch(e){ console.warn('Production start fail', e); }
  try { window.Carriers?.start?.(world); }   catch(e){ console.warn('Carriers start fail', e); }
  try { window.UnitOverlay?.start?.(); }     catch(e){ console.warn('UnitOverlay start fail', e); }
  try { window.UIHud?.init?.(); }            catch(e){ console.warn('HUD init fail', e); }
  // optional Debug:
  // window.PathOverlay?.toggle?.(true);
});
  
})();
