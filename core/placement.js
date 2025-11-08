/* ============================================================================
 * Datei   : core/placement.js
 * Version : v25.11.13-final-2
 * Zweck   : Ghost-Preview + Klick setzt cb:build:place
 * Safety  : Klaut keine UI-Klicks (Build-Dock, HUD, Inspector, FAB).
 * ========================================================================== */
(function () {
  'use strict';
  const emit = (n,d={})=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const log  = (m,...a)=>(window.CBLog?.info||console.info)('[place]',m,...a);

  const UI_BLOCK = '#build-dock, #hud-root, #ui-root, #inspector, #inspector-fab';
  const isOnUI = (el)=> !!(el && (el.closest?.(UI_BLOCK)));

  const state = {
    active:false, buildingId:null,
    size:{w:1,h:1}, tile:64, cam:{x:0,y:0,scale:1}
  };

  // Canvas-Overlay (pointer-events:none → blockiert keine UI)
  let cvs=null, ctx=null;
  function ensureLayer(){
    if (cvs) return;
    cvs = document.createElement('canvas');
    cvs.id = 'place-layer';
    Object.assign(cvs.style,{
      position:'fixed', inset:'0', width:'100vw', height:'100vh',
      pointerEvents:'none', zIndex:'2147483642'
    });
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d');
    resize();
  }
  function resize(){
    if (!cvs) return;
    const dpr = Math.max(1, devicePixelRatio||1);
    cvs.width = Math.floor(innerWidth*dpr);
    cvs.height= Math.floor(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize', resize);

  window.__CAM = window.__CAM || { x:0, y:0, scale:1 };
  addEventListener('cb:camera:change', ()=>{ state.cam={...window.__CAM}; if (state.active) redraw(); });

  function getTileSize(){ try { return (window.Game?.getTileSize?.()||64)|0; } catch { return 64; } }
  function screenToWorld(sx,sy){ const {x,y,scale}=state.cam; return { wx:(sx-x)/scale, wy:(sy-y)/scale }; }
  function worldToTile(wx,wy){ const t=state.tile; return { tx:Math.floor(wx/t), ty:Math.floor(wy/t) }; }
  function canPlaceAt(tx,ty){
    const gw=state.size.w|0, gh=state.size.h|0;
    for(let yy=0; yy<gh; yy++){
      for(let xx=0; xx<gw; xx++){
        if (window.Game?.getObstacleAt?.(tx+xx,ty+yy)) return { ok:false, reason:'blocked' };
      }
    }
    return { ok:true };
  }

  let hover={tx:0,ty:0,ok:false};
  function clear(){ if(ctx) ctx.clearRect(0,0,cvs.width,cvs.height); }
  function redraw(){
    if(!state.active) return;
    ensureLayer(); clear();
    const t=state.tile, {x,y,scale}=state.cam;
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    ctx.fillStyle = hover.ok ? 'rgba(80,200,120,0.25)' : 'rgba(220,80,80,0.25)';
    ctx.fillRect(hover.tx*t, hover.ty*t, state.size.w*t, state.size.h*t);
    ctx.restore();
  }

  function onMove(e){
    if (!state.active) return;
    const p = (e.touches ? e.touches[0] : e);
    const { wx, wy } = screenToWorld(p.clientX, p.clientY);
    const { tx, ty } = worldToTile(wx, wy);
    hover = { tx, ty, ok: canPlaceAt(tx,ty).ok }; redraw();
  }
  function onClick(e){
    if (!state.active) return;
    // UI-Klicks ignorieren:
    if (isOnUI(e.target)) return;
    e.preventDefault();
    const p = (e.changedTouches ? e.changedTouches[0] : e);
    const { wx, wy } = screenToWorld(p.clientX, p.clientY);
    const { tx, ty } = worldToTile(wx, wy);
    const chk = canPlaceAt(tx,ty);
    emit('cb:build:place', { buildingId: state.buildingId, x:tx, y:ty, ok:chk.ok, reason:chk.reason });
    if (!chk.ok) { hover={tx,ty,ok:false}; redraw(); return; }
    stop();
  }

  function start(buildingId, size){
    state.tile = getTileSize();
    state.cam  = { ...window.__CAM };
    state.buildingId = buildingId;
    state.size = size || { w:1, h:1 };
    state.active = true;
    ensureLayer(); clear();
    addEventListener('pointermove', onMove, { passive:true });
    addEventListener('pointerdown', onClick, { passive:false });
    addEventListener('touchmove', onMove, { passive:true });
    addEventListener('touchend', onClick, { passive:false });
    log('an', buildingId, state.size);
  }
  function stop(){
    state.active=false; state.buildingId=null; clear();
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onClick);
    removeEventListener('touchmove', onMove);
    removeEventListener('touchend', onClick);
    log('aus');
  }

  addEventListener('cb:game:start', ()=> { state.tile=getTileSize(); state.cam={...window.__CAM}; clear(); });

  addEventListener('cb:build:select', (ev)=>{
    const d = ev?.detail||{};
    let size = { w:1, h:1 };
    try {
      const meta = window.Registry?.get?.('building', d.buildingId);
      if (meta?.size) size = { w: meta.size[0], h: meta.size[1] };
    } catch {}
    start(d.buildingId, size);
  });
  addEventListener('cb:build:cancel', ()=> stop());

  window.Placement = { start, stop };
  (window.CBLog?.ok||console.log)('✅ [place] bereit');
})();
