/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final (confirm+grid+ghost-sync; ohne Pan/Zoom)
 * Zweck   : Eingabe & Build-Interaktion (Ghost, Hover, Bestätigen/Abbrechen)
 *
 * Wichtig : KEINE Kamera-Steuerung mehr hier! Nur Listener auf cb:camera-change.
 *           screen→tile erfolgt relativ zum Canvas & Kamera-State.
 * UI      : Optionales Grid-Overlay (req:debug:grid:toggle)
 * Events  : req:place:start|begin|confirm|cancel  •  cb:build:place
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
  let lastHover = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize  = { w:3, h:3 };          // Default 3×3
  let requireConfirm = true;             // ✔︎ explizite Bestätigung
  let hoverValid = false;                // wird true, sobald Maus über Karte war

  const getGhost   = () => document.getElementById('place-ghost') || document.querySelector('.ghost-sprite');
  const getOverlay = () => document.getElementById('place-overlay');

  // --------------------------- Confirm UI (unten rechts) ---------------------
  let uiBox = null;
  function ensureConfirmUI(){
    if (uiBox) return;
    uiBox = document.createElement('div');
    uiBox.id = 'place-confirm-ui';
    uiBox.innerHTML = `
      <button id="btn-place-confirm" type="button" aria-label="Bestätigen">✔︎</button>
      <button id="btn-place-cancel"  type="button" aria-label="Abbrechen">✖︎</button>`;
    Object.assign(uiBox.style, {
      position:'fixed', right:'20px', bottom:'20px', zIndex:'2147483636',
      display:'none', gap:'8px', padding:'8px', background:'rgba(0,0,0,.35)',
      borderRadius:'8px', backdropFilter:'blur(4px)'
    });
    const styleBtn = (b)=>Object.assign(b.style,{
      font:'700 16px system-ui', padding:'8px 10px',
      border:'1px solid rgba(255,255,255,.35)', borderRadius:'6px',
      cursor:'pointer', color:'#fff', background:'rgba(0,0,0,.15)'
    });
    const ok = uiBox.querySelector('#btn-place-confirm'); const cc = uiBox.querySelector('#btn-place-cancel');
    styleBtn(ok); styleBtn(cc);
    ok.addEventListener('click', ()=> placeAt(lastHover.tx, lastHover.ty, lastSize.w, lastSize.h));
    cc.addEventListener('click', ()=> { const ov=getOverlay(); if (ov) ov.hidden = true; resetTool(); });
    document.body.appendChild(uiBox);
  }
  function showConfirmUI(show){
    ensureConfirmUI();
    uiBox.style.display = show ? 'flex' : 'none';
    const okBtn = uiBox.querySelector('#btn-place-confirm');
    if (okBtn) okBtn.disabled = !hoverValid;
  }

  // ------------------------------ Grid-Overlay -------------------------------
  let gridOn = false, gridLayer = null, gtx = null, dpr = 1;
  function ensureGrid(){
    if (gridLayer) return;
    gridLayer = document.createElement('canvas');
    gridLayer.id = 'grid-overlay';
    Object.assign(gridLayer.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'2147483634' });
    document.body.appendChild(gridLayer);
    gtx = gridLayer.getContext('2d');
    onResizeGrid();
  }
  function onResizeGrid(){
    if (!gridLayer) return;
    dpr = Math.max(1, window.devicePixelRatio||1);
    gridLayer.width  = Math.floor(innerWidth*dpr);
    gridLayer.height = Math.floor(innerHeight*dpr);
    gtx.setTransform(dpr,0,0,dpr,0,0);
    drawGrid();
  }
  function drawGrid(){
    if (!gridOn || !gtx) return;
    const t = tileSize, step = t * cam.zoom;
    gtx.clearRect(0,0,gridLayer.width,gridLayer.height);
    gtx.save();
    gtx.globalAlpha = .3;
    gtx.strokeStyle = 'rgba(255,255,255,.25)';
    gtx.lineWidth = 1;
    const x0 = - (cam.x * cam.zoom) % step;
    const y0 = - (cam.y * cam.zoom) % step;
    for (let x = x0; x < innerWidth;  x += step){ gtx.beginPath(); gtx.moveTo(x,0); gtx.lineTo(x,innerHeight); gtx.stroke(); }
    for (let y = y0; y < innerHeight; y += step){ gtx.beginPath(); gtx.moveTo(0,y); gtx.lineTo(innerWidth,y); gtx.stroke(); }
    gtx.restore();
  }
  addEventListener('resize', onResizeGrid);
  addEventListener('req:debug:grid:toggle', ()=>{
    gridOn = !gridOn; ensureGrid();
    gridLayer.style.display = gridOn ? 'block':'none';
    drawGrid(); INFO('Grid', gridOn?'ein':'aus');
  });

  // ----------------------------- Kamera-Leser -------------------------------
  addEventListener('cb:camera-change', (ev)=>{
    const d = ev?.detail || {};
    if (typeof d.x === 'number')   cam.x = d.x;
    if (typeof d.y === 'number')   cam.y = d.y;
    if (typeof d.zoom === 'number')cam.zoom = d.zoom;
    applyTilePx();
    drawGrid();
    applyGhostCSSFromHover();
  });

  // ------------------------------ Tile-Größe --------------------------------
  function getTileSize(){
    try { return Number(window.Game?.tileSize) || Number(window.Entities?.state?.tile) || 64; }
    catch { return 64; }
  }
  function updateTileSize(){ tileSize = getTileSize(); drawGrid(); applyTilePx(); }

  // ----------------------------- Koord-Helfer --------------------------------
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

  // ---------------------------- Ghost-Sync -----------------------------------
  function applyGhostCSSFromHover(){
    const ghost = getGhost(); if (!ghost) return;
    const step = tileSize * cam.zoom;
    ghost.style.setProperty('--sx', `${lastHover.sx - (lastHover.sx % step)}px`);
    ghost.style.setProperty('--sy', `${lastHover.sy - (lastHover.sy % step)}px`);
    ghost.style.setProperty('--wTiles', String(lastSize.w||1));
    ghost.style.setProperty('--hTiles', String(lastSize.h||1));
  }

  // ----------------------------- Platzierfluss -------------------------------
  window.addEventListener('req:place:begin', (ev)=>{
    const d = ev?.detail || {};
    if (d.w) lastSize.w = d.w|0;
    if (d.h) lastSize.h = d.h|0;
    const ghost = getGhost();
    if (ghost){
      ghost.style.setProperty('--wTiles', String(lastSize.w||1));
      ghost.style.setProperty('--hTiles', String(lastSize.h||1));
    }
    hoverValid = false; // erst Maus über Karte macht OK möglich
    INFO('place begin', lastSize);
  });

  window.addEventListener('req:place:start', (ev)=>{
    const d = ev?.detail || {};
    if (Array.isArray(d.size)) { lastSize.w = Number(d.size[0])||3; lastSize.h = Number(d.size[1])||3; }
    if (d.w) lastSize.w = d.w|0;
    if (d.h) lastSize.h = d.h|0;
    if (d.buildingId) buildTool = d.buildingId;

    const overlay = getOverlay(); if (overlay) overlay.hidden = false;
    const ghost = getGhost();
    if (ghost){
      ghost.style.setProperty('--wTiles', String(lastSize.w||1));
      ghost.style.setProperty('--hTiles', String(lastSize.h||1));
    }
    hoverValid = false;
    showConfirmUI(!!buildTool && requireConfirm);
    INFO('place start', { tool:buildTool, size:lastSize });
  });

  function resetTool(){
    buildTool = null;
    showConfirmUI(false);
    try {
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
      window.Game?.resetBuildTool?.();
    } catch {}
  }

  function placeAt(tx, ty, w=lastSize.w, h=lastSize.h){
    if (!buildTool) return;
    if (!hoverValid){ WARN('Bestätigen ignoriert – Maus war noch nicht über der Karte.'); return; }
    const detail = { buildingId: buildTool, x: tx, y: ty, w, h };
    try {
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
      OK('Gebäude platziert:', buildTool, '→', tx, ty, `(${w}x${h})`);
    } catch(e){
      WARN('Platzierung fehlgeschlagen:', e?.message || e);
    }
    const overlay = getOverlay(); if (overlay) overlay.hidden = true;
    resetTool();
  }

  // ----------------------------- Pointer-Binds -------------------------------
  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = { tx:p.tx, ty:p.ty, sx:p.sx, sy:p.sy };
      hoverValid = true;
      applyGhostCSSFromHover();

      try {
        window.dispatchEvent(new CustomEvent('cb:hover-tile', {
          detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
        }));
      } catch {}
      showConfirmUI(!!buildTool && requireConfirm);
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return;
      if (!buildTool) return;
      if (!hoverValid){
        const p = screenToTile(ev.clientX, ev.clientY);
        lastHover = { tx:p.tx, ty:p.ty, sx:p.sx, sy:p.sy };
        hoverValid = true;
        showConfirmUI(!!buildTool && requireConfirm);
        applyGhostCSSFromHover();
      }
      if (!requireConfirm){
        placeAt(lastHover.tx, lastHover.ty);
      }
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

  // ------------------------------- Global Binds ------------------------------
  function bindGlobal(){
    window.addEventListener('cb:set-build-tool', (ev)=>{
      const d = ev?.detail || {};
      const next = (d.kind ?? d.type ?? null) || null;
      buildTool = next;

      const overlay = getOverlay();
      if (overlay) overlay.hidden = !buildTool;

      try { if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default'; } catch {}
      showConfirmUI(!!buildTool && requireConfirm);
      INFO('Build-Tool:', buildTool ?? '(none)');
    });

    window.addEventListener('keydown', (e)=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){
        const overlay = getOverlay(); if (overlay) overlay.hidden = true;
        resetTool();
      }
      if (requireConfirm && (e.key === 'Enter' || e.key === 'NumpadEnter')){
        placeAt(lastHover.tx, lastHover.ty);
      }
    });

    // Kompat-Events:
    window.addEventListener('req:place:confirm', (ev)=>{
      const d = ev?.detail || {};
      const tx = (typeof d.tx==='number') ? d.tx : lastHover.tx;
      const ty = (typeof d.ty==='number') ? d.ty : lastHover.ty;
      if (typeof d.tx==='number' && typeof d.ty==='number') hoverValid = true;
      placeAt(tx, ty, lastSize.w, lastSize.h);
    });
    window.addEventListener('req:place:cancel', ()=>{
      const overlay = getOverlay(); if (overlay) overlay.hidden = true;
      resetTool();
      INFO('place cancel (req)');
    });
  }

  // ------------------------------ Init --------------------------------------
  function applyTilePx() {
    const px = (tileSize * cam.zoom);
    (getOverlay() || document.documentElement).style.setProperty('--tilePx', `${px}px`);
  }

  function init(){
    try{
      canvas = document.getElementById('game')
         ||  document.querySelector('canvas[data-role="map"]')
         ||  document.querySelector('canvas');
      if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

      updateTileSize();   // setzt auch --tilePx via drawGrid/applyTilePx
      applyTilePx();
      ensureConfirmUI();
      bindGlobal();
      bindPointer();

      OK('bereit v25.11.14-final (input only; camera extern)');
    } catch(e){
      console.error(TAG, 'Init-Fehler:', e?.message || e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

})();
