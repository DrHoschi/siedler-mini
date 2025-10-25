/* ============================================================================
 * Datei   : core/input.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 *
 * Zweck   : Eingabe & Build-Interaktion
 *           – Pointer/Touch vom Canvas → Tile-Koordinaten
 *           – Build-Tool wählen / platzieren
 *           – Hover-Tile publizieren
 *           – ESC / Rechtsklick: Tool zurücksetzen
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * Events  :
 *   listen :
 *     • cb:set-build-tool { kind?:string, type?:string|null }   // beide Felder akzeptiert
 *     • cb:camera-change  { x:number, y:number, zoom:number }   // aus core/camera.js
 *   dispatch:
 *     • cb:hover-tile     { tx, ty, screenX, screenY }          // Hover-Info (Tiles)
 *     • cb:build:place    { kind, x:number, y:number }          // Tiles → Entities.place
 *     • cb:set-build-tool { kind:null }                         // bei Reset
 *
 * Abhängigkeiten (optional):
 *   – window.GameCamera   (x,y,zoom in Weltpixeln)
 *   – window.Game.tileSize (oder 64px Fallback)
 *   – CBLog (ok/info/warn/error) – Polyfill ausreichend
 * Hinweise:
 *   – Einheitennorm: Kamera ist in **Weltpixeln**, Tiles sind **tileSize-Raster**.
 *     worldX = cam.x + screenX / cam.zoom;   tx = floor(worldX / tileSize)
 * ============================================================================ */
(() => {
  'use strict';

  /* ==========================================================================
   * [Imports / Logger]
   * ========================================================================== */
  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log   )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info  )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn  )(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error )(TAG, ...a);

  /* ==========================================================================
   * [Konstanten & State]
   * ========================================================================== */
  const VERSION = 'v25.10.25-final';

  let canvas   = null;                 // <canvas id="game">
  let tileSize = 64;                   // px pro Tile
  // Kamera-Werte in Weltpixeln (kompatibel zu core/camera.js)
  const cam = { x:0, y:0, zoom:1 };

  // aktuelles Bauwerkzeug (ID / Registry-Key). null = keins.
  let buildTool = null;

  /* ==========================================================================
   * [Hilfsfunktionen]
   * ========================================================================== */

  function getTileSize(){
    try {
      // bevorzugt: Game.tileSize; fallback: Entities.state.tile; sonst 64
      return Number(window.Game?.tileSize) || Number(window.Entities?.state?.tile) || 64;
    } catch { return 64; }
  }

  function updateTileSize(){ tileSize = getTileSize(); }

  /** DOMRect des Canvas (sicher) */
  function rectOf(el){
    try { return el.getBoundingClientRect(); }
    catch { return { left:0, top:0, width:el?.width||0, height:el?.height||0 }; }
  }

  /** Bildschirm → Tile-Koordinaten (benutzt Weltpixel-Kamera + Zoom) */
  function screenToTile(clientX, clientY){
    const r = rectOf(canvas);
    const sx = (clientX - r.left);      // Canvas-ScreenX (CSS-Pixel)
    const sy = (clientY - r.top);       // Canvas-ScreenY (CSS-Pixel)

    // Weltpixel-Koordinaten unter dem Cursor:
    const worldX = cam.x + (sx / cam.zoom);
    const worldY = cam.y + (sy / cam.zoom);

    // Tile-Koordinaten:
    let tx = Math.floor(worldX / tileSize);
    let ty = Math.floor(worldY / tileSize);
    if (tx < 0) tx = 0;
    if (ty < 0) ty = 0;

    return { tx, ty, sx, sy };
  }

  /** Tool-Reset (einheitlich) */
  function resetTool(){
    buildTool = null;
    try {
      if (canvas) canvas.style.cursor = 'default';
      // nach außen kommunizieren (für UI/Inspector):
      window.dispatchEvent(new CustomEvent('cb:set-build-tool', { detail:{ kind:null } }));
      // optional: alte Game-API unterstützen
      window.Game?.resetBuildTool?.();
    } catch {}
  }

  /** Platzieren eines Gebäudes auf Tile-Koords */
  function placeAt(tx, ty){
    if (!buildTool) return;
    const detail = { kind: buildTool, x: tx, y: ty };
    try {
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
      OK('Gebäude platziert:', buildTool, '→', tx, ty);
    } catch(e){
      WARN('Platzierung fehlgeschlagen:', e?.message || e);
    }
  }

  /* ==========================================================================
   * [Listener – Pointer/Maus/Touch]
   * ========================================================================== */
  function bindPointer(){
    if (!canvas) return;

    // Hover meldet immer – hilfreich für Previews/Inspector
    canvas.addEventListener('pointermove', (ev)=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      try {
        window.dispatchEvent(new CustomEvent('cb:hover-tile', {
          detail: { tx: p.tx, ty: p.ty, screenX: p.sx, screenY: p.sy }
        }));
      } catch {}
    }, { passive:true });

    // Platzieren: Linksklick / Touch
    canvas.addEventListener('pointerdown', (ev)=>{
      // Nur LMB (0) oder Touch (button==0/undefined)
      if (ev.button != null && ev.button !== 0) return;
      if (!buildTool) return;
      const p = screenToTile(ev.clientX, ev.clientY);
      // Verhindere Textauswahl / Scroll-Jank auf Touch
      try { ev.preventDefault?.(); } catch {}
      placeAt(p.tx, p.ty);
      // Standard: Tool nach Einmalplatzierung zurücksetzen (MVP)
      resetTool();
    }, { passive:false });

    // Rechtsklick → Tool resetten (und Kontextmenü unterdrücken)
    canvas.addEventListener('contextmenu', (ev)=>{
      if (buildTool){
        ev.preventDefault();
        resetTool();
      }
    });
  }

  /* ==========================================================================
   * [Listener – Global (Events)]
   * ========================================================================== */
  function bindGlobal(){
    // Build-Tool setzen (akzeptiert 'kind' oder legacy 'type')
    window.addEventListener('cb:set-build-tool', (ev)=>{
      const d = ev?.detail || {};
      const next = (d.kind ?? d.type ?? null) || null;
      buildTool = next;
      try { if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default'; } catch {}
      INFO('Build-Tool:', buildTool ?? '(none)');
    });

    // Kamera-Updates aus core/camera.js (einheitlicher Eventname: cb:camera-change)
    window.addEventListener('cb:camera-change', (ev)=>{
      const d = ev?.detail || {};
      if (typeof d.x === 'number')   cam.x = d.x;
      if (typeof d.y === 'number')   cam.y = d.y;
      if (typeof d.zoom === 'number')cam.zoom = d.zoom;
    });
  }

  /* ==========================================================================
   * [Init]
   * ========================================================================== */
  function init(){
    try{
      canvas = document.getElementById('game')
            || document.querySelector('canvas[data-role="map"]')
            || document.querySelector('canvas');
      if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

      // Startwerte aus GameCamera lesen (falls vorhanden)
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

      OK(`${TAG} gebunden (${VERSION})`);
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
