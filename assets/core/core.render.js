/* ============================================================================
 * Datei: core.render.js
 * Projekt: Siedler-Mini
 * Version: v17.1.4
 * Zweck:
 *   - Karten- und Entity-Rendering
 *   - DPR/Zoom-stabil (keine Tile-Seams)
 *   - Carrier-Layer zeichnen
 *   - Optional: Entity-Debug-Overlay (window.DEBUG_ENTITY_OVERLAY)
 * Events:
 *   - cb:toggle-entity-overlay {detail:{enabled:boolean}}
 * ============================================================================ */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[render] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;

  var ctx=null, canvas=null, DPR=1, viewW=0, viewH=0;

  function init(c, context){
    canvas = c; ctx = context; fit();
    // Seam-Resistenz
    try { ctx.imageSmoothingEnabled = false; } catch(_){}
    window.addEventListener('resize', fit);
    U.on('cb:toggle-entity-overlay', function(e){
      var enabled = !!(e && e.detail && e.detail.enabled);
      window.DEBUG_ENTITY_OVERLAY = enabled;
      ns.ok('[render] entity-overlay='+(enabled?'AN':'AUS'));
      draw();
    });
    ns.ok('[render] Modul geladen (v17.1.4)');
  }

  function clampCam(){
    if (!S.map) return;
    var size = { w:S.map.width*S.map.tile, h:S.map.height*S.map.tile };
    var maxX = Math.max(0, size.w - viewW/(S.cam.zoom||1));
    var maxY = Math.max(0, size.h - viewH/(S.cam.zoom||1));
    S.cam.x = U.clamp(S.cam.x, 0, maxX);
    S.cam.y = U.clamp(S.cam.y, 0, maxY);
  }

  function fit(){
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    var w = Math.max(320, Math.floor(window.innerWidth));
    var h = Math.max(240, Math.floor(window.innerHeight));
    canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    if (ctx.setTransform) ctx.setTransform(DPR,0,0,DPR,0,0);
    try { ctx.imageSmoothingEnabled = false; } catch(_){}
    viewW=w; viewH=h;
    ns.__viewW__ = w; ns.__viewH__ = h;
    clampCam(); draw();
  }

  function draw(){
    if (!ctx || !S.map) return;
    var t=S.map.tile|0, w=S.map.width|0, h=S.map.height|0, z=(S.cam.zoom||1);

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Sichtbarer Bereich
    var left   = Math.max(0, Math.floor(S.cam.x / t));
    var top    = Math.max(0, Math.floor(S.cam.y / t));
    var right  = Math.min(w, Math.ceil((S.cam.x + viewW/z) / t));
    var bottom = Math.min(h, Math.ceil((S.cam.y + viewH/z) / t));

    var layers=S.map.layers||[];
    var colors=['#5a7a39','#6b8f3e','#7aa346','#90b45a'];

    if (!S.atlas || !S.tilesetImg || !layers.length){
      // Fallback: einfärben – SEAM-FIX: Rundung + Überlappung
      for (var ty=top; ty<bottom; ty++){
        for (var tx=left; tx<right; tx++){
          var sx=Math.round((tx*t - S.cam.x)*z);
          var sy=Math.round((ty*t - S.cam.y)*z);
          var ss=Math.round(t*z)+1; // +1px overdraw
          ctx.fillStyle=colors[(tx+ty)%colors.length];
          ctx.fillRect(sx,sy,ss,ss);
        }
      }
    } else {
      // Tileset – ebenfalls gerundet + overdraw
      var L0=layers[0], data=L0.data||[];
      for (var ty2=top; ty2<bottom; ty2++){
        for (var tx2=left; tx2<right; tx2++){
          var i=ty2*w+tx2, idx=data[i]|0;
          var dx=Math.round((tx2*t - S.cam.x)*z);
          var dy=Math.round((ty2*t - S.cam.y)*z);
          var ds=Math.round(t*z)+1;
          var ti=S.atlas.tiles && S.atlas.tiles[idx];
          if (ti){
            try { ctx.drawImage(S.tilesetImg, ti.x,ti.y,ti.w,ti.h, dx,dy,ds,ds); }
            catch(e){ ctx.fillStyle='#5a7a39'; ctx.fillRect(dx,dy,ds,ds); }
          } else {
            ctx.fillStyle='#5a7a39'; ctx.fillRect(dx,dy,ds,ds);
          }
        }
      }
    }

    // Entities
    for (var k=0;k<S.entities.length;k++){
      var e=S.entities[k];
      var ex=Math.round((e.x - S.cam.x)*z);
      var ey=Math.round((e.y - S.cam.y)*z);
      var ew=Math.round(e.w*z);
      var eh=Math.round(e.h*z);
      if (e.img) {
        try { ctx.drawImage(e.img, ex,ey,ew,eh); } catch(_){}
      } else {
        ctx.fillStyle="rgba(255,220,0,.65)";
        ctx.fillRect(ex,ey,ew,eh);
        ctx.lineWidth = Math.max(2, (2/z));
        ctx.strokeStyle = "rgba(60,50,0,.9)";
        ctx.strokeRect(ex+0.5,ey+0.5,ew-1,eh-1);
      }
    }

    // Carrier-Layer
    try{ if (window.Carriers && Carriers.draw) Carriers.draw(ctx, S.cam); }catch(_){}

    // Entity-Debug-Overlay
    if (window.DEBUG_ENTITY_OVERLAY){ drawEntityDebugOverlay(ctx); }
  }

  function drawEntityDebugOverlay(ctx){
    var t=S.map.tile|0, z=(S.cam.zoom||1);

    // Obstacles (magenta Flächen)
    if (S.obstacles){
      ctx.save();
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff00ff';
      for (var y=0; y<S.obstH; y++){
        for (var x=0; x<S.obstW; x++){
          if (!S.obstacles[y*S.obstW + x]) continue;
          var dx=Math.round((x*t - S.cam.x)*z);
          var dy=Math.round((y*t - S.cam.y)*z);
          var ds=Math.round(t*z)+1;
          ctx.fillRect(dx,dy,ds,ds);
        }
      }
      ctx.restore();
    }

    // Türen (grün) + Entity-Bounds (cyan)
    ctx.save();
    ctx.lineWidth = Math.max(1, 2/z);

    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i];

      var bx=Math.round((e.x - S.cam.x)*z);
      var by=Math.round((e.y - S.cam.y)*z);
      var bw=Math.round(e.w*z);
      var bh=Math.round(e.h*z);
      ctx.strokeStyle='rgba(0,255,255,0.9)';
      ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);

      var doors = (ns.Entities && ns.Entities.getConfiguredDoorsTiles)
        ? ns.Entities.getConfiguredDoorsTiles(e) : [];
      if (doors && doors.length){
        ctx.strokeStyle='rgba(0,200,0,0.95)';
        for (var d=0; d<doors.length; d++){
          var tx=doors[d].x, ty=doors[d].y;
          var dx=Math.round((tx*t - S.cam.x)*z);
          var dy=Math.round((ty*t - S.cam.y)*z);
          var ds=Math.round(t*z)+1;
          ctx.strokeRect(dx+0.5,dy+0.5,ds-1,ds-1);
        }
      }
    }
    ctx.restore();
  }

  ns.Render = { init:init, draw:draw, fit:fit, clampCam:clampCam };

})(window.GameCore = window.GameCore || {});
