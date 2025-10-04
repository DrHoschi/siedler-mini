// ============================================================================
// Datei : core/boot.js
// Projekt: Neue Siedler
// Version: v1.2.0 (2025-10-04)
// Zweck : Orchestrierung UI→Assets→Registry→Game + Systeme (Production/Carrier)
//         + Träger-Spawn (mit Tile→Pixel-Umrechnung) für sichtbare Bewegung
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
    window.Game?.start?.(mapId);
  }

  // --------------------------- Helpers: Tile→Pixel ---------------------------
  function tileSize(){
    // Versuch 1: live aus der Game-Map
    const ts = window.Game?.map?.tile;
    if (Number.isFinite(ts) && ts > 0) return ts|0;
    // Versuch 2: Attribut am Canvas
    const ds = canvas()?.dataset?.tile;
    if (ds && +ds > 0) return (+ds)|0;
    // Fallback: 64 (laut deinen Logs)
    return 64;
  }
  function toPx(v){ return (typeof v === 'number') ? v * tileSize() : 0; }
  function centerPx(b){
    // Mittelpunkt eines Gebäudes (für Wegführung/Spawn)
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
    window.Assets?.loadAll?.();
    if (devAutostart) startRequested = 'new';
    tryStart();
  });

  // Assets ready → Registry init
  window.addEventListener('cb:assets-ready', async () => {
    ready.assets = true; log('assets-ready ✓');
    try {
      await window.Registry?.init?.();  // lädt data/buildings.json
    } catch(e){ warn('Registry init Fehler:', e); }
    tryStart();
  });
  // Alias (falls anderes Modul "cb:assets:ready" feuert)
  window.addEventListener('cb:assets:ready', ()=>window.dispatchEvent(new Event('cb:assets-ready')));

  // Registry ready
  window.addEventListener('cb:registry:ready', () => { ready.registry = true; log('registry-ready ✓'); tryStart(); });

  // Start-Buttons
  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });

  // --------------------------- Game Start: Systeme ---------------------------
  window.addEventListener('cb:game-start', (ev) => {
    const world = ev.detail?.world || (window.Game?.world ||= { buildings:[], units:[] });

    // Systeme starten
    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    try { window.UnitOverlay?.start?.(); }     catch(e){ warn('UnitOverlay start fail', e); }
    try { window.UIHud?.init?.(); }            catch(e){ warn('HUD init fail', e); }

    // --- Auto-Spawn Träger (wenn HQ existiert, aber noch keine Träger) -------
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
    const b = ev.detail; if (!b) return;
    const id = String(b.id||b.type||'').toLowerCase();
    if (id !== 'hq') return;
    const C = centerPx(b);
    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x - 24, y: C.y - 10 });
    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x + 24, y: C.y - 10 });
    (window.CBLog?.ok||console.log)('[boot] carriers spawned (on HQ place)');
  });
})();
