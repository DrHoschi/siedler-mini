/* ============================================================================
 * core.render.js — Rendering-Orchestrierung (Overlay für Entities + Hover)
 * Version: v17.5.0
 * Projekt: Neue Siedler
 *
 * Ziele
 *  - Terrain bleibt auf #game (Basis-Renderer, unverändert)
 *  - Neues Overlay-Canvas #game-overlay für:
 *      • Entities (aus CoreEntities) — vorerst als einfache Kacheln
 *      • Hover-Highlight (aktuelles Tile unter Cursor)
 *      • (optional) Pfad-Overlay via PathFinder.drawOverlay
 *  - Kein „Trail“: Overlay wird pro Frame vollständig neu gezeichnet
 *  - Saubere Repaint-Steuerung via cb:request-repaint, Size/Camera/Hover-Events
 *
 * Events (listen)
 *  - cb:request-repaint
 *  - cb:hover-tile            {tx,ty,screenX,screenY}
 *  - cb:camera-changed        {x,y,zoom}
 *  - cb:place-building        {type,x,y}   → nur, um Repaint auszulösen
 *
 * Abhängigkeiten
 *  - window.Game.getTileSize()
 *  - window.CoreEntities.list() (falls nicht vorhanden → graceful fallback)
 *  - window.PathFinder.drawOverlay(ctx,{x,y,zoom}) (optional)
 *
 * Hinweise
 *  - #game füllt per index.html die gesamte Viewport-Größe → Overlay deckt 1:1
 *  - Overlay ist pointer-events:none, stört Interaktionen nicht
 * ========================================================================== */
