/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-path-heat
 *
 * Zweck   :
 *   - Zeichnet Träger (Carrier) als Kreise über der Map.
 *   - Füttert gleichzeitig das Path-Overlay:
 *       → cb:path:trace Events für den Inspector
 *       → PathOverlay.trace(...) für Heatmap / Trampelpfade
 *
 * Hinweise:
 *   - Nutzt GameUnits.getUnits() + GameCamera.
 *   - Greift NICHT in die Spiellogik ein, rein visuell/debug.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[overlay-carrier]';
  const LOG  = (...a)=>(window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=>(window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  let canvas = null;
  let ctx    = null;
  let rafId  = 0;
  let running = false;

  // Merkt sich pro Unit das letzte Tile (für Path-Traces)
  const lastTiles = new Map(); // key: unit, value: {tx, ty}

  // Canvas für Overlay besorgen / erstellen
  function ensureCanvas(){
    if (canvas && ctx) return;

    const gameCanvas =
      document.getElementById('game-canvas') ||
      document.querySelector('canvas');

    if (!gameCanvas){
      WARN('Kein Game-Canvas gefunden – Overlay aus.');
      return;
    }

    canvas = document.getElementById('unit-overlay');
    if (!canvas){
      canvas = document.createElement('canvas');
      canvas.id = 'unit-overlay';
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '40'; // über Map, unter Inspector
      gameCanvas.parentElement.appendChild(canvas);
    }

    canvas.width  = gameCanvas.width;
    canvas.height = gameCanvas.height;
    canvas.style.width  = gameCanvas.style.width;
    canvas.style.height = gameCanvas.style.height;

    ctx = canvas.getContext('2d');
  }

  function syncCanvasSize(){
    const gameCanvas =
      document.getElementById('game-canvas') ||
      document.querySelector('canvas');
    if (!gameCanvas || !canvas) return;

    if (canvas.width !== gameCanvas.width ||
        canvas.height !== gameCanvas.height){
      canvas.width  = gameCanvas.width;
      canvas.height = gameCanvas.height;
    }
  }

  function currentCamera(){
    const cam = (window.GameCamera && window.GameCamera.getState && window.GameCamera.getState())
             || window.GameCamera
             || window.Camera
             || {};
    return {
      x: cam.x   ?? 0,
      y: cam.y   ?? 0,
      zoom: cam.zoom ?? 1
    };
  }

  function tileSize(){
    // Versucht zuerst GameMap.tileSize, sonst Fallback
    const ts = (window.GameMap && window.GameMap.tileSize) || 32;
    return ts;
  }

  // -------------------------- PATH-TRACE-HILFE ------------------------------

  function feedPathTrace(unit, prevTile, tx, ty, idx){
    const id = unit.id || unit.uid || ('carrier:'+idx);

    const from = prevTile
      ? { x: prevTile.tx, y: prevTile.ty }
      : { x: tx,         y: ty };
    const to   = { x: tx, y: ty };

    // 1) Heatmap / Pfadoverlay direkt füttern
    try{
      if (window.PathOverlay && typeof window.PathOverlay.trace === 'function'){
        window.PathOverlay.trace([from, to], {
          id,
          weight: 1
        });
      }
    }catch(e){
      WARN('PathOverlay.trace Fehler:', e);
    }

    // 2) Event für Inspector / Logs
    try{
      window.dispatchEvent(new CustomEvent('cb:path:trace', {
        detail: {
          id,
          from,
          to,
          len: 1
        }
      }));
    }catch(e){
      WARN('cb:path:trace dispatch fehlgeschlagen:', e);
    }
  }

  // ------------------------------ RENDER ------------------------------------

  function draw(){
    if (!running || !ctx){
      return;
    }

    syncCanvasSize();

    const cam = currentCamera();
    const ts  = tileSize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const units = (window.GameUnits && window.GameUnits.getUnits)
      ? window.GameUnits.getUnits()
      : [];

    for (let i = 0; i < units.length; i++){
      const u = units[i];
      if (!u || u.type !== 'carrier') continue;

      // Weltkoordinaten (Tiles → Pixel-Mitte)
      const ux = (u.x || 0) * ts + ts * 0.5;
      const uy = (u.y || 0) * ts + ts * 0.5;

      // Screen-Koordinaten
      const sx = (ux - cam.x) * cam.zoom;
      const sy = (uy - cam.y) * cam.zoom;

      // Kreis zeichnen
      const r = Math.max(3, ts * 0.2 * cam.zoom);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(50,150,255,0.9)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.stroke();

      // PATH-TRACE: Tile-Position bestimmen
      const tx = Math.round(u.x || 0);
      const ty = Math.round(u.y || 0);

      const prev = lastTiles.get(u);
      if (!prev || prev.tx !== tx || prev.ty !== ty){
        // Nur wenn sich das Tile ändert, einen Schritt in die Heatmap schreiben
        feedPathTrace(u, prev, tx, ty, i);
        lastTiles.set(u, { tx, ty });
      }
    }

    rafId = window.requestAnimationFrame(draw);
  }

  // ---------------------------- START / STOP --------------------------------

  function start(){
    if (running) return;
    ensureCanvas();
    if (!canvas || !ctx) return;
    running = true;
    LOG('gestartet');
    draw();
  }

  function stop(){
    if (!running) return;
    running = false;
    if (rafId){
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (ctx && canvas){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    lastTiles.clear();
    LOG('gestoppt');
  }

  // Bei Reset der Heatmap auch lokale Traces vergessen
  window.addEventListener('cb:overlay-heat-reset', ()=> lastTiles.clear());

  // EXPORT
  window.UnitOverlay = {
    start,
    stop,
    isRunning: ()=>running
  };

  // Auto-Start, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', ()=> start());

  LOG('geladen (v25.12.02-path-heat, wartet auf cb:game:start)');
})();
