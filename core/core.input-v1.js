/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.18-FINAL (Ghost mit Gebäude-Sprite + Zoom-Skalierung)
 * Zweck   : Eingabe + Platzier-Ghost + OK/Cancel direkt am Ghost
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place:begin({w,h})
 *           cb:camera-change({x,y,zoom})
 *
 * Sendet  : cb:hover-tile(...)
 *           cb:build:place(...)
 *
 * Erweiterungen in dieser Final-Version:
 *  ✔ Ghost zeigt JE NACH Gebäude das echte Building-Icon
 *  ✔ Ghost skaliert korrekt mit Zoom
 *  ✔ OK/Cancel-Buttons skalieren mit Zoom mit
 *  ✔ Tint bleibt wie bisher (rot/grün)
 *  ✔ Voll kompatibel zu Kamera-Blockierung (__SIEDLER_PLACE_ACTIVE)
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ------------------------------ State -------------------------------------
  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  let buildTool  = null;
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };
  let hoverValid = false;

  // ------------------------------ DOM refs ----------------------------------
  let overlay, ghost, tint, btnOk, btnCancel;

  const q  = (s, r=document)=> r.querySelector(s);
  const qa = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const rect = el => el?.getBoundingClientRect?.() ?? {left:0, top:0, width:0, height:0};

  // ==========================================================================
  //  BUILDING META / ICONS
  // ==========================================================================

  function getBuildingMeta(id){
    if (!id) return null;
    let b=null;

    try{
      if (window.Registry && typeof window.Registry.get === 'function'){
        b = window.Registry.get('buildings', id);
      } else if (window.Registry?.buildings){
        b = window.Registry.buildings.find(x => x.id === id);
      }
    }catch(e){}

    return b || { id, icon:null };
  }

  function resolveBuildingIcon(meta){
    if (!meta) return '';
    if (meta.icon) return meta.icon;

    return `assets/icons/buildings/${meta.id}.png`;
  }

  function updateGhostSprite(){
    ensureOverlay();
    if (!buildTool) {
      ghost.style.backgroundImage='';
      return;
    }

    const meta = getBuildingMeta(buildTool);
    const url  = resolveBuildingIcon(meta);

    ghost.style.backgroundImage    = `url(${url})`;
    ghost.style.backgroundRepeat   = 'no-repeat';
    ghost.style.backgroundPosition = 'center center';
    ghost.style.backgroundSize     = 'cover'; // Gebäude vollflächig im Ghost
  }

  function updateGhostButtonsScale(tilePx){
    if (!btnOk || !btnCancel) return;

    const size = Math.max(24, Math.min(72, tilePx * 0.6));
    const font = Math.round(size * 0.45);

    [btnOk, btnCancel].forEach(btn => {
      btn.style.width      = size+'px';
      btn.style.height     = size+'px';
      btn.style.minWidth   = size+'px';
      btn.style.minHeight  = size+'px';
      btn.style.fontSize   = font+'px';
      btn.style.lineHeight = size+'px';
    });
  }

  // ==========================================================================
  //  OVERLAY & GHOST INITIALISIERUNG
  // ==========================================================================

  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = q('#place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id='place-overlay';
      overlay.className='place-overlay';
      overlay.hidden=true;
      document.body.appendChild(overlay);
    }

    ghost = q('#place-ghost', overlay) || q('.ghost-sprite', overlay);
    if (!ghost){
      ghost=document.createElement('div');
      ghost.id='place-ghost';
      ghost.className='ghost-sprite';
      overlay.appendChild(ghost);
    }

    tint = q('.ghost-tint', ghost);
    if (!tint){
      tint = document.createElement('div');
      tint.className='ghost-tint';
      ghost.appendChild(tint);
    }

    // Buttons innen im Ghost
    qa(':scope > .place-btn', overlay).forEach(b=>b.remove());

    btnOk = q('.place-btn.ok', ghost);
    if (!btnOk){
      btnOk=document.createElement('button');
      btnOk.className='place-btn ok';
      btnOk.textContent='✓';
      ghost.appendChild(btnOk);
    }

    btnCancel = q('.place-btn.cancel', ghost);
    if (!btnCancel){
      btnCancel=document.createElement('button');
      btnCancel.className='place-btn cancel';
      btnCancel.textContent='✕';
      ghost.appendChild(btnCancel);
    }

    // Button-Handler
    btnOk.onclick = () => {
      if (!buildTool || !hoverValid) { WARN('Bestätigen ignoriert'); return; }
      placeAt(lastHover.tx, lastHover.ty);
    };
    btnCancel.onclick = () => { hideOverlay(); resetTool(); };

    updateGhostSprite();
    updateGhostButtonsScale(tileSize * cam.zoom);
  }

  function showOverlay(){ ensureOverlay(); overlay.hidden=false; }
  function hideOverlay(){ if (overlay) overlay.hidden=true; }

  // ==========================================================================
  //  GHOST / CAMERA-SYNC
  // ==========================================================================

  function setGhostSizeTiles(w,h){
    ensureOverlay();
    ghost.style.setProperty('--wTiles', `${w}`);
    ghost.style.setProperty('--hTiles', `${h}`);
  }

  function setGhostScreenPos(sx,sy){
    ensureOverlay();
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }

  function setGhostBuildable(can){
    tint.classList.toggle('is-valid', !!can);
    tint.classList.toggle('is-invalid', !can);
    btnOk.disabled = !can;
  }

  function updateTilePxByCamera(){
    const tilePx = tileSize * cam.zoom;
    (overlay||document.documentElement)
      .style.setProperty('--tilePx', `${tilePx}px`);
    updateGhostButtonsScale(tilePx);
  }

  // ==========================================================================
  //  KOORDINATEN
  // ==========================================================================

  function getTileSize(){
    try{return Number(window.Game?.tileSize)||64;}catch{return 64;}
  }

  function screenToTile(clientX,clientY){
    const r = rect(canvas);
    const sx = clientX - r.left;
    const sy = clientY - r.top;

    const worldX = cam.x + (sx / cam.zoom);
    const worldY = cam.y + (sy / cam.zoom);

    let tx = Math.floor(worldX / tileSize);
    let ty = Math.floor(worldY / tileSize);

    if (tx<0) tx=0;
    if (ty<0) ty=0;

    return {tx,ty,sx,sy};
  }

  function canPlaceAt(){ return true; }

  // ==========================================================================
  //  RESET / PLACE
  // ==========================================================================

  function resetTool(){
    buildTool=null;
    hoverValid=false;
    hideOverlay();

    window.__SIEDLER_PLACE_ACTIVE=false;

    try{
      if (canvas) canvas.style.cursor='default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool',{detail:{kind:null}}));
    }catch{}
  }

  function placeAt(tx,ty,w=lastSize.w,h=lastSize.h){
  const detail = {
    // WICHTIG: alter Tag, den dein Game-Listener akzeptiert
    __src: 'input-v25.11.14',
    buildingId: buildTool,
    x: tx|0,
    y: ty|0,
    w: w|0,
    h: h|0
  };
  OK('cb:build:place', detail);
  window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
  hideOverlay();
  resetTool();
}

  // ==========================================================================
  //  POINTER HANDLING
  // ==========================================================================

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', ev=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid=true;

      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);

      setGhostScreenPos(gx,gy);
      setGhostBuildable(canPlaceAt(p.tx,p.ty));

      window.dispatchEvent(new CustomEvent('cb:hover-tile',{
        detail:{ tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    },{passive:true});

    canvas.addEventListener('pointerdown', ev=>{
      if (ev.button!==0) return;
      if (!buildTool) return;
      if (!hoverValid){
        lastHover=screenToTile(ev.clientX,ev.clientY);
        hoverValid=true;
      }
      ev.preventDefault?.();
    },{passive:false});

    canvas.addEventListener('contextmenu', ev=>{
      if (buildTool){
        ev.preventDefault();
        hideOverlay();
        resetTool();
      }
    });
  }

  // ==========================================================================
  //  GLOBAL BINDINGS
  // ==========================================================================

  function bindGlobal(){

    addEventListener('cb:set-build-tool', ev=>{
      const d = ev?.detail||{};
      buildTool = d.kind ?? d.type ?? null;

      window.__SIEDLER_PLACE_ACTIVE = !!buildTool;

      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';

      if (buildTool){
        showOverlay();
        setGhostSizeTiles(lastSize.w,lastSize.h);
        updateGhostSprite();
        updateGhostButtonsScale(tileSize * cam.zoom);
      } else hideOverlay();
    });

    addEventListener('req:place:begin', ev=>{
      const d = ev?.detail||{};
      if (d.w) lastSize.w=d.w|0;
      if (d.h) lastSize.h=d.h|0;
      setGhostSizeTiles(lastSize.w,lastSize.h);
      hoverValid=false;
    });

    addEventListener('cb:camera-change', ev=>{
      const d = ev?.detail||{};
      if (d.x!=null) cam.x=d.x;
      if (d.y!=null) cam.y=d.y;
      if (d.zoom!=null) cam.zoom=d.zoom;
      updateTilePxByCamera();
    });

    addEventListener('keydown', e=>{
      if (!buildTool) return;
      if (e.key==='Escape'){ hideOverlay(); resetTool(); }
      if (e.key==='Enter' && hoverValid){ placeAt(lastHover.tx,lastHover.ty); }
    });
  }

  // ==========================================================================
  //  INIT
  // ==========================================================================

  function init(){
    canvas = document.getElementById('game')
      || document.querySelector('canvas[data-role="map"]')
      || document.querySelector('canvas');

    if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

    ensureOverlay();
    tileSize=getTileSize();
    updateTilePxByCamera();

    bindGlobal();
    bindPointer();

    window.__SIEDLER_PLACE_ACTIVE=false;
    OK('bereit v25.11.18-FINAL (Ghost+Sprite+ZoomScaling)');
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init,{once:true});
  } else init();

})();
