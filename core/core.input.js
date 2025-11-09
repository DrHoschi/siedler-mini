/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.09-final+confirm+grid+ghost-sync
 * Zweck   : Eingabe & Build-Interaktion (Bestätigen/Abbrechen optional)
 * Änderungen:
 *   – Übernimmt w/h aus req:place:begin → setzt --wTiles/--hTiles
 *   – Bewegt Ghost per --sx/--sy entlang der Maus (gleiches Mapping wie Klick)
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
  let requireConfirm = true;             // ✔︎ explizite Bestätigung

  // Bestätigen/Abbrechen-UI
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
    const styleBtn = (b)=>Object.assign(b.style,{font:'700 16px system-ui',padding:'8px 10px',border:'1px solid rgba(255,255,255,.35)',borderRadius:'6px',cursor:'pointer',color:'#fff',background:'rgba(0,0,0,.15)'});
    const ok = uiBox.querySelector('#btn-place-confirm'); const cc = uiBox.querySelector('#btn-place-cancel');
    styleBtn(ok); styleBtn(cc);
    ok.addEventListener('click', ()=> placeAt(lastHover.tx, lastHover.ty, lastSize.w, lastSize.h));
    cc.addEventListener('click', ()=> resetTool());
    document.body.appendChild(uiBox);
  }
  function showConfirmUI(show){ ensureConfirmUI(); uiBox.style.display = show ? 'flex' : 'none'; }

  // Grid-Overlay (optional)
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
  addEventListener('cb:camera-change', (ev)=>{
    const d = ev?.detail || {};
    if (typeof d.x === 'number')   cam.x = d.x;
    if (typeof d.y === 'number')   cam.y = d.y;
    if (typeof d.zoom === 'number')cam.zoom = d.zoom;
    drawGrid();
  });
  addEventListener('req:debug:grid:toggle', ()=>{
    gridOn = !gridOn; ensureGrid();
    gridLayer.style.display = gridOn ? 'block':'none';
    drawGrid(); INFO('Grid', gridOn?'ein':'aus');
  });

  function getTileSize(){
    try { return Number(window.Game?.tileSize) || Number(window.Entities?.state?.tile) || 64; }
    catch { return 64; }
  }
  function updateTileSize(){ tileSize = getTileSize(); drawGrid(); }

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

  // w/h aus req:place:begin übernehmen + Ghost skalieren
  window.addEventListener('req:place:begin', (ev)=>{
    const d = ev?.detail || {};
    if (d.w) lastSize.w = d.w|0;
    if (d.h) lastSize.h = d.h|0;

    const ghost = document.getElementById('place-ghost') || document.querySelector('.ghost-sprite');
    if (ghost){
      ghost.style.setProperty('--wTiles', String(lastSize.w||1));
      ghost.style.setProperty('--hTiles', String(lastSize.h||1));
    }
    INFO('place begin', lastSize);
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
    const detail = { buildingId: buildTool, x: tx, y: ty, w, h };
    try {
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
      OK('Gebäude platziert:', buildTool, '→', tx, ty, `(${w}x${h})`);
    } catch(e){
      WARN('Platzierung fehlgeschlagen:', e?.message || e);
    }
    resetTool();
  }

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = { tx:p.tx, ty:p.ty };

      // Ghost an Maus ausrichten (per CSS-Variablen)
      const ghost = document.getElementById('place-ghost') || document.querySelector('.ghost-sprite');
      if (ghost){
        // einfache Screen-Ausrichtung; wenn du Welt→Screen-Matrix hast, nutze die
        ghost.style.setProperty('--sx', `${p.sx - ((p.sx) % (tileSize*cam.zoom))}px`);
        ghost.style.setProperty('--sy', `${p.sy - ((p.sy) % (tileSize*cam.zoom))}px`);
      }

      try {
        window.dispatchEvent(new CustomEvent('cb:hover-tile', {
          detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
        }));
      } catch {}
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return; // nur LMB/Touch
      if (!buildTool) return;
      if (requireConfirm) {
        // nur Ziel setzen; Confirm-UI erledigt Place (Enter/✓)
      } else {
        const p = screenToTile(ev.clientX, ev.clientY);
        placeAt(p.tx, p.ty);
      }
      ev.preventDefault?.();
    }, { passive:false });

    canvas.addEventListener('contextmenu', (ev)=>{
      if (buildTool){
        ev.preventDefault();
        resetTool();
      }
    });
  }

  function bindGlobal(){
    window.addEventListener('cb:set-build-tool', (ev)=>{
      const d = ev?.detail || {};
      const next = (d.kind ?? d.type ?? null) || null;
      buildTool = next;
      try { if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default'; } catch {}
      showConfirmUI(!!buildTool && requireConfirm);
      INFO('Build-Tool:', buildTool ?? '(none)');
    });

    window.addEventListener('keydown', (e)=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){ resetTool(); }
      if (requireConfirm && (e.key === 'Enter' || e.key === 'NumpadEnter')){
        placeAt(lastHover.tx, lastHover.ty);
      }
    });
  }

  function init(){
    try{
      canvas = document.getElementById('game')
            || document.querySelector('canvas[data-role="map"]')
            || document.querySelector('canvas');
      if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

      try{
        if (window.GameCamera){
          cam.x    = Number(window.GameCamera.x   ?? cam.x);
          cam.y    = Number(window.GameCamera.y   ?? cam.y);
          cam.zoom = Number(window.GameCamera.zoom?? cam.zoom);
        }
      } catch {}

      ensureConfirmUI();
      updateTileSize();
      bindGlobal();
      bindPointer();

      OK(`${TAG} bereit (v25.11.09-final+confirm+grid+ghost-sync)`);
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
