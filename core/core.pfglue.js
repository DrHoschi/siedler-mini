/* ============================================================================
 * Datei   : core/pfglue.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 *
 * Zweck   : Pathfinding-"Glue" + Overlay
 *           – Zeichnet Pfad/Heatmap über dem Spiel-Canvas (#game), wenn aktiviert
 *           – Koppelt sich an GameCamera (x,y,zoom in Weltpixeln)
 *           – Arbeitet mit AdFinder (optional) – ohne harte Abhängigkeit
 *
 * Events (listen):
 *   • cb:toggle-path-overlay { enabled:boolean }    // Overlay an/aus
 *   • cb:pf-heat-reset       {}                     // AdFinder.resetHeat?()
 *   • cb:camera-change       { x,y,zoom }           // aus core/camera.js
 *   • cb:path:show           { path:[{x,y},...] }   // Pfad-Vorschau setzen
 *
 * Public (global):
 *   window.PathOverlay = {
 *     setPath(pathArray),   // manuell Pfad setzen
 *     clear(),              // Pfad löschen
 *     enable(bool),         // Overlay an/aus
 *     redraw()              // sofort zeichnen
 *   }
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[pfglue]';
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.10.25-final';

  // ---------- State ----------------------------------------------------------
  let enabled  = false;
  let canvas   = null;     // #game
  let overlay  = null;     // <canvas id="pf-overlay">
  let octx     = null;     // 2D-Context
  let cam      = { x:0, y:0, zoom:1 };     // Weltpixel
  let tileSize = 64;

  // Pfad-Vorschau (Liste von Welt-Tile-Koordinaten → wir zeichnen in Pixeln)
  // Erwartet: [{x, y}, ...]  (Tile-Koords)
  let previewPath = null;

  // ---------- Helpers --------------------------------------------------------
  const TileSize = ()=> (window.Game?.tileSize || window.Entities?.state?.tile || tileSize || 64);

  function getStage(){
    return document.getElementById('game')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }

  function ensureOverlay(){
    if (overlay && octx) return true;
    const base = getStage();
    if (!base) return false;

    overlay = document.getElementById('pf-overlay');
    if (!overlay){
      overlay = document.createElement('canvas');
      overlay.id = 'pf-overlay';
      overlay.style.position = 'absolute';
      overlay.style.pointerEvents = 'none';
      overlay.style.left = '0px';
      overlay.style.top  = '0px';
      overlay.style.zIndex = '50'; // über Map/unter HUD anpassen falls nötig
      (base.parentElement || document.body).appendChild(overlay);
    }
    octx = overlay.getContext('2d');
    syncOverlayRect();
    return true;
  }

  function syncOverlayRect(){
    const base = getStage(); if (!base || !overlay) return;
    const r = base.getBoundingClientRect();
    overlay.width  = Math.max(1, Math.floor(r.width));
    overlay.height = Math.max(1, Math.floor(r.height));
    overlay.style.left   = Math.floor(r.left + window.scrollX) + 'px';
    overlay.style.top    = Math.floor(r.top  + window.scrollY) + 'px';
    overlay.style.width  = overlay.width  + 'px';
    overlay.style.height = overlay.height + 'px';
  }

  function clearOverlay(){
    if (octx && overlay) octx.clearRect(0,0, overlay.width, overlay.height);
  }

  /** Weltpixel → Overlayscreen (CSS) unter aktueller Kamera/Zoom */
  function worldToScreen(wx, wy){
    // Kamera setzt links/oben; Zoom skaliert
    const sx = (wx - cam.x) * cam.zoom;
    const sy = (wy - cam.y) * cam.zoom;
    return { x: sx, y: sy };
  }

  function drawCircle(x,y,r){
    octx.beginPath();
    octx.arc(x, y, r, 0, Math.PI*2);
    octx.stroke();
  }

  // ---------- Drawing ---------------------------------------------------------
  function drawHeatmapIfAvailable(){
    // Erwartete optionale API:
    //  – AdFinder.getHeat() → { width, height, data: Float32Array|number[] } mit „Intensität je Tile“
    // Zeichnen: kleine Quadrate je Tile mit Alpha/Intensität.
    if (!window.AdFinder?.getHeat) return;

    let heat;
    try { heat = window.AdFinder.getHeat(); } catch { return; }
    if (!heat || !heat.data || !heat.width || !heat.height) return;

    const T = TileSize();
    const w = heat.width, h = heat.height;
    const data = heat.data;

    // Style
    octx.save();
    octx.globalAlpha = 0.25;
    for (let ty=0, i=0; ty<h; ty++){
      for (let tx=0; tx<w; tx++, i++){
        const v = Number(data[i] ?? 0); // 0..1 oder beliebig
        if (!v) continue;
        // Farbskala: rot (hoch) → gelb → transparent
        octx.fillStyle = `rgba(${Math.min(255, Math.floor(255*v))}, ${Math.min(255, Math.floor(200*(1-v)))}, 0, 0.6)`;
        const wx = tx*T, wy = ty*T;
        const p  = worldToScreen(wx, wy);
        const s  = T * cam.zoom;
        // Sichtbarkeit grob clippen
        if (p.x+s<0 || p.y+s<0 || p.x>overlay.width || p.y>overlay.height) continue;
        octx.fillRect(p.x, p.y, s, s);
      }
    }
    octx.restore();
  }

  function drawPreviewPath(){
    if (!previewPath || !previewPath.length) return;

    const T = TileSize();

    octx.save();
    octx.lineWidth = Math.max(1, 2 * cam.zoom);
    octx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
    octx.fillStyle   = 'rgba(0, 200, 255, 0.35)';

    // Pfad als Linienzug
    octx.beginPath();
    for (let i=0; i<previewPath.length; i++){
      const pt = previewPath[i];
      const wx = (pt.x|0) * T + T/2;
      const wy = (pt.y|0) * T + T/2;
      const s  = worldToScreen(wx, wy);
      if (i===0) octx.moveTo(s.x, s.y);
      else       octx.lineTo(s.x, s.y);
    }
    octx.stroke();

    // Punkte markieren
    for (let i=0; i<previewPath.length; i++){
      const pt = previewPath[i];
      const wx = (pt.x|0) * T + T/2;
      const wy = (pt.y|0) * T + T/2;
      const s  = worldToScreen(wx, wy);
      drawCircle(s.x, s.y, Math.max(2, 3*cam.zoom));
    }

    octx.restore();
  }

  function redraw(){
    if (!enabled) { clearOverlay(); return; }
    if (!ensureOverlay()) return;
    syncOverlayRect();
    clearOverlay();
    drawHeatmapIfAvailable();
    drawPreviewPath();
  }

  // ---------- Wiring ----------------------------------------------------------
  function enableOverlay(v){
    enabled = !!v;
    redraw();
  }

  window.addEventListener('cb:toggle-path-overlay', (e)=>{
    const on = !!(e?.detail?.enabled);
    enableOverlay(on);
    LOG('overlay=', on?'AN':'AUS');
  });

  window.addEventListener('cb:pf-heat-reset', ()=>{
    try{
      window.AdFinder?.resetHeat?.();
      LOG('Heatmap reset.');
    }catch(e){ WARN('resetHeat nicht verfügbar:', e?.message||e); }
  });

  // Kamera koppeln
  window.addEventListener('cb:camera-change', (e)=>{
    const d = e?.detail || {};
    if (typeof d.x   === 'number') cam.x   = d.x;
    if (typeof d.y   === 'number') cam.y   = d.y;
    if (typeof d.zoom=== 'number') cam.zoom= d.zoom;
    redraw();
  });

  // Pfad-Vorschau setzen/löschen
  window.addEventListener('cb:path:show', (e)=>{
    const p = e?.detail?.path;
    previewPath = (Array.isArray(p) && p.length) ? p : null;
    redraw();
  });

  // Größenänderungen mitnehmen
  ['resize','orientationchange'].forEach(ev=>{
    window.addEventListener(ev, ()=>{ syncOverlayRect(); redraw(); });
  });

  // Auto-Setup
  function init(){
    canvas = getStage();
    tileSize = TileSize();
    if (!canvas){ WARN('Kein Canvas (#game) gefunden – pfglue bleibt passiv.'); return; }
    ensureOverlay();
    redraw();
    LOG('Modul geladen', VERSION);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  // ---------- Exports ---------------------------------------------------------
  window.PathOverlay = {
    setPath(path){ previewPath = (Array.isArray(path)&&path.length)? path : null; redraw(); },
    clear(){ previewPath = null; redraw(); },
    enable: enableOverlay,
    redraw
  };
})();
