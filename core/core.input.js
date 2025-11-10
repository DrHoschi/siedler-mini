/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final-ghost-anchored
 * Zweck   : Eingabe + Ghost-Overlay (ohne placement.js), Buttons am Ghost
 *
 * Events  : lauscht  cb:set-build-tool(kind) , req:place:begin({w,h})
 *           sendet  cb:hover-tile({tx,ty,screenX,screenY})
 *                   cb:build:place({__src,buildingId,x,y,w,h})
 *
 * Hinweise:
 *  - Ghost + Buttons werden dynamisch erzeugt (#place-overlay)
 *  - Keine zweite Bestätigungs-UI mehr – nur die zwei Buttons am Ghost
 *  - cb:build:place ist **getaggt** (__src:'input-v25.11.14') + enthält w/h
 *  - Simple Prüflogik (immer "baubar"). Später kann canPlaceAt(tx,ty) ergänzt
 *    oder extern via Events ersetzt werden.
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ---------- State ----------
  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  let buildTool  = null;               // 'b.hq' …
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };       // Default
  let hoverValid = false;              // wurde schon über die Karte gehovert?

  // ---------- DOM: Overlay + Ghost ----------
  let overlay, ghost, btnOk, btnCancel;

  function ensureOverlay(){
    if (overlay) return;
    overlay = document.getElementById('place-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'place-overlay';
      document.body.appendChild(overlay);
    }
    // Ghost-Box
    ghost = document.createElement('div');
    ghost.className = 'place-ghost';   // styled via ui-place.css
    // Buttons
    btnOk = document.createElement('button');
    btnOk.className = 'place-btn ok';  // ✓
    btnOk.setAttribute('aria-label', 'Bestätigen');
    btnOk.textContent = '✓';

    btnCancel = document.createElement('button');
    btnCancel.className = 'place-btn cancel'; // ✕
    btnCancel.setAttribute('aria-label', 'Abbrechen');
    btnCancel.textContent = '✕';

    ghost.appendChild(btnOk);
    ghost.appendChild(btnCancel);
    overlay.appendChild(ghost);

    // Button-Handler
    btnOk.addEventListener('click', ()=>{
      if (!buildTool || !hoverValid) { WARN('Bestätigen ignoriert'); return; }
      placeAt(lastHover.tx, lastHover.ty);
    });
    btnCancel.addEventListener('click', ()=>{
      hideOverlay(); resetTool();
    });
  }

  function showOverlay(){ ensureOverlay(); overlay.hidden = false; }
  function hideOverlay(){ if (overlay) overlay.hidden = true; }

  function setGhostSizeTiles(w,h){
    ensureOverlay();
    ghost.style.setProperty('--wTiles', String((w|0) || 1));
    ghost.style.setProperty('--hTiles', String((h|0) || 1));
  }
  function setGhostScreenPos(sx, sy){
    // sx/sy = Canvas-Screen-Koordinaten relativ zum Canvas-Viewport
    ensureOverlay();
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }
  function setGhostBuildable(ok){
    ensureOverlay();
    ghost.classList.toggle('bad', !ok);
    ghost.classList.toggle('good', !!ok);
    btnOk.disabled = !ok;
  }

  // ---------- Helpers ----------
  function rectOf(el){ try { return el.getBoundingClientRect(); } catch { return {left:0,top:0,width:0,height:0}; } }
  function getTileSize(){
    try { return Number(window.Game?.tileSize) || 64; } catch { return 64; }
  }
  function updateTileSize(){
    tileSize = getTileSize();
    (overlay || document.documentElement)
      .style.setProperty('--tilePx', `${tileSize * cam.zoom}px`);
  }
  function updateTilePxByCamera(){
    (overlay || document.documentElement)
      .style.setProperty('--tilePx', `${tileSize * cam.zoom}px`);
  }

  // Screen → Tile (berücksichtigt Kamera)
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

  // sehr einfache Prüflogik (immer true). Hier später echte Regeln einhängen.
  function canPlaceAt(/*tx,ty*/){ return true; }

  // ---------- Flow ----------
  function resetTool(){
    buildTool = null;
    hideOverlay();
    try {
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
    } catch {}
  }

  function placeAt(tx, ty, w = lastSize.w, h = lastSize.h){
    const detail = {
      __src: 'input-v25.11.14',
      buildingId: buildTool,
      x: tx|0, y: ty|0,
      w: w|0, h: h|0
    };
    OK('emit cb:build:place', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    hideOverlay();
    resetTool();
  }

  // ---------- Event-Binds ----------
  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid = true;

      // Position des Ghosts am Canvas-Raster einrasten
      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);
      setGhostScreenPos(gx, gy);

      // (später echte Regeln) – jetzt immer baubar
      setGhostBuildable(canPlaceAt(p.tx, p.ty));

      // Info für andere Module
      window.dispatchEvent(new CustomEvent('cb:hover-tile', {
        detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
      }));
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button!=null && ev.button!==0) return;
      if (!buildTool) return;
      if (!hoverValid){
        const p = screenToTile(ev.clientX, ev.clientY);
        lastHover = p; hoverValid = true;
      }
      // Wir bestätigen NICHT hier – nur Button am Ghost nutzt placeAt()
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

    // Kamera ändert zoom/offset → CSS-Pixel aktualisieren
    addEventListener('cb:camera-change', (ev)=>{
      const d = ev?.detail || {};
      if (typeof d.x === 'number')    cam.x = d.x;
      if (typeof d.y === 'number')    cam.y = d.y;
      if (typeof d.zoom === 'number') cam.zoom = d.zoom;
      updateTilePxByCamera();
    });

    // Tastatur (optional)
    addEventListener('keydown', (e)=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){ hideOverlay(); resetTool(); }
      if (e.key === 'Enter' && hoverValid){ placeAt(lastHover.tx, lastHover.ty); }
    });
  }

  // ---------- Init ----------
  function init(){
    canvas = document.getElementById('game') || document.querySelector('canvas[data-role="map"]') || document.querySelector('canvas');
    if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }
    ensureOverlay();
    updateTileSize();
    bindGlobal();
    bindPointer();
    OK('bereit v25.11.14-final-ghost-anchored');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
