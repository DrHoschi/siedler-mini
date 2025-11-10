/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final (ghost-anchored, camera-aware, tagged place)
 * Zweck   : Eingabe + Platzier-Ghost + OK/Cancel direkt am Ghost (ohne placement.js)
 *
 * Lauscht : cb:set-build-tool(kind)        – Tool wählen/aufheben
 *           req:place:begin({w,h})         – gewünschte Ghost-Größe in Tiles
 *           cb:camera-change({x,y,zoom})   – Kamera/Zoom vom Kameramodul
 * Sendet  : cb:hover-tile({tx,ty,screenX,screenY})
 *           cb:build:place({__src,buildingId,x,y,w,h})
 *
 * Hinweise:
 *  - Nutzt vorhandenes #place-overlay / #place-ghost / .ghost-tint, falls vorhanden
 *  - Buttons werden (falls nötig) korrekt INS Ghost verlagert (TL/TR)
 *  - Keine zweite Bestätigungs-UI – nur ✓/✕ am Ghost
 *  - Events sind getaggt (__src:'input-v25.11.14'), damit Game-Listener sie annimmt
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

  let buildTool  = null;                 // z. B. 'b.hq'
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };         // Default 3x3
  let hoverValid = false;                // Maus schon über Karte gewesen?

  // ------------------------------ DOM refs ----------------------------------
  let overlay, ghost, tint, btnOk, btnCancel;

  function qs(root, sel){ return (root||document).querySelector(sel); }
  function qsa(root, sel){ return Array.from((root||document).querySelectorAll(sel)); }
  function rectOf(el){ try{ return el.getBoundingClientRect(); } catch { return {left:0,top:0,width:0,height:0}; } }

  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    // 1) vorhandene Struktur aus index.html nutzen (falls da)
    overlay = document.getElementById('place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'place-overlay';
      overlay.className = 'place-overlay';
      overlay.hidden = true;
      document.body.appendChild(overlay);
    }

    ghost = overlay.querySelector('#place-ghost') || overlay.querySelector('.ghost-sprite');
    if (!ghost){
      ghost = document.createElement('div');
      ghost.id = 'place-ghost';
      ghost.className = 'ghost-sprite';
      overlay.appendChild(ghost);
    }

    tint = ghost.querySelector('.ghost-tint');
    if (!tint){
      tint = document.createElement('div');
      tint.className = 'ghost-tint';
      ghost.appendChild(tint);
    }

    // 2) Buttons: falsche Geschwister-Buttons entfernen, richtige inside Ghost erzeugen
    //    (damit absolute TL/TR sich auf die Ghost-Box beziehen)
    const strayBtns = qsa(overlay, ':scope > .place-btn');
    strayBtns.forEach(b => b.remove());

    btnOk = ghost.querySelector('.place-btn.ok');
    if (!btnOk){
      btnOk = document.createElement('button');
      btnOk.className = 'place-btn ok';
      btnOk.type = 'button';
      btnOk.setAttribute('aria-label', 'Bestätigen');
      btnOk.textContent = '✓';
      ghost.appendChild(btnOk);
    }
    btnCancel = ghost.querySelector('.place-btn.cancel');
    if (!btnCancel){
      btnCancel = document.createElement('button');
      btnCancel.className = 'place-btn cancel';
      btnCancel.type = 'button';
      btnCancel.setAttribute('aria-label', 'Abbrechen');
      btnCancel.textContent = '✕';
      ghost.appendChild(btnCancel);
    }

    // Button-Handler (idempotent)
    btnOk.onclick = () => {
      if (!buildTool || !hoverValid){ WARN('Bestätigen ignoriert'); return; }
      placeAt(lastHover.tx, lastHover.ty);
    };
    btnCancel.onclick = () => { hideOverlay(); resetTool(); };
  }

  function showOverlay(){ ensureOverlay(); overlay.hidden = false; }
  function hideOverlay(){ if (overlay) overlay.hidden = true; }

  function setGhostSizeTiles(w,h){
    ensureOverlay();
    ghost.style.setProperty('--wTiles', String((w|0)||1));
    ghost.style.setProperty('--hTiles', String((h|0)||1));
  }
  function setGhostScreenPos(sx,sy){
    ensureOverlay();
    ghost.style.setProperty('--sx', `${sx|0}px`);
    ghost.style.setProperty('--sy', `${sy|0}px`);
  }
  function setGhostBuildable(can){
    // Klassisches Grün/Rot am TINT (kompatibel zu deiner CSS)
    if (tint){
      tint.classList.toggle('is-valid',   !!can);
      tint.classList.toggle('is-invalid', !can);
    }
    if (btnOk) btnOk.disabled = !can;
  }

  // --------------------------- Helpers / Math --------------------------------
  function getTileSize(){
    try { return Number(window.Game?.tileSize) || 64; } catch { return 64; }
  }
  function updateTileSize(){
    tileSize = getTileSize();
    (overlay || document.documentElement)
      .style.setProperty('--tilePx', `${tileSize * cam.zoom}px`); // für CSS
  }
  function updateTilePxByCamera(){
    (overlay || document.documentElement)
      .style.setProperty('--tilePx', `${tileSize * cam.zoom}px`);
  }

  // Screen → Tile (mit Kamera/Zoom)
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

  // Platzier-Regel (vorerst immer true → später ersetzen)
  function canPlaceAt(/*tx,ty*/){ return true; }

  // ------------------------------- Flow --------------------------------------
  function resetTool(){
    buildTool = null;
    hideOverlay();
    try{
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
    } catch{}
  }

  function placeAt(tx,ty,w=lastSize.w,h=lastSize.h){
    const detail = {
      __src: 'input-v25.11.14',
      buildingId: buildTool,
      x: tx|0, y: ty|0, w: w|0, h: h|0
    };
    OK('emit cb:build:place', detail);
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    hideOverlay();
    resetTool();
  }

  // ------------------------------- Binds -------------------------------------
  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p; hoverValid = true;

      // Ghost am sichtbaren Canvas-Raster einrasten (inkl. Zoom)
      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);
      setGhostScreenPos(gx, gy);
      setGhostBuildable(canPlaceAt(p.tx, p.ty));

      // Info-Event
      window.dispatchEvent(new CustomEvent('cb:hover-tile', {
        detail: { tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button!=null && ev.button!==0) return;
      if (!buildTool) return;
      if (!hoverValid){
        const p = screenToTile(ev.clientX, ev.clientY);
        lastHover = p; hoverValid = true;
      }
      // Bestätigen geschieht NUR über ✓-Button (kein Auto-Place hier)
      ev.preventDefault?.();
    }, { passive:false });

    canvas.addEventListener('contextmenu', (ev)=>{
      if (buildTool){
        ev.preventDefault();
        hideOverlay(); resetTool();
      }
    });
  }

  function bindGlobal(){
    addEventListener('cb:set-build-tool', (ev)=>{
      const d = ev?.detail || {};
      buildTool = (d.kind ?? d.type ?? null) || null;
      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';
      if (buildTool){
        showOverlay();
        setGhostSizeTiles(lastSize.w, lastSize.h);
      } else {
        hideOverlay();
      }
      INFO('Build-Tool:', buildTool ?? '(none)');
    });

    addEventListener('req:place:begin', (ev)=>{
      const d = ev?.detail || {};
      if (d.w) lastSize.w = d.w|0;
      if (d.h) lastSize.h = d.h|0;
      setGhostSizeTiles(lastSize.w, lastSize.h);
      hoverValid = false;
      INFO('place begin', lastSize);
    });

    // Kamera → Zoom/Offsets für korrekte Ghost-Größe
    addEventListener('cb:camera-change', (ev)=>{
      const d = ev?.detail || {};
      if (typeof d.x === 'number')    cam.x = d.x;
      if (typeof d.y === 'number')    cam.y = d.y;
      if (typeof d.zoom === 'number') cam.zoom = d.zoom;
      updateTilePxByCamera();
    });

    // Shortcuts
    addEventListener('keydown', (e)=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){ hideOverlay(); resetTool(); }
      if (e.key === 'Enter' && hoverValid){ placeAt(lastHover.tx, lastHover.ty); }
    });
  }

  // -------------------------------- Init -------------------------------------
  function init(){
    canvas = document.getElementById('game')
          || document.querySelector('canvas[data-role="map"]')
          || document.querySelector('canvas');
    if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

    ensureOverlay();
    updateTileSize();
    bindGlobal();
    bindPointer();

    OK('bereit v25.11.14-final (ghost-anchored)');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
