/* ============================================================================
 * Datei   : core/build.place.handler.js
 * Version : v25.11.13-final-1
 * Zweck   : Echte Platzierung verarbeiten (Game-API, sonst Fallback-Layer).
 * Lauscht : cb:build:place { buildingId, x, y, ok }
 * Abh.    : cb:camera:change, cb:game:start (für Kamerafollow)
 * ========================================================================== */
(function () {
  'use strict';

  const OK   = (m,...a)=>(window.CBLog?.ok   || console.log )('✅ [place-apply]', m, ...a);
  const LOG  = (m,...a)=>(window.CBLog?.info || console.info)('[place-apply]', m, ...a);
  const WARN = (m,...a)=>(window.CBLog?.warn || console.warn)('[place-apply] ⚠️', m, ...a);
  const ERR  = (m,...a)=>(window.CBLog?.err  || console.error)('[place-apply] ❌', m, ...a);

  const tile = ()=> (window.Game?.getTileSize?.() || 64);

  // -------------------------- Placed-Layer (Fallback) -----------------------
  let layer, ctx, dpr=1;
  let cam = window.__CAM || { x:0, y:0, scale:1 };
  const placed = []; // {id, x, y, w, h, tint}

  function ensureLayer(){
    if (layer) return;
    layer = document.createElement('canvas');
    layer.id = 'placed-layer';
    Object.assign(layer.style, {
      position:'fixed', inset:'0', width:'100vw', height:'100vh',
      pointerEvents:'none', zIndex:'2147483635'
    });
    document.body.appendChild(layer);
    ctx = layer.getContext('2d');
    onResize();
  }
  function onResize(){
    if (!layer) return;
    dpr = Math.max(1, window.devicePixelRatio||1);
    layer.width  = Math.floor(innerWidth*dpr);
    layer.height = Math.floor(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redraw();
  }
  addEventListener('resize', onResize);

  function setCam(c){ cam = { ...c }; redraw(); }
  addEventListener('cb:camera:change', ()=> setCam(window.__CAM||{x:0,y:0,scale:1}));
  addEventListener('cb:game:start',   ()=> setCam(window.__CAM||{x:0,y:0,scale:1}));

  function redraw(){
    if (!ctx) return;
    ctx.clearRect(0,0,layer.width,layer.height);
    const t = tile();
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.scale, cam.scale);

    for (const p of placed) {
      ctx.fillStyle = p.tint || 'rgba(100,160,255,0.35)';
      ctx.fillRect(p.x*t, p.y*t, (p.w||1)*t, (p.h||1)*t);
      // Einfache Kontur
      ctx.lineWidth = 2/Math.max(1,cam.scale);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(p.x*t+1, p.y*t+1, (p.w||1)*t-2, (p.h||1)*t-2);
    }
    ctx.restore();
  }

  function flash(x,y,w,h, ok){
    ensureLayer();
    const t = tile(), {x:cx,y:cy,scale:s}=cam;
    const col = ok ? 'rgba(40,200,120,0.45)' : 'rgba(220,70,70,0.45)';
    const lw  = 3/Math.max(1,s);
    // Overlay direkt ohne Cam-Matrix zeichnen → wir transformieren manuell:
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.fillRect(x*t, y*t, (w||1)*t, (h||1)*t);
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.strokeRect(x*t, y*t, (w||1)*t, (h||1)*t);
    ctx.restore();
    setTimeout(()=> redraw(), 180);
  }

  // ------------------------------- Handler ----------------------------------
  function handlePlace(detail){
    const { buildingId, x, y, ok } = detail||{};
    if (ok === false) { flash(x,y, sizeOf(buildingId).w, sizeOf(buildingId).h, false); return; }

    // 1) Bevorzugt Game-API
    try {
      if (window.Game?.placeBuilding) {
        const res = window.Game.placeBuilding(buildingId, x, y);
        LOG('Game.placeBuilding →', res);
        return;
      }
    } catch (e) {
      ERR('Game.placeBuilding Exception', e);
    }

    // 2) Fallback: „echte“ sichtbare Platzierung auf eigenem Layer
    const s = sizeOf(buildingId);
    placed.push({ id: buildingId, x, y, w: s.w, h: s.h, tint: 'rgba(140,200,255,0.30)' });
    ensureLayer(); redraw();
    LOG('fallback placed', buildingId, {x,y,w:s.w,h:s.h});
  }

  function sizeOf(buildingId){
    // Größe aus Registry, sonst 2x2 für HQ / 1x1 default
    try {
      const meta = window.Registry?.get?.('building', buildingId);
      if (meta?.size) return { w: (+meta.size[0]||1), h: (+meta.size[1]||1) };
    } catch {}
    if (buildingId === 'b.hq') return { w: 2, h: 2 };
    return { w: 1, h: 1 };
  }

  // Listener
  addEventListener('cb:build:place', (e)=> handlePlace(e.detail||{}));

  OK('bereit v25.11.13-final-1');
})();
