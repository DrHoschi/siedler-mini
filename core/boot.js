// ============================================================================
// Datei : core/boot.js
// Projekt: Neue Siedler
// Version: v1.2.1 (2025-10-04)
// Zweck : Orchestrierung UI→Assets→Registry→Game + Systeme (Production/Carrier)
//         + HUD/UnitOverlay + Carrier-Autospawn (am HQ-Eingang)
// Flow  : EVT('cb:game-start', mapId) → Game.start(mapId)
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

    // Dein Flow: erst Event, dann Game.start
    EVT('cb:game-start', { mapId });
    window.Game?.start?.(mapId);
  }

  // --- Helpers: HQ-Eingang in Pixel -----------------------------------------
  function __tileSize(){ const ts = window.Game?.map?.tile; return (Number.isFinite(ts)&&ts>0)?(ts|0):64; }
  function __entrancePx(b){
    const ts = __tileSize();
    const def = window.Registry?.getBuildingDef?.(String(b.id||b.type||b.kind||''));
    const rel = (def?.entrances && def.entrances[0]) || null;
    if (rel){
      const tx = (b.x|0) + (rel[0]|0);
      const ty = (b.y|0) + (rel[1]|0);
      return { x: (tx + 0.5)*ts, y: (ty + 0.5)*ts };
    }
    return { x: ((b.x||0)+(b.w||1)/2)*ts, y: ((b.y||0)+(b.h||1)/2)*ts };
  }

  // ----------------------------- Lifecycle -----------------------------------
  window.addEventListener('cb:ui-ready', () => {
    ready.ui = true; log('ui-ready ✓');
    maybeInitGame();
    window.Assets?.loadAll?.();
    if (devAutostart) startRequested = 'new';
    tryStart();
  });

  window.addEventListener('cb:assets-ready', async () => {
    ready.assets = true; log('assets-ready ✓');
    try { await window.Registry?.init?.(); } catch(e){ warn('Registry init Fehler:', e); }
    tryStart();
  });
  window.addEventListener('cb:assets:ready', ()=>window.dispatchEvent(new Event('cb:assets-ready')));

  // Registry ready (Bindestrich + Doppelpunkt)
  function onRegistryReady(){ ready.registry = true; log('registry-ready ✓'); tryStart(); }
  window.addEventListener('cb:registry:ready', onRegistryReady);
  window.addEventListener('cb:registry-ready', onRegistryReady);

  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });

  // Systeme beim Spielstart anhängen
  window.addEventListener('cb:game-start', (ev) => {
    const world = ev.detail?.world || window.Game?.world || { buildings:[], units:[] };

    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    try { window.UnitOverlay?.start?.(); }     catch(e){ warn('UnitOverlay start fail', e); }
    try { window.UIHud?.init?.(); }            catch(e){ warn('HUD init fail', e); }

    // Auto-Spawn (falls HQ existiert und noch keine Carrier)
    setTimeout(() => {
      const hasCarrier = Array.isArray(world.units) && world.units.some(u => u && u.role === 'carrier');
      const hq = (world.buildings||[]).find(b => String(b.id||b.type||'').toLowerCase() === 'hq');
      if (!hasCarrier && hq) {
        const E = __entrancePx(hq);
        window.Carriers?.spawn?.({ id:'u.carrier#1', role:'carrier', x: E.x - 10, y: E.y });
        window.Carriers?.spawn?.({ id:'u.carrier#2', role:'carrier', x: E.x + 10, y: E.y });
        (window.CBLog?.ok||console.log)('[boot] carriers spawned at HQ entrance');
      }
    }, 0);
  });

  // Beim Platzieren eines HQ sofort Carrier am Eingang parken
  window.addEventListener('cb:build:place', (ev) => {
    const b = ev?.detail; if (!b) return;
    const id = String(b.id||b.type||'').toLowerCase();
    if (id !== 'hq') return;
    const E = __entrancePx(b);
    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: E.x - 10, y: E.y });
    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: E.x + 10, y: E.y });
  });

  // Zusätzlich: HQ-Spawn auf cb:place:confirm:tile (falls Engine cb:build:place nicht feuert)
(() => {
  let _lastHQKey = null; // z.B. "tx,ty" für De-Dupe in kurzer Zeit
  window.addEventListener('cb:place:confirm:tile', (ev) => {
    const d = ev?.detail || {};
    const id = String(d.id||'').toLowerCase();
    if (id !== 'hq') return;

    // De-Dupe: gleicher Spot innerhalb kurzer Zeit?
    const key = `${d.tx|0},${d.ty|0}`;
    if (_lastHQKey === key) return;
    _lastHQKey = key;
    setTimeout(()=>{ _lastHQKey = null; }, 500);

    // Minimalobjekt für __entrancePx() (Tiles!)
    const def = window.Registry?.getBuildingDef?.('hq') || { size:[3,3], entrances:[[1,2]] };
    const b   = { id:'hq', x:d.tx|0, y:d.ty|0, w:(def.size?.[0]||3), h:(def.size?.[1]||3) };

    const E = (function __entrancePx(bld){
      const ts  = (window.Game?.map?.tile|0) || 64;
      const rel = (def?.entrances && def.entrances[0]) || [ (bld.w>>1), (bld.h-1) ];
      const tx  = (bld.x|0) + (rel[0]|0);
      const ty  = (bld.y|0) + (rel[1]|0);
      return { x: (tx + 0.5)*ts, y: (ty + 0.5)*ts };
    })(b);

    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: E.x - 10, y: E.y });
    window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: E.x + 10, y: E.y });
    (window.CBLog?.ok||console.log)('[boot] carriers spawned (confirm:tile @ entrance)', { tx:d.tx, ty:d.ty });
  });
})();