(function(){
  'use strict';

  var VER = 'v17.5.0';
  var MOD = '[render]';

  // ---- Logging --------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m);}catch(_){ console.warn(m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(m);}catch(_){ console.error(m);} }

  // ---- DOM / Canvas ---------------------------------------------------------
  var base = null;            // #game (Basis-Canvas → Terrain)
  var ov   = null;            // #game-overlay (neu)
  var ctx  = null;            // 2D-Kontext Overlay

  // ---- State ----------------------------------------------------------------
  var tile = 64;
  var cam  = { x:0, y:0, zoom:1 };     // Kamera in Tiles
  var hover = { has:false, x:0, y:0 }; // Hover-Tile in Kartencoords
  var needsRepaint = true;

  // ---- Helpers --------------------------------------------------------------
  function updTileSize(){
    try{ tile = (window.Game?.getTileSize?.()|0) || 64; }catch(_){}
    if (tile<=0) tile=64;
  }
  function resizeOverlayToViewport(){
    // #game ist 100vw x 100vh → Overlay auch
    var w = Math.max(1, (window.innerWidth | 0));
    var h = Math.max(1, (window.innerHeight| 0));
    if (!ov) return;
    if (ov.width !== w || ov.height !== h){
      ov.width = w; ov.height = h;
      needsRepaint = true;
    }
  }
  function clearOverlay(){
    if (!ctx || !ov) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ov.width, ov.height);
  }
  function toScreenXY(tx, ty){
    // Kartentile → Screen (px)
    var px = Math.round((tx - cam.x) * tile * cam.zoom);
    var py = Math.round((ty - cam.y) * tile * cam.zoom);
    return { x:px, y:py };
  }

  // ---- Entities-Zeichnung (einfach) ----------------------------------------
  function drawEntities(){
    var list = null;
    try{ list = window.CoreEntities?.list?.(); }catch(_){}
    if (!list || !list.length) return;

    ctx.lineWidth = Math.max(1, Math.round(2/cam.zoom));
    for (var i=0;i<list.length;i++){
      var e = list[i];
      var p = toScreenXY(e.x, e.y);
      var sz = Math.round(tile * cam.zoom);

      // Fallback-Style je Typ (später durch Texturen/Atlas ersetzen)
      var fill = '#3b82f6';
      var stroke = '#1d4ed8';
      switch(String(e.type)){
        case 'house':      fill='#a78bfa'; stroke='#7c3aed'; break;
        case 'farm':       fill='#34d399'; stroke='#059669'; break;
        case 'depot':      fill='#fbbf24'; stroke='#d97706'; break;
        case 'hq':         fill='#f87171'; stroke='#b91c1c'; break;
        case 'smith':      fill='#f59e0b'; stroke='#b45309'; break;
        case 'lumberjack': fill='#60a5fa'; stroke='#2563eb'; break;
      }

      // Kachel
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      ctx.rect(p.x, p.y, sz, sz);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.save();
      ctx.font = Math.max(10, Math.round(12*cam.zoom))+'px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillText(e.type, p.x+4, p.y+Math.min(sz-4, 14*cam.zoom));
      ctx.restore();
    }
  }

  // ---- Hover-Highlight ------------------------------------------------------
  function drawHover(){
    if (!hover.has) return;
    var p = toScreenXY(hover.x, hover.y);
    var sz = Math.round(tile * cam.zoom);
    ctx.lineWidth = Math.max(1, Math.round(2/cam.zoom));
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.setLineDash([Math.max(2,Math.round(3/cam.zoom)), Math.max(2,Math.round(3/cam.zoom))]);
    ctx.beginPath();
    ctx.rect(p.x+0.5, p.y+0.5, sz-1, sz-1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- Optional: Path-Overlay (Heatmap/Wege) --------------------------------
  function drawPathOverlay(){
    try{
      if (!window.DEBUG_PATH_OVERLAY) return;
      if (window.PathFinder?.drawOverlay && typeof PathFinder.drawOverlay === 'function'){
        PathFinder.drawOverlay(ctx, cam); // erwartet cam={x,y,zoom} in Tiles
      }
    }catch(_){}
  }

  // ---- Repaint --------------------------------------------------------------
  function repaint(){
    if (!needsRepaint || !ctx) return;
    needsRepaint = false;

    clearOverlay();
    // Zeichenreihenfolge: Pfade (unter), Entities, Hover (ober)
    drawPathOverlay();
    drawEntities();
    drawHover();
  }

  function requestRepaint(){ needsRepaint = true; }

  // ---- Event-Wiring ---------------------------------------------------------
  function bindEvents(){
    window.addEventListener('resize', function(){ resizeOverlayToViewport(); requestRepaint(); }, {passive:true});
    window.addEventListener('cb:request-repaint', function(){ requestRepaint(); });
    window.addEventListener('cb:camera-changed', function(ev){
      var d = ev?.detail||{};
      if (typeof d.x==='number')   cam.x = d.x;
      if (typeof d.y==='number')   cam.y = d.y;
      if (typeof d.zoom==='number')cam.zoom = d.zoom;
      requestRepaint();
    });
    window.addEventListener('cb:hover-tile', function(ev){
      var d = ev?.detail||{};
      hover.has = true;
      hover.x = d.tx|0; hover.y = d.ty|0;
      requestRepaint();
    });
    // Wenn die Maus die Bühne verlässt, Hover löschen (optional)
    document.getElementById('game')?.addEventListener('pointerleave', function(){
      hover.has = false; requestRepaint();
    });
    // Platzierung → Repaint
    window.addEventListener('cb:place-building', function(){ requestRepaint(); });
  }

  // ---- Loop (leichtgewichtig) ----------------------------------------------
  function tick(){
    try{ repaint(); }catch(e){ err(MOD+' repaint: '+(e&&e.message)); }
    window.requestAnimationFrame(tick);
  }

  // ---- Init -----------------------------------------------------------------
  function init(){
    try{
      base = document.getElementById('game');
      if (!base){ warn(MOD+' #game nicht gefunden'); return; }

      // Overlay erzeugen, falls nicht vorhanden
      ov = document.getElementById('game-overlay');
      if (!ov){
        ov = document.createElement('canvas');
        ov.id = 'game-overlay';
        // füllt die Viewport-Fläche analog #game
        ov.style.position = 'fixed';
        ov.style.left = '0'; ov.style.top = '0';
        ov.style.width = '100vw'; ov.style.height = '100vh';
        ov.style.pointerEvents = 'none';
        ov.style.zIndex = '2147483601'; // über Terrain, unter FABs (die 2147483647 haben)
        document.body.appendChild(ov);
      }
      ctx = ov.getContext('2d', { alpha:true, desynchronized:true });

      updTileSize();
      resizeOverlayToViewport();
      bindEvents();
      requestRepaint();
      tick();

      ok(MOD+' Modul geladen ('+VER+')');
    }catch(e){
      err(MOD+' Init-Fehler: '+(e&&e.message));
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
