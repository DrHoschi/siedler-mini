/* ============================================================================
 * Datei: core.render.js
 * Projekt: Siedler-Mini
 * Version: v17.0.0
 * Zweck:
 *   - Karten- und Entity-Rendering
 *   - Camera berücksichtigen
 *   - Carrier-Layer zeichnen (delegiert an Carriers.draw)
 *   - Kein PathFinder-Overlay (liegt in core.pfglue.js)
 * ============================================================================
 */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[render] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;

  var ctx=null, canvas=null, DPR=1, viewW=0, viewH=0;

  // --------------------------- Init ------------------------------------------
  function init(c, context){
    canvas = c; ctx = context; fit();
    window.addEventListener('resize', fit);
    ns.ok('[render] Modul geladen (v17.0.0)');
  }

  // --------------------------- Fit & Camera ----------------------------------
  function clampCam(){
    if (!S.map) return;
    var size = { w:S.map.width*S.map.tile, h:S.map.height*S.map.tile };
    var maxX = Math.max(0, size.w - viewW/S.cam.zoom);
    var maxY = Math.max(0, size.h - viewH/S.cam.zoom);
    S.cam.x = U.clamp(S.cam.x, 0, maxX);
    S.cam.y = U.clamp(S.cam.y, 0, maxY);
  }

  function fit(){
    if (!canvas || !ctx) return;
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    var w = Math.max(320, Math.floor(window.innerWidth));
    var h = Math.max(240, Math.floor(window.innerHeight));
    canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    if (ctx.setTransform) ctx.setTransform(DPR,0,0,DPR,0,0);
    viewW=w; viewH=h; clampCam(); draw();
  }

  // --------------------------- Draw ------------------------------------------
  function draw(){
    if (!ctx || !S.map) return;
    var t=S.map.tile, w=S.map.width, h=S.map.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    var left   = Math.floor(S.cam.x / t);
    var top    = Math.floor(S.cam.y / t);
    var right  = Math.ceil((S.cam.x + viewW/S.cam.zoom) / t);
    var bottom = Math.ceil((S.cam.y + viewH/S.cam.zoom) / t);
    left=U.clamp(left,0,w-1); top=U.clamp(top,0,h-1);
    right=U.clamp(right,0,w); bottom=U.clamp(bottom,0,h);

    var layers=S.map.layers||[];
    var colors=['#5a7a39','#6b8f3e','#7aa346','#90b45a'];

    if (!S.atlas || !S.tilesetImg || !layers.length){
      // Fallback: einfache Farbflächen
      for (var ty=top; ty<bottom; ty++){
        for (var tx=left; tx<right; tx++){
          var sx=Math.floor((tx*t - S.cam.x)*S.cam.zoom);
          var sy=Math.floor((ty*t - S.cam.y)*S.cam.zoom);
          var ss=Math.ceil(t*S.cam.zoom);
          ctx.fillStyle=colors[(tx+ty)%colors.length];
          ctx.fillRect(sx,sy,ss,ss);
        }
      }
    } else {
      // Mit Tileset zeichnen
      var L0=layers[0], data=L0.data||[];
      for (var ty2=top; ty2<bottom; ty2++){
        for (var tx2=left; tx2<right; tx2++){
          var i=ty2*w+tx2, idx=data[i]|0;
          var drawX=Math.floor((tx2*t - S.cam.x)*S.cam.zoom);
          var drawY=Math.floor((ty2*t - S.cam.y)*S.cam.zoom);
          var drawS=Math.ceil(t*S.cam.zoom);
          var ti=S.atlas.tiles && S.atlas.tiles[idx];
          if (ti){
            try {
              ctx.drawImage(S.tilesetImg, ti.x,ti.y,ti.w,ti.h,
                drawX,drawY,drawS,drawS);
            } catch(e){ ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
          } else { ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
        }
      }
    }

    // Entities rendern
    for (var k=0;k<S.entities.length;k++){
      var e=S.entities[k];
      var dx=Math.floor((e.x - S.cam.x)*S.cam.zoom);
      var dy=Math.floor((e.y - S.cam.y)*S.cam.zoom);
      var dw=Math.ceil(e.w*S.cam.zoom);
      var dh=Math.ceil(e.h*S.cam.zoom);
      if (e.img) {
        try { ctx.drawImage(e.img, dx,dy,dw,dh); } catch(_){}
      } else {
        ctx.fillStyle="rgba(255,255,255,.2)";
        ctx.fillRect(dx,dy,dw,dh);
      }
    }

    // Carrier-Layer
    try{ if (window.Carriers && Carriers.draw) Carriers.draw(ctx, S.cam); }catch(_){}
  }

  // --------------------------- Export ----------------------------------------
  ns.Render = { init:init, draw:draw, fit:fit, clampCam:clampCam };

})(window.GameCore = window.GameCore || {});
