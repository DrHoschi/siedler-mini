// ============================================================================
// Datei : core/boot.js (SAFE-HOTFIX)
// Projekt: Neue Siedler
// Version: v1.2.1 (2025-10-04)
// Zweck : Stabiler Startfluss ohne eigenes cb:game-start; Carriers/HUD/Overlay
//         hängen sich NACH dem echten game-start dran. Spawn erst dann.
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[boot]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[boot]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[boot]', ...a);

  const ready = { ui:false, assets:false, registry:false, gameInit:false };
  let startRequested = null; // 'new' | 'continue' | null

  const qs = new URLSearchParams(location.search);
  const devAutostart = (
    (qs.get('autostart') === '1') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('dev.autostart') === '1')
  );

  function canvas(){ return document.getElementById('game'); }

  function maybeInitGame(){
    if (ready.gameInit) return;
    const c = canvas();
    if (!c) { err('Canvas #game fehlt'); return; }
    if (!c.getContext) { err('Canvas Context fehlt'); return; }
    try { window.Game?.init?.(c); } catch(e){ err('Game.init fehlgeschlagen', e); return; }
    ready.gameInit = true; log('game init ✓');
  }

  function allReady(){ return ready.ui && ready.assets && ready.registry && ready.gameInit; }
  function requested(){ return !!startRequested; }

  function tryStart(){
    if (!allReady() || !requested()) return;
    const mapId = canvas()?.dataset?.map || 'data/maps/map-mini.json';
    log('start → Game.start(%s)', mapId);
    // WICHTIG: Kein eigenes cb:game-start hier! Game.start soll es auslösen.
    try { window.Game?.start?.(mapId); } catch(e){ err('Game.start fehlgeschlagen', e); }
  }

  // --------------------------- Helpers: Tile→Pixel ---------------------------
  function tileSize(){
    const ts = window.Game && window.Game.map && window.Game.map.tile;
    return (Number.isFinite(ts) && ts>0) ? (ts|0) : 64;
  }
  function centerPx(b){
    const ts = tileSize();
    const cx = ((b.x||0) + (b.w||1)/2) * ts;
    const cy = ((b.y||0) + (b.h||1)/2) * ts;
    return { x: cx, y: cy };
  }

  // ------------------------------- Lifecycle --------------------------------
  // UI ready → Assets laden
  window.addEventListener('cb:ui-ready', () => {
    ready.ui = true; log('ui-ready ✓');
    maybeInitGame();
    try { window.Assets?.loadAll?.(); } catch(e){ warn('Assets.loadAll fail', e); }
    if (devAutostart) startRequested = 'new';
    tryStart();
  });

  // Assets ready → Registry init
  window.addEventListener('cb:assets-ready', async () => {
    ready.assets = true; log('assets-ready ✓');
    try { await window.Registry?.init?.(); } catch(e){ warn('Registry init Fehler:', e); }
    tryStart();
  });
  // Alias (falls andere Module cb:assets:ready feuern)
  window.addEventListener('cb:assets:ready', ()=>window.dispatchEvent(new Event('cb:assets-ready')));

  // Registry ready
  window.addEventListener('cb:registry:ready', () => { ready.registry = true; log('registry-ready ✓'); tryStart(); });

  // Start-Buttons
  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });

  // --------------------------- NACH echtem Game-Start ------------------------
  // Hier hängen wir unsere Systeme dran – NUR nachdem Game.start sein Event feuert.
  window.addEventListener('cb:game-start', (ev) => {
    const world = (ev && ev.detail && ev.detail.world) || window.Game?.world || (window.Game.world = { buildings:[], units:[] });

    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    try { window.UnitOverlay?.start?.(); }     catch(e){ warn('UnitOverlay start fail', e); }
    try { window.UIHud?.init?.(); }            catch(e){ warn('HUD init fail', e); }

    // Auto-Spawn erst jetzt (wenn HQ existiert & noch keine Carrier)
    setTimeout(() => {
      const hasCarrier = Array.isArray(world.units) && world.units.some(u => (u.role==='carrier'));
      const hq = (world.buildings||[]).find(b => String(b.id||b.type||'').toLowerCase() === 'hq');
      if (!hasCarrier && hq) {
        const C = centerPx(hq);
        window.Carriers?.spawn?.({ id:'u.carrier#1', role:'carrier', x: C.x - 24, y: C.y - 10 });
        window.Carriers?.spawn?.({ id:'u.carrier#2', role:'carrier', x: C.x + 24, y: C.y - 10 });
        (window.CBLog?.ok||console.log)('[boot] carriers spawned near HQ');
      }
    }, 0);
  });

  // Wenn ein HQ platziert wird → sofort zwei Träger daneben spawnen
  window.addEventListener('cb:build:place', (ev) => {
    const b = ev && ev.detail; if (!b) return;
    const id = String(b.id||b.type||'').toLowerCase();
    if (id !== 'hq') return;
    const C = centerPx(b);
    try {
      window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x - 24, y: C.y - 10 });
      window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x + 24, y: C.y - 10 });
      (window.CBLog?.ok||console.log)('[boot] carriers spawned (on HQ place)');
    } catch(e){ warn('Carrier spawn fail', e); }
  });
})();
