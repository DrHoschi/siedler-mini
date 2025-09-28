/* ============================================================================
 * core.input.js — Eingabe & Build-Interaktion
 * Version: v17.5.0
 * Projekt: Neue Siedler
 *
 * Aufgaben
 *  - Pointer/Touch auf dem Canvas (#game) in Tile-Koordinaten übersetzen
 *  - Build-Tool setzen/platzieren (Events mit Engine-agnostischer Fassade)
 *  - Hover-Tile publizieren (cb:hover-tile)
 *  - ESC/Right-Click → Tool zurücksetzen
 *  - Kamera-Offsets berücksichtigen (optional via cb:camera-changed)
 *
 * Events (listen)
 *  - cb:set-build-tool        {type|null}
 *  - cb:camera-changed        {x,y,zoom}  (Tiles)
 *
 * Events (dispatch)
 *  - cb:hover-tile            {tx,ty,screenX,screenY}
 *  - cb:place-building        {type,x,y}
 *  - cb:request-repaint
 *
 * Abhängigkeiten
 *  - window.Game (getTileSize)
 *  - CBLog (Polyfill reicht)
 * ========================================================================== */
(function(){
  'use strict';

  var VER = 'v17.5.0';
  var MOD = '[input]';

  // ---- Logging --------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m);}catch(_){ console.warn(m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(m);}catch(_){ console.error(m);} }

  // ---- State ----------------------------------------------------------------
  var stage = null;            // Canvas #game
  var tileSize = 64;           // px
  var cam = { x:0, y:0, zoom:1 }; // Karten-Kamera in Tiles (fallback)
  var buildTool = null;        // aktuelles Bau-Werkzeug (string)

  // ---- Helpers --------------------------------------------------------------
  function updTileSize(){
    try{ tileSize = (window.Game?.getTileSize?.()|0) || 64; }catch(_){}
    if (tileSize<=0) tileSize = 64;
  }
  function screenToTile(clientX, clientY){
    var rect = stage.getBoundingClientRect ? stage.getBoundingClientRect() : {left:0, top:0, width:stage.width, height:stage.height};
    var sx = (clientX - rect.left);
    var sy = (clientY - rect.top);
    // Zoom/Kamera in Tile-Einheiten berücksichtigen
    var tx = Math.floor((sx / (tileSize*cam.zoom)) + cam.x);
    var ty = Math.floor((sy / (tileSize*cam.zoom)) + cam.y);
    if (tx<0) tx=0; if (ty<0) ty=0;
    return { tx:tx, ty:ty, sx:sx, sy:sy };
  }

  // ---- Event-Wiring ---------------------------------------------------------
  function bindPointer(){
    if (!stage) return;

    // Hover → cb:hover-tile
    stage.addEventListener('pointermove', function(ev){
      try{
        var p = screenToTile(ev.clientX, ev.clientY);
        window.dispatchEvent(new CustomEvent('cb:hover-tile', { detail:{
          tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy
        }}));
      }catch(_){}
    }, {passive:true});

    // Platzierung mit Linksklick/Touch
    stage.addEventListener('pointerdown', function(ev){
      // Nur Linksklick (0) oder Touch (button==0/undefined)
      if (ev.button != null && ev.button !== 0) return;
      if (!buildTool) return;
      try{
        var p = screenToTile(ev.clientX, ev.clientY);
        window.dispatchEvent(new CustomEvent('cb:place-building', { detail:{
          type: buildTool, x:p.tx, y:p.ty
        }}));
        ok('[ok] Gebäude platziert: '+buildTool+' at '+p.tx+' '+p.ty);
        // Tool zurücksetzen (klassisches Verhalten)
        window.Game?.resetBuildTool?.();
      }catch(e){
        warn(MOD+' Platzierung fehlgeschlagen: '+(e&&e.message));
      }
    }, {passive:true});

    // Rechtsklick → Tool resetten (verhindert Kontextmenü)
    stage.addEventListener('contextmenu', function(ev){
      if (buildTool){
        ev.preventDefault();
        window.Game?.resetBuildTool?.();
      }
    });

    // ESC → Tool resetten
    window.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && buildTool){
        try{ window.Game?.resetBuildTool?.(); }catch(_){}
      }
    });
  }

  function bindGlobal(){
    // Build-Tool Änderungen
    window.addEventListener('cb:set-build-tool', function(ev){
      var t = ev?.detail?.type || null;
      buildTool = t;
      // Cursor optional leicht ändern (nur Stage)
      try{
        stage.style.cursor = buildTool ? 'crosshair' : 'default';
      }catch(_){}
    });

    // Kamera-Änderungen (Tiles)
    window.addEventListener('cb:camera-changed', function(ev){
      try{
        var d = ev?.detail||{};
        cam.x = (typeof d.x==='number')? d.x : cam.x;
        cam.y = (typeof d.y==='number')? d.y : cam.y;
        cam.zoom = (typeof d.zoom==='number')? d.zoom : cam.zoom;
      }catch(_){}
    });
  }

  // ---- Init -----------------------------------------------------------------
  function init(){
    try{
      stage = document.getElementById('game');
      if (!stage){ warn(MOD+' Canvas #game nicht gefunden'); return; }
      updTileSize();
      bindGlobal();
      bindPointer();
      ok(MOD+' Modul gebunden ('+VER+')');
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
