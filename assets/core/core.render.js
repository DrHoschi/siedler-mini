/* ============================================================================
 * Datei: core.render.js
 * Projekt: Siedler-Mini
 * Version: v17.1.1
 * Zweck:
 *   - Karten- und Entity-Rendering
 *   - Camera berücksichtigen
 *   - Carrier-Layer zeichnen (delegiert an Carriers.draw)
 *   - Kein PF-Overlay (liegt in core.pfglue.js)
 *   - NEU: Entity-Debug-Overlay (Obstacles/Doors/Bounds) per Toggle
 * Events:
 *   - cb:toggle-entity-overlay {detail:{enabled:boolean}}
 * ============================================================================ */
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
    // Inspector-Toggle für Entity-Debug
    U.on('cb:toggle-entity-overlay', function(e){
      var enabled = !!(e && e.detail && e.detail.enabled);
      window.DEBUG_ENTITY_OVERLAY = enabled;
      ns.ok('[render] entity-overlay='+(enabled?'AN':'AUS'));
      draw();
    });
    ns.ok('[render] Modul geladen (v17.1.1)');
  }

  // --------------------------- Fit & Camera ----------------------------------
  function clampCam(){
    if (!S.map) return;
    var size = { w:S.map.width*S.map.tile, h:S.map.height*S.map.tile };
    var maxX = Math.max(0, size.w - viewW/(S.cam.zoom||1));
    var maxY = Math.max(0, size.h - viewH/(S.cam.zoom||1));
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
    viewW=w; viewH=h;
    // 👉 Für Map/Clamp auch global merken
    ns.__viewW__ = w;
    ns.__viewH__ = h;
    clampCam(); draw();
  }

  // --------------------------- Draw ------------------------------------------
  function draw(){
    if (!ctx || !S.map) return;
    var t=S.map.tile, w=S.map.width, h=S.map.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    var left   = Math.floor(S.cam.x / t);
    var top    = Math.floor(S.cam.y / t);
    var right  = Math.ceil((S.cam.x + viewW/(S.cam.zoom||1)) / t);
    var bottom = Math.ceil((S.cam.y + viewH/(S.cam.zoom||1)) / t);
    left=U.clamp(left,0,w-1); top=U.clamp(top,0,h-1);
    right=U.clamp(right,0,w); bottom=U.clamp(bottom,0,h);

    var layers=S.map.layers||[];
    var colors=['#5a7a39','#6b8f3e','#7aa346','#90b45a'];

    if (!S.atlas || !S.tilesetImg || !layers.length){
      // Fallback: einfache Farbflächen
      for (var ty=top; ty<bottom; ty++){
        for (var tx=left; tx<right; tx++){
          var sx=Math.floor((tx*t - S.cam.x)*(S.cam.zoom||1));
          var sy=Math.floor((ty*t - S.cam.y)*(S.cam.zoom||1));
          var ss=Math.ceil(t*(S.cam.zoom||1));
          ctx.fillStyle=colors[(tx+ty)%colors.length];
          ctx.fillRect(sx,sy,ss,ss);
        }
      }
    } else {
      // Mit Tileset zeichnen (nur Layer 0 als Terrain)
      var L0=layers[0], data=L0.data||[];
      for (var ty2=top; ty2<bottom; ty2++){
        for (var tx2=left; tx2<right; tx2++){
          var i=ty2*w+tx2, idx=data[i]|0;
          var drawX=Math.floor((tx2*t - S.cam.x)*(S.cam.zoom||1));
          var drawY=Math.floor((ty2*t - S.cam.y)*(S.cam.zoom||1));
          var drawS=Math.ceil(t*(S.cam.zoom||1));
          var ti=S.atlas.tiles && S.atlas.tiles[idx];
          if (ti){
            try {
              ctx.drawImage(S.tilesetImg, ti.x,ti.y,ti.w,ti.h, drawX,drawY,drawS,drawS);
            } catch(e){ ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
          } else { ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
        }
      }
    }

    // Entities
    for (var k=0;k<S.entities.length;k++){
      var e=S.entities[k];
      var dx=Math.floor((e.x - S.cam.x)*(S.cam.zoom||1));
      var dy=Math.floor((e.y - S.cam.y)*(S.cam.zoom||1));
      var dw=Math.ceil(e.w*(S.cam.zoom||1));
      var dh=Math.ceil(e.h*(S.cam.zoom||1));
      if (e.img) {
        try { ctx.drawImage(e.img, dx,dy,dw,dh); } catch(_){}
      } else {
        // Deutlich sichtbarer Fallback
        ctx.fillStyle="rgba(255,220,0,.65)";
        ctx.fillRect(dx,dy,dw,dh);
        ctx.lineWidth = Math.max(2, (2/(S.cam.zoom||1)));
        ctx.strokeStyle = "rgba(60,50,0,.9)";
        ctx.strokeRect(dx+0.5,dy+0.5,dw-1,dh-1);
      }
    }

    // Carrier-Layer
    try{ if (window.Carriers && Carriers.draw) Carriers.draw(ctx, S.cam); }catch(_){}

    // ---------------- Entity-Debug-Overlay (optional) -------------------------
    if (window.DEBUG_ENTITY_OVERLAY){
      drawEntityDebugOverlay(ctx);
    }
  }

  function drawEntityDebugOverlay(ctx){
    var t=S.map.tile, zoom=(S.cam.zoom||1);

    // Obstacles (magenta)
    if (S.obstacles){
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ff00ff';
      for (var y=0; y<S.obstH; y++){
        for (var x=0; x<S.obstW; x++){
          var o = S.obstacles[y*S.obstW + x];
          if (!o) continue;
          var dx = Math.floor((x*t - S.cam.x)*zoom);
          var dy = Math.floor((y*t - S.cam.y)*zoom);
          var ds = Math.ceil(t*zoom);
          ctx.fillRect(dx,dy,ds,ds);
        }
      }
      ctx.restore();
    }

    // Türen (grün) + Entity-Bounds (cyan)
    ctx.save();
    ctx.lineWidth = Math.max(1, 2/zoom);

    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i];

      // Bounds
      var bx=Math.floor((e.x - S.cam.x)*zoom);
      var by=Math.floor((e.y - S.cam.y)*zoom);
      var bw=Math.ceil(e.w*zoom);
      var bh=Math.ceil(e.h*zoom);
      ctx.strokeStyle='rgba(0,255,255,0.9)';
      ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);

      // Türen
      var doors = (ns.Entities && ns.Entities.getConfiguredDoorsTiles)
        ? ns.Entities.getConfiguredDoorsTiles(e) : [];
      if (doors && doors.length){
        ctx.strokeStyle='rgba(0,200,0,0.95)';
        for (var d=0; d<doors.length; d++){
          var tx=doors[d].x, ty=doors[d].y;
          var dx=Math.floor((tx*t - S.cam.x)*zoom);
          var dy=Math.floor((ty*t - S.cam.y)*zoom);
          var ds=Math.ceil(t*zoom);
          ctx.strokeRect(dx+0.5,dy+0.5,ds-1,ds-1);
        }
      }

      // gewählte Exit-/Entry-Tür hervorheben
      try{
        var best = ns.Entities && (ns.Entities.pickExitDoor(e) || ns.Entities.pickEntryDoor(e));
        if (best){
          var dx2=Math.floor((best.x*t - S.cam.x)*zoom);
          var dy2=Math.floor((best.y*t - S.cam.y)*zoom);
          var ds2=Math.ceil(t*zoom);
          ctx.strokeStyle='rgba(0,255,0,1)';
          ctx.lineWidth = Math.max(2, 3/zoom);
          ctx.strokeRect(dx2+0.5,dy2+0.5,ds2-1,ds2-1);
        }
      }catch(_){}
    }

    ctx.restore();
  }

  // --------------------------- Export ----------------------------------------
  ns.Render = { init:init, draw:draw, fit:fit, clampCam:clampCam };

})(window.GameCore = window.GameCore || {});
