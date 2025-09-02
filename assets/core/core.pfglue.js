/* ============================================================================
 * Datei: core.pfglue.js
 * Projekt: Siedler-Mini
 * Version: v17.0.0
 * Zweck:
 *   - PathFinder-Integration (lazy init + Polling)
 *   - Road-/Obstacle-Provider an PF durchreichen
 *   - Debug-Overlay: separates Canvas (#pf-overlay) + eigener RAF-Loop
 *   - Event-Hooks:
 *       • cb:toggle-path-overlay  → window.DEBUG_PATH_OVERLAY (true/false)
 *       • cb:pf-heat-reset        → PathFinder.resetHeat() (wenn vorhanden)
 *       • cb:request-repaint      → Overlay neu zeichnen (soft)
 *   - Startet automatisch, sobald Engine/Spiel meldet, dass es läuft
 *     (cb:engine-ready / cb:game-started)
 * Hinweise:
 *   - Kein Invasiver Eingriff in dein monolithisches game.js nötig.
 *   - Overlay zeichnet NUR, wenn window.DEBUG_PATH_OVERLAY === true.
 * ============================================================================ */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[pfglue] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;

  var PF_READY = false;
  var initTimer = 0;

  // -------------- PF-Init (lazy, robust) -------------------------------------
  function tryPFInit(){
    if (PF_READY) return;
    try{
      if (!window.PathFinder || typeof PathFinder.init!=='function') return;

      // Mapgröße verfügbar?
      var w = S.map && S.map.width|0, h = S.map && S.map.height|0;
      if (!w || !h) return;

      // PF initialisieren
      PathFinder.init(function(){ return { w:w, h:h }; });

      // Provider setzen
      if (typeof PathFinder.setObstacleProvider==='function' && ns.Entities?.getObstacleAt){
        PathFinder.setObstacleProvider(ns.Entities.getObstacleAt);
      }
      if (typeof PathFinder.setRoadMask==='function' && S.roads){
        PathFinder.setRoadMask(S.roads);
      }

      PF_READY = true;
      ns.ok('[PF] init OK '+w+'x'+h+' (v17.0.0)');
    }catch(e){
      ns.warn('[PF] init Fehler: '+(e && e.message));
    }
  }

  function startPFInitPolling(){
    if (initTimer) return;
    initTimer = setInterval(function(){
      if (PF_READY){ clearInterval(initTimer); initTimer=0; return; }
      tryPFInit();
    }, 200);
  }

  // -------------- Overlay-Canvas (#pf-overlay) --------------------------------
  var overlayCanvas = null, overlayCtx = null, rafId = 0;

  function ensureOverlayCanvas(){
    if (overlayCanvas && overlayCtx) return;

    var base = document.getElementById('game') || document.getElementById('stage') || document.querySelector('canvas');
    if (!base) return;

    overlayCanvas = document.getElementById('pf-overlay');
    if (!overlayCanvas){
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.id = 'pf-overlay';
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.pointerEvents = 'none';
      overlayCanvas.style.left = '0px';
      overlayCanvas.style.top  = '0px';
      overlayCanvas.style.zIndex = '10';
      // Canvas im selben Container wie base platzieren (falls vorhanden)
      (base.parentElement || document.body).appendChild(overlayCanvas);
    }
    overlayCtx = overlayCanvas.getContext('2d');
    syncOverlaySize();
    window.addEventListener('resize', syncOverlaySize);
    window.addEventListener('orientationchange', syncOverlaySize);
  }

  function syncOverlaySize(){
    var base = document.getElementById('game') || document.getElementById('stage') || document.querySelector('canvas');
    if (!base || !overlayCanvas) return;
    var rect = base.getBoundingClientRect();
    overlayCanvas.width  = Math.max(1, Math.floor(rect.width));
    overlayCanvas.height = Math.max(1, Math.floor(rect.height));
    overlayCanvas.style.left = Math.floor(rect.left + window.scrollX) + 'px';
    overlayCanvas.style.top  = Math.floor(rect.top  + window.scrollY) + 'px';
    overlayCanvas.style.width  = overlayCanvas.width + 'px';
    overlayCanvas.style.height = overlayCanvas.height + 'px';
  }

  function clearOverlay(){
    if (!overlayCtx || !overlayCanvas) return;
    overlayCtx.clearRect(0,0, overlayCanvas.width, overlayCanvas.height);
  }

  function overlayLoop(){
    rafId = window.requestAnimationFrame(overlayLoop);
    if (!window.DEBUG_PATH_OVERLAY){ clearOverlay(); return; }
    ensureOverlayCanvas(); if (!overlayCtx) return;
    syncOverlaySize();

    // Zeichnen: PathFinder liefert Heatmap/Pfade
    try{
      if (PF_READY && window.PathFinder && typeof PathFinder.drawOverlay==='function'){
        // Kamera in Tile-Koords + Zoom weiterreichen
        var cam = S.cam || {x:0,y:0,zoom:1};
        var safeCam = { x:(cam.x / (S.map?.tile||64)), y:(cam.y / (S.map?.tile||64)), zoom:cam.zoom||1 };
        PathFinder.drawOverlay(overlayCtx, safeCam);
      }
    }catch(_){}
  }

  function startOverlayLoop(){
    if (!('requestAnimationFrame' in window)) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(overlayLoop);
  }

  // -------------- Events / Hooks ---------------------------------------------
  // Overlay-Schalter (vom Inspector-Tab)
  U.on('cb:toggle-path-overlay', function(e){
    var enabled = !!(e && e.detail && e.detail.enabled);
    window.DEBUG_PATH_OVERLAY = enabled;
    ns.ok('[pfglue] overlay='+(enabled?'AN':'AUS'));
  });

  // Heatmap Reset (optional)
  U.on('cb:pf-heat-reset', function(){
    try{
      if (window.PathFinder && typeof PathFinder.resetHeat==='function'){
        PathFinder.resetHeat();
        ns.ok('[PF] Heatmap reset');
      } else {
        ns.warn('[PF] resetHeat() nicht verfügbar.');
      }
    }catch(_){}
  });

  // Soft repaint request
  U.on('cb:request-repaint', function(){ /* Overlay-Loop tickt ohnehin */ });

  // Wenn Engine/Spiel startet → PF-Init & Overlay loslegen
  U.on('cb:engine-ready', function(){ startPFInitPolling(); startOverlayLoop(); });
  U.on('cb:game-started', function(){ tryPFInit(); startPFInitPolling(); startOverlayLoop(); });

  // Fallback: nach kurzer Zeit immerhin probieren
  setTimeout(function(){ tryPFInit(); startPFInitPolling(); }, 1500);

  // -------------- Export ------------------------------------------------------
  ns.PF = {
    init: tryPFInit,
    startOverlayLoop: startOverlayLoop
  };

  ns.ok('[pfglue] Modul geladen (v17.0.0)');

})(window.GameCore = window.GameCore || {});
