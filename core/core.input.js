/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final-2 (input only; camera extern)
 * Zweck   : Eingabe + (falls aktiv) Direkt-Emit von cb:build:place
 *
 * Änderungen ggü. v25.11.14:
 *  - cb:build:place wird – wenn von hier gesendet – IMMER mit __src, w, h verschickt
 *  - dadurch akzeptiert Game beide Pfade (Input direkt ODER Placement-Modul)
 * ========================================================================== */
(() => {
  'use strict';
  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log   )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info  )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn  )(TAG, ...a);

  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  // Aktives Tool & Platzier-Meta
  let buildTool = null;                  // z. B. 'b.hq'
  let lastHover = { tx:0, ty:0 };
  let lastSize  = { w:3, h:3 };          // Default 3×3
  let requireConfirm = true;

  // NEW: erzwingt, dass einmal über die Karte gehovert wurde
  let hoverValid = false;

  const getGhost   = () => document.getElementById('place-ghost') || document.querySelector('.ghost-sprite');
  const getOverlay = () => document.getElementById('place-overlay');

  function applyTilePx() {
    (getOverlay() || document.documentElement)
      .style.setProperty('--tilePx', `${tileSize * cam.zoom}px`);
  }

  function getTileSize(){
    try { return Number(window.Game?.tileSize) || 64; } catch { return 64; }
  }
  function updateTileSize(){ tileSize = getTileSize(); applyTilePx(); }

  function rectOf(el){ try { return el.getBoundingClientRect(); } catch { return {left:0,top:0,width:0,height:0}; } }
  function screenToTile(clientX, clientY){
    const r = rectOf(canvas);
    const sx = (clientX - r.left);
    const sy = (clientY - r.top);
    const worldX = cam.x + (sx / cam.zoom);
    const worldY = cam.y + (sy / cam.zoom);
    let tx = Math.floor(worldX / tileSize);
    let ty = Math.floor(worldY / tileSize);
    if (tx < 0) tx = 0; if (ty < 0) ty = 0;
    return { tx, ty, sx, sy };
  }

  // ---- Event-Hooks ----------------------------------------------------------
  window.addEventListener('req:place:begin', (ev)=>{
    const d = ev?.detail || {};
    if (d.w) lastSize.w = d.w|0;
    if (d.h) lastSize.h = d.h|0;

    const ghost = getGhost();
    if (ghost){
      ghost.style.setProperty('--wTiles', String(lastSize.w||1));
      ghost.style.setProperty('--hTiles', String(lastSize.h||1));
    }
    hoverValid = false;
    INFO('place begin', lastSize);
  });

  function resetTool(){
    buildTool = null;
    try {
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
    } catch {}
  }

  function placeAt(tx, ty, w=lastSize.w, h=lastSize.h){
    if (!buildTool) return;
    if (!hoverValid){ WARN('Bestätigen ignoriert – Maus war noch nicht über der Karte.'); return; }

    // WICHTIG: Detail IMMER mit Tag + Größe
    const detail = { __src:'input-v25.11.14', buildingId: buildTool, x: tx|0, y: ty|0, w: w|0, h: h|0 };
    try {
      OK('Sende cb:build:place', JSON.stringify(detail));
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    } catch(e){
      WARN('Platzierung fehlgeschlagen:', e?.message || e);
    }
    const overlay = getOverlay(); if (overlay) overlay.hidden = true;
    resetTool();
  }

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = { tx:p.tx, ty:p.ty };
      hoverValid = true;

      const ghost = getGhost();
      if (ghost){
        const step = tileSize * cam.zoom;
        ghost.style.setProperty('--sx', `${p.sx - (p.sx % step)}px`);
        ghost.style.setProperty('--sy', `${p.sy - (p.sy % step)}px`);
      }

      window.dispatchEvent(new CustomEvent('cb:hover-tile', {
        detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
      }));
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return;
      if (!buildTool) return;
      if (!hoverValid){
        const p = screenToTile(ev.clientX, ev.clientY);
        lastHover = { tx:p.tx, ty:p.ty };
        hoverValid = true;
      }
      // Sofortplatzierung wäre hier möglich – wir bleiben aber bei Confirm-UI
      ev.preventDefault?.();
    }, { passive:false });

    canvas.addEventListener('contextmenu', (ev)=>{
      if (buildTool){
        ev.preventDefault();
        const overlay = getOverlay(); if (overlay) overlay.hidden = true;
        resetTool();
      }
    });
  }

  function bindGlobal(){
    window.addEventListener('cb:set-build-tool', (ev)=>{
      const d = ev?.detail || {};
      buildTool = (d.kind ?? d.type ?? null) || null;
      try { if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default'; } catch {}
      INFO('Build-Tool:', buildTool ?? '(none)');
      const overlay = getOverlay();
      if (overlay) overlay.hidden = !buildTool;
    });

    // Enter bestätigt (optional)
    window.addEventListener('keydown', (e)=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){
        const overlay = getOverlay(); if (overlay) overlay.hidden = true;
        resetTool();
      }
      if (e.key === 'Enter'){
        placeAt(lastHover.tx, lastHover.ty);
      }
    });

    // Confirm-Buttons aus dem Overlay
    document.querySelector('#place-overlay .place-btn.ok')?.addEventListener('click', ()=>{
      placeAt(lastHover.tx, lastHover.ty);
    });
    document.querySelector('#place-overlay .place-btn.cancel')?.addEventListener('click', ()=>{
      const ov = getOverlay(); if (ov) ov.hidden = true; resetTool();
    });
  }

  function init(){
    canvas = document.getElementById('game') || document.querySelector('canvas');
    if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

    // Kamera-Änderungen übernehmen (für Ghost-Gitter)
    addEventListener('cb:camera-change', (ev)=>{
      const d = ev?.detail || {};
      if (typeof d.x === 'number')   cam.x = d.x;
      if (typeof d.y === 'number')   cam.y = d.y;
      if (typeof d.zoom === 'number')cam.zoom = d.zoom;
      applyTilePx();
    });

    updateTileSize();
    applyTilePx();
    bindGlobal();
    bindPointer();
    OK('bereit v25.11.14-final-2 (input only; camera extern)');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
