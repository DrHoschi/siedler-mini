/* ============================================================================
 * Datei   : core/build.place.handler.js
 * Version : v25.11.09-final-5+overlay-safe
 * Zweck   : Platzierung anwenden – nutzt w/h aus Event; dedupe & 0,0-Schutz.
 *
 * Fixes/Neu:
 *   – Fallback-Layer liegt sicher über dem Ghost (z-index > Overlay)
 *   – Safety: versteckt Overlay, falls es nach Place noch sichtbar wäre
 * ========================================================================== */
(function () {
  'use strict';

  const OK   = (m,...a)=>(window.CBLog?.ok   || console.log )('✅ [place-apply]', m, ...a);
  const LOG  = (m,...a)=>(window.CBLog?.info || console.info)('[place-apply]', m, ...a);
  const WARN = (m,...a)=>(window.CBLog?.warn || console.warn)('[place-apply] ⚠️', m, ...a);

  const tile = ()=> (window.Game?.getTileSize?.() || window.Game?.tileSize || 64);

  // Dedupe (gegen Doppel-Listener) + 0,0-Bremse
  let last = { t:0, id:null, x:null, y:null };
  function isDup(d){
    const now = performance.now();
    const dup = (d?.buildingId===last.id && d?.x===last.x && d?.y===last.y && (now-last.t)<200);
    if (!dup) last = { t:now, id:d?.buildingId, x:d?.x, y:d?.y };
    return dup;
  }

  let layer, ctx, dpr=1;
  let cam = window.__CAM || { x:0, y:0, scale:1 };
  const placed = []; // {id, x, y, w, h, tint}

  function ensureLayer(){
    if (layer) return;
    layer = document.createElement('canvas');
    layer.id = 'placed-layer';
    Object.assign(layer.style, {
      position:'fixed', inset:'0',
      width:'100vw', height:'100vh',
      pointerEvents:'none',
      zIndex:'3101' // > .place-overlay (typisch 3000); sichtbar über Ghost
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
  addEventListener('cb:camera-change', ()=> setCam(window.__CAM||{x:0,y:0,scale:1}));
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
      ctx.lineWidth = 2/Math.max(1,cam.scale);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(p.x*t+1, p.y*t+1, (p.w||1)*t-2, (p.h||1)*t-2);
    }
    ctx.restore();
  }

  function sizeFromRegistry(id){
    try {
      const meta = window.Registry?.get?.('building', id);
      if (meta?.size) return { w: (+meta.size[0]||1), h: (+meta.size[1]||1) };
      if (meta?.w || meta?.h) return { w:(+meta.w||1), h:(+meta.h||1) };
    } catch {}
    return { w:3, h:3 }; // Default 3×3
  }

  function handlePlace(detail){
    const id = detail?.buildingId || detail?.kind;
    const x  = detail?.x|0, y = detail?.y|0;

    // 0,0-Schutz (typisch für Altlistener); nur verwerfen, wenn Overlay aktiv ist
    if (x===0 && y===0 && document.getElementById('place-overlay')) {
      WARN('Ignoriere Platzierung 0,0 (Altlistener?)');
      return;
    }

    // Priorität: Event w/h → Registry → 3x3
    let w = (detail?.w|0) || 0;
    let h = (detail?.h|0) || 0;
    if (w <= 0 || h <= 0){
      const r = sizeFromRegistry(id);
      w = r.w; h = r.h;
    }

    // Dedupe
    if (isDup({ buildingId:id, x, y })) return;

    // 1) Versuche echte Game-API
    try {
      if (typeof window.Game?.placeBuilding === 'function') {
        const res = window.Game.placeBuilding(id, x, y, { w, h });
        LOG('Game.placeBuilding →', res);
        // Safety: Overlay sicher verbergen
        const ov = document.getElementById('place-overlay'); if (ov) ov.hidden = true;
        return;
      }
    } catch (e) { WARN('Game.placeBuilding Exception', e?.message||e); }

    // 2) Fallback: sichtbare Markierung (mit korrekter Größe)
    ensureLayer();
    placed.push({ id, x, y, w, h, tint:'rgba(140,200,255,0.30)' });
    redraw();
    LOG('fallback placed', id, {x,y,w,h});

    // Safety: Overlay sicher verbergen
    const ov = document.getElementById('place-overlay'); if (ov) ov.hidden = true;
  }

  addEventListener('cb:build:place', (e)=> handlePlace(e.detail||{}));

  OK('bereit v25.11.09-final-5+overlay-safe');
})();
