/* ============================================================================
 * Datei: core.input.js
 * Projekt: Siedler-Mini
 * Version: v17.1.1
 * Zweck:
 *   - Maus/Touch/Keyboard: Pan/Zoom
 *   - Platzieren per Klick (build-Tool)
 *   - Delegiert: Entities.canPlace/place + Render.draw
 * ============================================================================
 */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[input] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;

  var canvas=null, ctx=null;
  var TOOL = window.__GC_TOOL__ || { mode:null, key:null };

  function setTool(mode, payload){
    if (mode === 'build'){
      var key = (typeof payload==='string') ? payload : (payload && payload.key) || null;
      TOOL.mode = 'build';
      TOOL.key = key ? ns.Entities.resolveKey(key) : null;
      window.__GC_TOOL__ = TOOL;
      ns.ok('[build] Tool gesetzt: '+(TOOL.key||'(none)'));
    } else {
      TOOL.mode = mode || null;
      TOOL.key = null;
      window.__GC_TOOL__ = TOOL;
      if (mode===null) ns.ok('[ok] Tool zurückgesetzt');
    }
  }

  function zoomAt(factor, cx, cy){
    var preX = S.cam.x + cx / (S.cam.zoom||1);
    var preY = S.cam.y + cy / (S.cam.zoom||1);
    S.cam.zoom = U.clamp((S.cam.zoom||1)*factor, S.cam.minZ||0.5, S.cam.maxZ||3);
    var postX = S.cam.x + cx / (S.cam.zoom||1);
    var postY = S.cam.y + cy / (S.cam.zoom||1);
    S.cam.x += (preX - postX);
    S.cam.y += (preY - postY);
    ns.Map.clampCam();
    ns.Render.draw();
  }

  function bind(c){
    canvas = c; ctx = c.getContext && c.getContext('2d');

    var drag = { on:false, sx:0, sy:0, cx:0, cy:0, pinch:false, last:0 };

    canvas.addEventListener('mousedown', function(e){
      drag.on=true; drag.pinch=false; drag.sx=e.clientX; drag.sy=e.clientY; drag.cx=S.cam.x; drag.cy=S.cam.y;
    });
    window.addEventListener('mousemove', function(e){
      if(!drag.on || drag.pinch) return;
      S.cam.x = drag.cx - (e.clientX - drag.sx) / (S.cam.zoom||1);
      S.cam.y = drag.cy - (e.clientY - drag.sy) / (S.cam.zoom||1);
      ns.Map.clampCam(); ns.Render.draw();
    });
    window.addEventListener('mouseup', function(){ drag.on=false; drag.pinch=false; });

    canvas.addEventListener('wheel', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue=false);
      var rect = canvas.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      zoomAt(e.deltaY<0 ? 1.15 : 1/1.15, cx, cy);
    }, {passive:false});

    canvas.addEventListener('click', function(e){
      if (TOOL.mode!=='build' || !TOOL.key || !S.map) return;
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var wx = S.cam.x + sx / (S.cam.zoom||1);
      var wy = S.cam.y + sy / (S.cam.zoom||1);
      var tile = ns.Map.getTileSize();
      var tx = Math.floor(wx / tile);
      var ty = Math.floor(wy / tile);
      if (ns.Entities.canPlace(TOOL.key, tx, ty)){
        ns.Entities.place(TOOL.key, tx, ty);
        ns.Render.draw();
      } else {
        ns.warn('[game] Platzierung nicht möglich bei '+tx+','+ty+' für '+TOOL.key);
      }
    });

    // Touch
    canvas.addEventListener('touchstart', function(e){
      if (e.touches.length===1){
        var t=e.touches[0]; drag.on=true; drag.pinch=false; drag.sx=t.clientX; drag.sy=t.clientY; drag.cx=S.cam.x; drag.cy=S.cam.y;
      } else if (e.touches.length>=2){
        drag.on=true; drag.pinch=true;
        var a=e.touches[0], b=e.touches[1];
        drag.last = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      }
    }, {passive:true});
    canvas.addEventListener('touchmove', function(e){
      if (!drag.on) return;
      if (!drag.pinch && e.touches.length===1){
        var t=e.touches[0];
        S.cam.x = drag.cx - (t.clientX - drag.sx) / (S.cam.zoom||1);
        S.cam.y = drag.cy - (t.clientY - drag.sy) / (S.cam.zoom||1);
        ns.Map.clampCam(); ns.Render.draw();
      } else if (e.touches.length>=2){
        var a=e.touches[0], b=e.touches[1];
        var d=Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
        if (drag.last){
          var factor = d / drag.last;
          var r = canvas.getBoundingClientRect();
          var cx = ((a.clientX+b.clientX)/2) - r.left;
          var cy = ((a.clientY+b.clientY)/2) - r.top;
          zoomAt(factor, cx, cy);
        }
        drag.last=d;
      }
    }, {passive:true});
    window.addEventListener('touchend', function(){ drag.on=false; drag.pinch=false; drag.last=0; });

    // Keyboard-Pan
    window.addEventListener('keydown', function(e){
      var k=(e.key||'').toLowerCase();
      var step=Math.max(16, Math.floor(120/(S.cam.zoom||1)));
      if(k==='arrowleft'||k==='a'){ S.cam.x-=step; }
      else if(k==='arrowright'||k==='d'){ S.cam.x+=step; }
      else if(k==='arrowup'||k==='w'){ S.cam.y-=step; }
      else if(k==='arrowdown'||k==='s'){ S.cam.y+=step; }
      else return;
      ns.Map.clampCam(); ns.Render.draw();
    });

    ns.ok('[input] Modul gebunden (v17.1.1)');
  }

  // --------------------------- Export ----------------------------------------
  ns.Input = { bind:bind, setTool:setTool };

})(window.GameCore = window.GameCore || {});
