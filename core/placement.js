/* ============================================================================
 * Datei   : core/placement.js
 * Projekt : Neue Siedler
 * Version : v25.11.13
 * Zweck   : Platziermodus (Ghost-Preview, Snap-to-Grid, Kollision, Place-Event)
 * Ereign. : listen → cb:game:start, cb:build:select, cb:build:cancel
 *           emit   → cb:build:place { buildingId,x,y,ok,reason? }
 * Hinweise: - Zeichnet auf eigenes Overlay-Canvas (#place-layer) über #game
 *           - Kollision: nutzt Game.getObstacleAt(tx,ty) falls vorhanden
 *           - Tilegröße: aus Game.getTileSize() oder Fallback 64
 *           - Kamera: liest globale transform aus window.__CAM (siehe camera.glue)
 * ========================================================================== */
(function () {
  const log = (m,...a)=> (window.CBLog?.info||console.info)('[place]', m, ...a);

  // ----------------------------- State -------------------------------------
  const state = {
    active: false,
    buildingId: null,
    tile: 64,
    // Kamera (wird von camera.glue gepflegt), Fallback (0,0,1)
    cam: { x: 0, y: 0, scale: 1 },
    // Ghost-Farbe
    okFill: 'rgba(80,200,120,0.25)',
    badFill: 'rgba(220,80,80,0.25)',
    size: { w: 1, h: 1 }, // BxH in Tiles (optional aus Registry lesen)
  };

  // --------------------------- DOM / Canvas --------------------------------
  let cvs, ctx, host;
  function ensureLayer() {
    if (cvs && ctx) return;
    host = document.body;
    cvs = document.getElementById('place-layer');
    if (!cvs) {
      cvs = document.createElement('canvas');
      cvs.id = 'place-layer';
      cvs.style.position = 'fixed';
      cvs.style.left = '0';
      cvs.style.top = '0';
      cvs.style.width = '100vw';
      cvs.style.height = '100vh';
      cvs.style.pointerEvents = 'none'; // nur Ghost, keine Klicks
      cvs.style.zIndex = '2147483642';  // knapp unter Inspector
      host.appendChild(cvs);
    }
    ctx = cvs.getContext('2d');
    resize();
  }
  function resize() {
    if (!cvs) return;
    const dpr = Math.max(1, devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight;
    cvs.width = Math.floor(w * dpr);
    cvs.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize', resize);

  // --------------------------- Kamera-Hook ---------------------------------
  // camera.glue setzt window.__CAM und feuert cb:camera:change
  window.__CAM = window.__CAM || { x:0, y:0, scale:1 };
  addEventListener('cb:camera:change', () => {
    state.cam = { ...window.__CAM };
    if (state.active) draw(lastHover.tx, lastHover.ty, lastHover.ok);
  });

  // ------------------------- Utility / Hit-Tests ---------------------------
  function getTileSize() {
    try { return (window.Game?.getTileSize?.() || 64)|0; } catch { return 64; }
  }
  function worldToTile(wx, wy) {
    const t = state.tile;
    return { tx: Math.floor(wx / t), ty: Math.floor(wy / t) };
  }
  function screenToWorld(sx, sy) {
    const { x, y, scale } = state.cam;
    return { wx: (sx - x) / scale, wy: (sy - y) / scale };
  }
  function canPlaceAt(tx, ty) {
    // 1-Tile-Puffer ist Sache von Game.getObstacleAt – wir fragen je Zelle
    const gw = state.size.w|0, gh = state.size.h|0;
    for (let yy=0; yy<gh; yy++) {
      for (let xx=0; xx<gw; xx++) {
        const blocked = !!(window.Game?.getObstacleAt?.(tx+xx, ty+yy));
        if (blocked) return { ok:false, reason:'blocked' };
      }
    }
    return { ok:true };
  }

  // ------------------------ Ghost / Zeichnen --------------------------------
  let lastHover = { tx: 0, ty: 0, ok: false };
  function clear() {
    if (!ctx) return;
    ctx.clearRect(0,0,cvs.width,cvs.height);
  }
  function draw(tx, ty, ok) {
    ensureLayer();
    clear();
    const t = state.tile;
    const { x, y, scale } = state.cam;
    // Leinwand in Screen-Koords → in gleiche Kamera-Transform wie #game
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = ok ? state.okFill : state.badFill;
    const gw = state.size.w|0, gh = state.size.h|0;
    ctx.fillRect(tx * t, ty * t, gw * t, gh * t);
    ctx.restore();
  }

  // -------------------- Pointer-Move / -Click Handling ---------------------
  function onMove(e) {
    if (!state.active) return;
    const p = e.touches ? e.touches[0] : e;
    const rect = { left: 0, top: 0 };
    const sx = p.clientX - rect.left;
    const sy = p.clientY - rect.top;
    const { wx, wy } = screenToWorld(sx, sy);
    const { tx, ty } = worldToTile(wx, wy);
    const chk = canPlaceAt(tx, ty);
    lastHover = { tx, ty, ok: chk.ok };
    draw(tx, ty, chk.ok);
  }
  function onClick(e) {
    if (!state.active) return;
    e.preventDefault();
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const sx = p.clientX, sy = p.clientY;
    const { wx, wy } = screenToWorld(sx, sy);
    const { tx, ty } = worldToTile(wx, wy);
    const chk = canPlaceAt(tx, ty);
    emit('cb:build:place', { buildingId: state.buildingId, x: tx, y: ty, ok: chk.ok, reason: chk.reason });
    if (chk.ok) stop();
    else draw(tx, ty, false);
  }

  function start(buildingId, size) {
    state.tile = getTileSize();
    state.buildingId = buildingId;
    state.size = size || { w: 1, h: 1 };
    state.active = true;
    ensureLayer();
    cvs.style.pointerEvents = 'none';
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onClick, { passive: false });
    addEventListener('touchmove', onMove, { passive: true });
    addEventListener('touchend', onClick, { passive: false });
    log('Platziermodus an:', buildingId, state.size);
  }
  function stop() {
    state.active = false;
    state.buildingId = null;
    clear();
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onClick);
    removeEventListener('touchmove', onMove);
    removeEventListener('touchend', onClick);
    log('Platziermodus aus');
  }

  // --------------------------- Event-Verdrahtung ---------------------------
  addEventListener('cb:game:start', ()=> {
    state.tile = getTileSize();
    state.cam = { ...window.__CAM };
    clear();
  }, { once:false });

  addEventListener('cb:build:select', (ev)=>{
    const d = ev?.detail || {};
    // Größe aus Registry holen, falls vorhanden
    let size = { w: 1, h: 1 };
    try {
      const meta = window.Registry?.get?.('building', d.buildingId);
      if (meta?.size) size = { w: meta.size[0], h: meta.size[1] };
    } catch {}
    start(d.buildingId, size);
  });

  addEventListener('cb:build:cancel', ()=> stop());

  // Exporte (optional)
  window.Placement = { start, stop };

  // kleines OK-Log
  (window.CBLog?.ok||console.log)('✅ [place] bereit');
})();
