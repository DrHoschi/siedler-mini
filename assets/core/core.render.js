/* ============================================================================
 * core.render.js — v17.3.2
 * Zweck:
 *   - Karten/Entity-Rendering ohne Tile-Seams (runden + overdraw)
 *   - Carrier-Layer draw()
 *   - Entity-Debug-Overlay (via window.DEBUG_ENTITY_OVERLAY)
 * Events:
 *   - cb:toggle-entity-overlay {detail:{enabled}}
 * ============================================================================ */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[render] GameCore.env fehlt'); return; }

  var S = ns.state, U = ns.util;
  var canvas=null, ctx=null, DPR=1, viewW=0, viewH=0;

  function init(c, context){
    canvas=c; ctx=context||c.getContext('2d'); fit();
    try{ ctx.imageSmoothingEnabled=false; }catch(_){}
    window.addEventListener('resize', fit);
    U.on('cb:toggle-entity-overlay', e=>{
      window.DEBUG_ENTITY_OVERLAY=!!(e&&e.detail&&e.detail.enabled);
      ns.ok('[render] entity-overlay='+(window.DEBUG_ENTITY_OVERLAY?'AN':'AUS'));
      draw();
    });
    ns.ok('[render] Modul geladen (v17.3.2)');
  }

  function fit(){
    if(!canvas) return;
    ctx=canvas.getContext('2d');
    DPR=Math.max(1, Math.min(3, window.devicePixelRatio||1));
    let w=Math.max(320, Math.floor(window.innerWidth));
    let h=Math.max(240, Math.floor(window.innerHeight));
    canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0); try{ctx.imageSmoothingEnabled=false;}catch(_){}
    viewW=w; viewH=h; clampCam(); draw();
  }

  function clampCam(){
    if(!S.map) return;
    var size={w:S.map.width*S.map.tile, h:S.map.height*S.map.tile}, z=S.cam.zoom||1;
    S.cam.x=U.clamp(S.cam.x,0,Math.max(0,size.w-viewW/z));
    S.cam.y=U.clamp(S.cam.y,0,Math.max(0,size.h-viewH/z));
  }

  function draw(){
    if(!ctx||!S.map) return;
    var t=S.map.tile|0, w=S.map.width|0, h=S.map.height|0, z=S.cam.zoom||1;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    var left=Math.max(0, Math.floor(S.cam.x/t));
    var top =Math.max(0, Math.floor(S.cam.y/t));
    var right =Math.min(w, Math.ceil((S.cam.x+viewW/z)/t));
    var bottom=Math.min(h, Math.ceil((S.cam.y+viewH/z)/t));

    var layers=S.map.layers||[], colors=['#678F4B','#739A53','#7FA65B','#8CB367'];

    if (!S.atlas || !S.tilesetImg || !layers.length){
      for (let ty=top; ty<bottom; ty++){
        for (let tx=left; tx<right; tx++){
          let dx=Math.round((tx*t - S.cam.x)*z);
          let dy=Math.round((ty*t - S.cam.y)*z);
          let ds=Math.round(t*z)+1;
          ctx.fillStyle=colors[(tx+ty)%colors.length];
          ctx.fillRect(dx,dy,ds,ds);
        }
      }
    } else {
      let L0=layers[0], data=L0.data||[];
      for (let ty=top; ty<bottom; ty++){
        for (let tx=left; tx<right; tx++){
          let i=ty*w+tx, idx=data[i]|0;
          let dx=Math.round((tx*t - S.cam.x)*z);
          let dy=Math.round((ty*t - S.cam.y)*z);
          let ds=Math.round(t*z)+1;
          let ti=S.atlas.tiles && S.atlas.tiles[idx];
          if (ti){
            try{ ctx.drawImage(S.tilesetImg, ti.x,ti.y,ti.w,ti.h, dx,dy,ds,ds); }
            catch(_){ ctx.fillStyle='#678F4B'; ctx.fillRect(dx,dy,ds,ds); }
          } else {
            ctx.fillStyle='#678F4B'; ctx.fillRect(dx,dy,ds,ds);
          }
        }
      }
    }

    // Entities
    for (let i=0;i<S.entities.length;i++){
      let e=S.entities[i], ex=Math.round((e.x-S.cam.x)*z), ey=Math.round((e.y-S.cam.y)*z);
      let ew=Math.round(e.w*z), eh=Math.round(e.h*z);
      if (e.img){ try{ ctx.drawImage(e.img, ex,ey,ew,eh); }catch(_){}
      } else { ctx.fillStyle="rgba(255,220,0,.65)"; ctx.fillRect(ex,ey,ew,eh);
               ctx.lineWidth=Math.max(2,(2/z)); ctx.strokeStyle="rgba(60,50,0,.9)";
               ctx.strokeRect(ex+0.5,ey+0.5,ew-1,eh-1); }
    }

    // Carrier-Layer
    try{ if (window.Carriers?.draw) Carriers.draw(ctx, S.cam); }catch(_){}

    if (window.DEBUG_ENTITY_OVERLAY) drawEntityOverlay(ctx);
  }

  function drawEntityOverlay(ctx){
    let t=S.map.tile|0, z=S.cam.zoom||1;

    if (S.obstacles){
      ctx.save(); ctx.globalAlpha=.22; ctx.fillStyle='#ff00ff';
      for(let y=0;y<S.obstH;y++) for(let x=0;x<S.obstW;x++){
        if(!S.obstacles[y*S.obstW+x]) continue;
        let dx=Math.round((x*t-S.cam.x)*z), dy=Math.round((y*t-S.cam.y)*z), ds=Math.round(t*z)+1;
        ctx.fillRect(dx,dy,ds,ds);
      }
      ctx.restore();
    }

    ctx.save(); ctx.lineWidth=Math.max(1,2/z);
    for (let e of S.entities){
      let bx=Math.round((e.x-S.cam.x)*z), by=Math.round((e.y-S.cam.y)*z);
      let bw=Math.round(e.w*z), bh=Math.round(e.h*z);
      ctx.strokeStyle='rgba(0,255,255,.9)'; ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
    }
    ctx.restore();
  }

  ns.Render = { init:init, draw:draw, fit:fit, clampCam:clampCam };

})(window.GameCore = window.GameCore || {});
