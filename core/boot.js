// ============================================================================
// Datei : core/boot.js
// Projekt: Neue Siedler
// Version: v1.2.0 (2025-10-04)
// Zweck : Orchestrierung UI→Assets→Registry→Game + Systeme (Production/Carrier)
//         + HUD/UnitOverlay + Carrier-Autospawn (HQ)
// Leitplanken:
//  - Reihenfolge & Startfluss wie bei dir: cb:game-start wird hier emittiert,
//    DANN Game.start(mapId) aufgerufen.
//  - Keine doppelten Listener mehr.
//  - Minimal-invasiv: nur Zusatz-Hooks, kein Umbau.
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

  // --- Helpers: Tilegröße + HQ-Eingang in Pixel --------------------------------
function __tileSize(){ const ts = window.Game?.map?.tile; return (Number.isFinite(ts)&&ts>0)?(ts|0):64; }

/** Liefert den ersten Eingang eines Gebäudes als Welt-Pixel (Fallback: Zentrum) */
function __entrancePx(b){
  const ts = __tileSize();
  const def = window.Registry?.getBuildingDef?.(String(b.id||b.type||b.kind||''));
  const rel = (def?.entrances && def.entrances[0]) || null; // z.B. [1,2]
  if (rel){
    const tx = (b.x|0) + (rel[0]|0);
    const ty = (b.y|0) + (rel[1]|0);
    return { x: (tx + 0.5)*ts, y: (ty + 0.5)*ts }; // Kachelmitte
  }
  // Fallback: Gebäudemitte
  const cx = ((b.x||0) + (b.w||1)/2)*ts;
  const cy = ((b.y||0) + (b.h||1)/2)*ts;
  return { x: cx, y: cy };
}

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

    // Hinweis: Dein Flow – erst Event, dann Game.start
    EVT('cb:game-start', { mapId });

    // Engine starten
    window.Game?.start?.(mapId);
  }

  // --------------------------------------------------------------------------
  // Tile → Pixel Helpers (für Carrier-Spawn neben HQ)
  function tileSize(){
    const ts = window.Game?.map?.tile;
    return (Number.isFinite(ts) && ts > 0) ? (ts|0) : 64;
  }
  function centerPx(b){
    const ts = tileSize();
    return {
      x: ((b.x||0) + (b.w||1)/2) * ts,
      y: ((b.y||0) + (b.h||1)/2) * ts
    };
  }
  // --------------------------------------------------------------------------

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
    // Registry starten (lädt buildings.json)
    try { await window.Registry?.init?.(); }
    catch(e){ warn('Registry init Fehler:', e); }
    tryStart();
  });
  // Alias (falls anderes Modul "cb:assets:ready" feuert)
  window.addEventListener('cb:assets:ready', ()=>window.dispatchEvent(new Event('cb:assets-ready')));

  // Registry ready (beide Varianten akzeptieren – Bindestrich & Doppelpunkt)
  function onRegistryReady(){ ready.registry = true; log('registry-ready ✓'); tryStart(); }
  window.addEventListener('cb:registry:ready', onRegistryReady);
  window.addEventListener('cb:registry-ready', onRegistryReady);

  // Start-Buttons
  window.addEventListener('cb:start:new',      () => { startRequested = 'new';      log('start:new');      tryStart(); });
  window.addEventListener('cb:start:continue', () => { startRequested = 'continue'; log('start:continue'); tryStart(); });

  // Beim Spielstart: Systeme (Production/Carriers/Overlay/HUD) verkabeln
  window.addEventListener('cb:game-start', (ev) => {
    const world = ev.detail?.world || window.Game?.world || { buildings:[], units:[] };

    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    try { window.UnitOverlay?.start?.(); }     catch(e){ warn('UnitOverlay start fail', e); }
    try { window.UIHud?.init?.(); }            catch(e){ warn('HUD init fail', e); }
    // Optional: Pfad-Overlay sichtbar schalten
    // window.PathOverlay?.toggle?.(true);

    // --- Auto-Spawn: wenn HQ existiert, aber noch keine Träger da sind
    setTimeout(() => {
      const hasCarrier = Array.isArray(world.units) && world.units.some(u => u && u.role === 'carrier');
      const hq = (world.buildings||[]).find(b => String(b.id||b.type||'').toLowerCase() === 'hq');
      if (!hasCarrier && hq) {
        const C = centerPx(hq);
        window.Carriers?.spawn?.({ id:'u.carrier#1', role:'carrier', x: C.x - 24, y: C.y - 10 });
        window.Carriers?.spawn?.({ id:'u.carrier#2', role:'carrier', x: C.x + 24, y: C.y - 10 });
        (window.CBLog?.ok||console.log)('[boot] carriers spawned near HQ');
      }
    }, 0);
  });

  // HQ platziert → sofort zwei Träger daneben spawnen
  window.addEventListener('cb:build:place', (ev) => {
    const b = ev?.detail; if (!b) return;
    const id = String(b.id||b.type||'').toLowerCase();
    if (id !== 'hq') return;
    const C = centerPx(b);
    try {
      window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x - 24, y: C.y - 10 });
      window.Carriers?.spawn?.({ id:`u.carrier#${(Math.random()*1e6|0)}`, role:'carrier', x: C.x + 24, y: C.y - 10 });
      (window.CBLog?.ok||console.log)('[boot] carriers spawned (on HQ place)');
    } catch(e){ warn('Carrier spawn fail', e); }
  });

// --- Auto-Spawn: wenn HQ existiert, aber noch keine Träger da sind
setTimeout(() => {
  const world = window.Game?.world || { buildings:[], units:[] };
  const hasCarrier = Array.isArray(world.units) && world.units.some(u => u && u.role === 'carrier');
  const hq = (world.buildings||[]).find(b => String(b.id||b.type||'').toLowerCase() === 'hq');
  if (!hasCarrier && hq) {
    const E = __entrancePx(hq);
    window.Carriers?.spawn?.({ id:'u.carrier#1', role:'carrier', x: E.x - 10, y: E.y });
    window.Carriers?.spawn?.({ id:'u.carrier#2', role:'carrier', x: E.x + 10, y: E.y });
    (window.CBLog?.ok||console.log)('[boot] carriers spawned at HQ entrance');
  }
}, 0);
  
})();
