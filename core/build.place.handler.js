/* ============================================================================
 * Datei   : core/build.place.handler.js
 * Version : v25.11.09-final-7 (canvas-offset-fix + camera-fix)
 * Zweck   : Platzierung anwenden – nutzt w/h aus Event; dedupe & 0,0-Schutz.
 *
 * Neu/Änderungen:
 *   – KORREKT: Welt → Screen jetzt mit Canvas-Offset:
 *       screen = ((world - cam) * zoom) + canvasRect.{left,top}
 *   – Reagiert auf cb:camera-change + cb:game:start; holt GameCamera einmalig
 *   – DPR-sicher; Overlay z-index > Ghost; Overlay wird nach Place verborgen
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

  // Kamera-Zustand (Weltkoordinaten)
  const cam = { x:0, y:0, zoom:1 };

  // Referenz auf dein Map-Canvas + dessen Screen-Offset
  let mapCanvas = null;
  const canvasOffset = { left:0, top:0 };

  function updateCanvasOffset(){
    try{
      if (!mapCanvas) mapCanvas = document.getElementById('game')
               || document.querySelector('canvas[data-role="map"]')
               || document.querySelector('canvas');
      if (!mapCanvas) return;
      const r = mapCanvas.getBoundingClientRect();
      canvasOffset.left = Math.round(r.left);
      canvasOffset.top  = Math.round(r.top);
    }catch{}
  }

  let layer, ctx, dpr=1;
  const placed = []; // {id, x, y, w, h, tint}

  function ensureLayer(){
    if (layer) return;
    layer = document.createElement('canvas');
    layer.id = 'placed-layer';
    Object.assign(layer.style, {
      position:'fixed', inset:'0', width:'100vw', height:'100vh',
      pointerEvents:'none', zIndex:'3101' // > .place-overlay
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
    ctx.setTransform(dpr,0,0,dpr,0,0); // DPR-Basis; Welt-Transform in redraw()
    updateCanvasOffset();               // <— Canvas-Offset frisch ermitteln
    redraw();
  }
  addEventListener('resize', onResize);
  addEventListener('scroll', ()=>{ updateCanvasOffset(); redraw(); }, {passive:true});
  addEventListener('orientationchange', ()=>{ setTimeout(onResize, 50); }, {passive:true});

  function applyCamFromGameOnce(){
    try{
      if (window.GameCamera){
        if (typeof GameCamera.x === 'number')   cam.x    = GameCamera.x;
        if (typeof GameCamera.y === 'number')   cam.y    = GameCamera.y;
        if (typeof GameCamera.zoom === 'number')cam.zoom = GameCamera.zoom;
      }
    } catch {}
  }

  addEventListener('cb:camera-change', (ev)=>{
    const d = ev?.detail || {};
    if (typeof d.x === 'number')    cam.x    = d.x;
    if (typeof d.y === 'number')    cam.y    = d.y;
    if (typeof d.zoom === 'number') cam.zoom = d.zoom;
    redraw();
  });
  addEventListener('cb:game:start',  ()=>{ applyCamFromGameOnce(); updateCanvasOffset(); redraw(); });

  function redraw(){
    if (!ctx) return;
    const t = tile();

    ctx.clearRect(0,0,layer.width,layer.height);

    // Transform-Kette:
    // 1) translate(canvasOffset) – Map-Canvas liegt nicht bei (0|0)
    // 2) scale(zoom)
    // 3) translate(-cam.x, -cam.y) – Weltursprung in Sichtfenster schieben
    ctx.save();
    ctx.translate(canvasOffset.left, canvasOffset.top);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    for (const p of placed) {
      const px = p.x * t;
      const py = p.y * t;
      const pw = (p.w||1) * t;
      const ph = (p.h||1) * t;

      ctx.fillStyle   = p.tint || 'rgba(100,160,255,0.35)';
      ctx.fillRect(px, py, pw, ph);

      ctx.lineWidth   = 2 / Math.max(1, cam.zoom);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(px+1, py+1, pw-2, ph-2);
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

  // Initial
  updateCanvasOffset();
  OK('bereit v25.11.09-final-7 (canvas-offset-fix)');
})();
