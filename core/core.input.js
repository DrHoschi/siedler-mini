/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.11.08-final
 *
 * Zweck   : Eingabe & Build-Interaktion
 *           – Pointer/Touch → Tile-Koordinaten
 *           – Build-Tool wählen / platzieren
 *           – Hover-Tile publizieren
 *           – ESC / Rechtsklick: Tool zurücksetzen
 *
 * Events (listen):
 *   • cb:set-build-tool { kind?:string, type?:string|null }
 *   • cb:camera-change  { x:number, y:number, zoom:number }
 * Events (dispatch):
 *   • cb:hover-tile     { tx, ty, screenX, screenY }
 *   • cb:build:place    { buildingId, x:number, y:number }   // vereinheitlicht
 *   • cb:set-build-tool { kind:null }                        // Reset
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log   )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info  )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn  )(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error )(TAG, ...a);

  let canvas   = null;                 // <canvas id="game">
  let tileSize = 64;                   // px pro Tile
  const cam = { x:0, y:0, zoom:1 };   // Kamera in Weltpixeln
  let buildTool = null;                // ID (z. B. 'b.hq')

  function getTileSize(){
    try { return Number(window.Game?.tileSize) || Number(window.Entities?.state?.tile) || 64; }
    catch { return 64; }
  }
  function updateTileSize(){ tileSize = getTileSize(); }

  function rectOf(el){
    try { return el.getBoundingClientRect(); }
    catch { return { left:0, top:0, width:el?.width||0, height:el?.height||0 }; }
  }

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

  function resetTool(){
    buildTool = null;
    try {
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
      window.Game?.resetBuildTool?.();
    } catch {}
  }

  function placeAt(tx, ty){
    if (!buildTool) return;
    const detail = { buildingId: buildTool, x: tx, y: ty };   // ← vereinheitlicht
    try {
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
      OK('Gebäude platziert:', buildTool, '→', tx, ty);
    } catch(e){
      WARN('Platzierung fehlgeschlagen:', e?.message || e);
    }
  }

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      try {
        window.dispatchEvent(new CustomEvent('cb:hover-tile', {
          detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
        }));
      } catch {}
    }, { passive:true });

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return; // nur LMB/Touch
      if (!buildTool) return;
      const p = screenToTile(ev.clientX, ev.clientY);
      try { ev.preventDefault?.(); } catch {}
      placeAt(p.tx, p.ty);
      // MVP: nach einem Platzieren zurücksetzen
      resetTool();
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
      INFO('Build-Tool:', buildTool ?? '(none)');
    });

    window.addEventListener('cb:camera-change', (ev)=>{
      const d = ev?.detail || {};
      if (typeof d.x === 'number')   cam.x = d.x;
      if (typeof d.y === 'number')   cam.y = d.y;
      if (typeof d.zoom === 'number')cam.zoom = d.zoom;
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

      updateTileSize();
      bindGlobal();
      bindPointer();

      OK(`${TAG} bereit (v25.11.08-final)`);
    } catch(e){
      ERR('Init-Fehler:', e?.message || e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

})();
