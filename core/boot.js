// ============================================================================
// Datei : core/boot.js (SAFE-HOTFIX)
// Projekt: Neue Siedler
// Version: v1.2.2 (2025-10-04)
// Zweck : Stabiler Startfluss (wie vorher). Startet das Spiel direkt auf
//         cb:start:new/continue. Systeme (Production/Carriers/HUD/UnitOverlay)
//         hängen sich NACH dem echten cb:game-start dran.
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[boot]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[boot]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[boot]', ...a);

  let gameInited = false;

  function canvas(){ return document.getElementById('game'); }
  function tileSize(){
    const ts = window.Game && window.Game.map && window.Game.map.tile;
    return (Number.isFinite(ts) && ts>0) ? ts|0 : 64;
  }
  function centerPx(b){
    const ts = tileSize();
    return {
      x: ((b.x||0) + (b.w||1)/2) * ts,
      y: ((b.y||0) + (b.h||1)/2) * ts
    };
  }
  function initGameOnce(){
    if (gameInited) return true;
    const c = canvas();
    if (!c || !c.getContext){ err('Canvas #game fehlt/ohne Context'); return false; }
    try { window.Game?.init?.(c); } catch(e){ err('Game.init fehlgeschlagen', e); return false; }
    gameInited = true;
    log('game init ✓');
    return true;
  }
  function startNow(via){
    if (!initGameOnce()) return;
    const mapId = canvas()?.dataset?.map || 'data/maps/map-mini.json';
    log('start → Game.start(%s) via:%s', mapId, via||'btn');
    try { window.Game?.start?.(mapId); } catch(e){ err('Game.start fehlgeschlagen', e); }
  }

  // ------------------------------- Lifecycle --------------------------------
  // UI bereit → Assets laden (Registry wird von index.html separat angestoßen)
  window.addEventListener('cb:ui-ready', () => {
    log('ui-ready ✓');
    try { window.Assets?.loadAll?.(); } catch(e){ warn('Assets.loadAll fail', e); }
  });

  // Assets-Ready: beide Schreibweisen unterstützen
  window.addEventListener('cb:assets-ready', () => log('assets-ready ✓'));
  window.addEventListener('cb:assets:ready', () => log('assets-ready ✓ (alias)'));

  // Registry-Ready: **Bindestrich UND Doppelpunkt** bedienen
  function onRegistryReady(){ log('registry-ready ✓'); }
  window.addEventListener('cb:registry-ready', onRegistryReady);
  window.addEventListener('cb:registry:ready', onRegistryReady);

  // Start-Buttons → wie in deinem Original: sofort starten (ohne Gate-Flags)
  window.addEventListener('cb:start:new',      () => startNow('new'));
  window.addEventListener('cb:start:continue', () => startNow('continue'));

  // --------------------------- NACH echtem Game-Start ------------------------
  // Hier Systeme anschließen; Game/Engine feuert cb:game-start
  window.addEventListener('cb:game-start', (ev) => {
    const world = (ev && ev.detail && ev.detail.world) || window.Game?.world || (window.Game.world = { buildings:[], units:[] });
    try { window.Production?.start?.(world); } catch(e){ warn('Production start fail', e); }
    try { window.Carriers?.start?.(world); }   catch(e){ warn('Carriers start fail', e); }
    try { window.UnitOverlay?.start?.(); }     catch(e){ warn('UnitOverlay start fail', e); }
    try { window.UIHud?.init?.(); }            catch(e){ warn('HUD init fail', e); }
  });

  // HQ platziert → zwei Träger daneben spawnen (Qualitäts-Boost für Epoche 1)
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
