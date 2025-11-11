/* ============================================================================
 * Datei   : core/game-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.16-final (square+cover fit, culling-fix, focus-zoom)
 * Build   : cam-transform · DPR/resize-fix · view-culling · dual camera events
 * Zweck   : Map rendern (Tiles) + Kamera-Transform + Gebäude-Renderer (basic)
 *
 * Änderungen ggü. v25.11.14-final.2
 * - Quadratischer Canvas (Seite = min(innerWidth, innerHeight))
 * - Fit-Modus "cover": Map füllt das Quadrat (nicht winzig, kein "contain")
 * - Culling-Fix (py = y*tileH)
 * - Focus-Zoom (zoomAnker bleibt unter Finger/Zeiger), Wheel-zoom optional
 * ========================================================================== */
window.Game = window.Game || {};
(function(){
  'use strict';

  /* -------------------------------- Logging ------------------------------- */
  const TAG  = '[game]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  /* --------------------------- Anzeige-Präferenzen ------------------------ */
  // mode: 'square' erzwingt quadratischen Canvas; fit: 'cover' oder 'contain'
  const VIEW_PREF = { mode: 'square', fit: 'cover' };

  /* ------------------------------ Modul-Status ---------------------------- */
  const S = {
    // Map & Tileset
    map:null, tileset:null, tilesetUrl:null,
    cols:0, rows:0, tileW:64, tileH:64,
    firstGid:1, tsCols:1, tsRows:1,
    layers:[],

    // Canvas/Context (+ DPR)
    canvas:null, ctx:null,
    cssW:0, cssH:0, dpr:1,

    // Kamera (World-Pixel) + Zoom
    cam:{ x:0, y:0, zoom:1 },

    // Gebäude-Layer (Platzierungen) – x/y in Tiles
    buildings: [],

    // Loop
    running:false, rafId:0,

    // initialer Fit schon erfolgt?
    didInitialFit:false,
  };

  /* --------------------------- Canvas & Resize ---------------------------- */
  function ensureCanvas(){
    if (S.canvas && S.ctx) return;

    const el = document.getElementById('game');
    if (!el) throw new Error('#game Canvas fehlt');

    const ctx = el.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;

    S.canvas = el; S.ctx = ctx;
    S.dpr = (window.devicePixelRatio || 1);

    function resize(){
      // Basis: Fenstergröße (sichtbarer Bereich)
      let cssW = Math.max(1, Math.floor(window.innerWidth));
      let cssH = Math.max(1, Math.floor(window.innerHeight));

      // Quadratischer Canvas: Seite = min(w,h)
      if (VIEW_PREF.mode === 'square') {
        const side = Math.min(cssW, cssH);
        cssW = side; cssH = side;
      }

      // Physikalische Backing-Store-Größe = CSS * DPR
      const dpr = (window.devicePixelRatio || 1);
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);

      // Backing-Store & CSS-Size setzen
      if (S.canvas.width !== w || S.canvas.height !== h) {
        S.canvas.width  = w;
        S.canvas.height = h;
      }
      S.canvas.style.width  = cssW + 'px';
      S.canvas.style.height = cssH + 'px';

      S.cssW = cssW; S.cssH = cssH; S.dpr = dpr;

      // Nach dem ersten vollständigen Resize initial fitten
      if (S.map && !S.didInitialFit) {
        try { fitToMap(VIEW_PREF.fit); S.didInitialFit = true; }
        catch(e){ WARN('fitToMap@resize fail', e); }
      }
    }

    addEventListener('resize', resize);
    addEventListener('orientationchange', resize);
    resize();

    OK('Canvas init (DPR=', S.dpr, ' CSS=', S.cssW+'x'+S.cssH, ' BS=', S.canvas.width+'x'+S.canvas.height, ')');
  }

  /* --------------------------- Map-Normalisierung ------------------------- */
  function deriveTsGrid(){
    if (S.tileset && S.tileW && S.tileH){
      S.tsCols = Math.max(1, Math.floor(S.tileset.width  / S.tileW));
      S.tsRows = Math.max(1, Math.floor(S.tileset.height / S.tileH));
    }
  }

  function normalizeFromTiled(map){
    S.cols  = Number(map.width||0);
    S.rows  = Number(map.height||0);
    S.tileW = Number(map.tilewidth||64);
    S.tileH = Number(map.tileheight||64);

    if (Array.isArray(map.tilesets) && map.tilesets.length){
      const ts0 = map.tilesets[0];
      S.firstGid = Number(ts0.firstgid||1);
      if (Number.isFinite(ts0.columns)) S.tsCols = Number(ts0.columns);
    }
    deriveTsGrid();

    S.layers = [];
    if (Array.isArray(map.layers)){
      for (const L of map.layers){
        if (L?.type==='tilelayer' && Array.isArray(L.data)){
          S.layers.push({ name:L.name||'layer', data: L.data.slice(0) });
        }
      }
    }
  }

  function normalizeFromSimple(map){
    if (Array.isArray(map.size) && map.size.length>=2){
      S.tileW = Number(map.size[0])||64;
      S.tileH = Number(map.size[1])||64;
    }
    const grid = map.tiles;
    S.rows = grid.length; S.cols = grid[0].length;

    const flat = new Array(S.cols * S.rows);
    let i=0;
    for (let r=0;r<S.rows;r++){
      for (let c=0;c<S.cols;c++){
        flat[i++] = grid[r][c]|0;
      }
    }
    S.layers = [{ name:'layer0', data:flat }];
    S.firstGid = 1; S.tsCols = 1; S.tsRows = 1; deriveTsGrid();
    INFO('Map (simple) normalisiert:', { cols:S.cols, rows:S.rows, tile:[S.tileW,S.tileH], tsCols:S.tsCols });
  }

  function normalizeMap(map){
    const looksTiled  = Array.isArray(map?.layers) && (map.tilewidth||map.tileheight||map.tilesets);
    const looksSimple = Array.isArray(map?.tiles) && Array.isArray(map?.tiles[0]);
    if (looksTiled) normalizeFromTiled(map);
    else if (looksSimple) normalizeFromSimple(map);
    else {
      WARN('Unbekanntes Map-Format → 1x1-Fallback');
      S.cols=S.rows=1; S.layers=[{name:'layer0',data:[0]}];
    }

    window.Game.tileSize    = S.tileW;
    window.Game.getTileSize = ()=> S.tileW;
  }

  /* ------------------------- Kamera-Fit / Focus-Zoom ---------------------- */
  // Fit-Strategie: 'contain' (komplett sichtbar) oder 'cover' (füllt Viewport)
  function fitToMap(strategy='cover') {
    const worldW = S.cols * S.tileW;
    const worldH = S.rows * S.tileH;
    if (!worldW || !worldH) return;

    const cssW = S.cssW || window.innerWidth;
    const cssH = S.cssH || window.innerHeight;

    const zContain = Math.min(cssW/worldW, cssH/worldH) || 1;
    const zCover   = Math.max(cssW/worldW, cssH/worldH) || 1;
    const z = (strategy === 'contain') ? zContain : zCover;

    S.cam.zoom = Math.max(0.1, Math.min(3, z));

    const viewW = cssW / S.cam.zoom;
    const viewH = cssH / S.cam.zoom;

    // Zentrieren
    S.cam.x = Math.max(0, (worldW - viewW) * 0.5);
    S.cam.y = Math.max(0, (worldH - viewH) * 0.5);
  }

  // Fokus-gesperrter Zoom (cx,cy = Client-Koordinaten relativ zum Canvas-Viewport)
  function zoomAt(focusClientX, focusClientY, nextZoom) {
    const c = S.canvas; if (!c) return;
    const rect = c.getBoundingClientRect();

    const cx = focusClientX - rect.left;
    const cy = focusClientY - rect.top;

    // Weltpunkt vor dem Zoom
    const wxBefore = (cx / S.cam.zoom) + S.cam.x;
    const wyBefore = (cy / S.cam.zoom) + S.cam.y;

    // neuen Zoom setzen
    const z = Math.max(0.1, Math.min(3, nextZoom || 1));
    S.cam.zoom = z;

    // Kamera so verschieben, dass der Fokus stabil bleibt
    S.cam.x = wxBefore - (cx / z);
    S.cam.y = wyBefore - (cy / z);
  }

  /* --------------------------- Kamera/Transform --------------------------- */
  function clear(){
    const c=S.canvas, ctx=S.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#101418';
    ctx.fillRect(0,0,c.width,c.height);  // Backing-Store (DPR) füllen
  }

  function applyCamera(){
    const {x,y,zoom} = S.cam;
    S.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }

  /* -------------------------------- Zeichnen ------------------------------ */
  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img=S.tileset; if (!img) return;
    const index = (gid|0) - (S.firstGid|0);
    if (index < 0) return;

    const sx = (index % S.tsCols) * S.tileW;
    const sy = Math.floor(index / S.tsCols) * S.tileH;
    S.ctx.drawImage(img, sx,sy,S.tileW,S.tileH, dx,dy,S.tileW,S.tileH);
  }

  // Sichtfenster → Tile-Range (mit 1 Tile Puffer)
  function drawLayersCulled(){
    const { cols, rows, tileW, tileH } = S;
    if (!cols || !rows) return;

    const viewW = S.cssW / S.cam.zoom;
    const viewH = S.cssH / S.cam.zoom;
    const vx0   = S.cam.x;
    const vy0   = S.cam.y;
    const vx1   = vx0 + viewW;
    const vy1   = vy0 + viewH;

    const tx0 = Math.max(0, ((vx0 / tileW) | 0) - 1);
    const ty0 = Math.max(0, ((vy0 / tileH) | 0) - 1);
    const tx1 = Math.min(cols-1, ((vx1 / tileW) | 0) + 1);
    const ty1 = Math.min(rows-1, ((vy1 / tileH) | 0) + 1);

    for (const L of S.layers){
      const data=L.data; if(!Array.isArray(data)) continue;

      for (let y=ty0; y<=ty1; y++){
        const rowIndex = y * cols;
        const py = y * tileH;            // ★ Fix: korrektes Y!
        for (let x=tx0; x<=tx1; x++){
          const px = x * tileW;
          const gid = data[rowIndex + x] | 0;
          drawTile(gid, px, py);
        }
      }
    }
  }

  function drawBuildings(){
    const ctx=S.ctx, {tileW,tileH,cam} = S;
    ctx.save();
    for (const b of S.buildings){
      const px=b.x*tileW, py=b.y*tileH, pw=(b.w||1)*tileW, ph=(b.h||1)*tileH;
      ctx.fillStyle='rgba(140,200,255,0.30)';
      ctx.fillRect(px,py,pw,ph);
      ctx.lineWidth = 2 / Math.max(1, cam.zoom);
      ctx.strokeStyle='rgba(0,0,0,.35)';
      ctx.strokeRect(px+1,py+1,pw-2,ph-2);
    }
    ctx.restore();
  }

  function frame(){
    if (!S.running) return;
    clear();
    applyCamera();
    drawLayersCulled();
    drawBuildings();
    S.rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------- Placement ------------------------------ */
  function placeInternal(id,x,y,opt={}){
    const w=(opt.w|0)||3, h=(opt.h|0)||3;
    if (!(Number.isFinite(x)&&Number.isFinite(y) && x>=0 && y>=0)){
      return { ok:false, reason:'invalid_xy' };
    }
    S.buildings.push({ id, x:x|0, y:y|0, w, h });
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x:x|0, y:y|0, w, h } }));
    return { ok:true, id, x:x|0, y:y|0, w, h };
  }

  /* --------------------------------- API ---------------------------------- */
  Game.start = function(map, opt={}){
    try {
      ensureCanvas();

      S.tileset    = opt.tileset    || S.tileset || null;
      S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;

      if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)'); else WARN('Tileset fehlt');

      S.map = map||null;
      try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message||e); }

      // Direkt passend einzoomen & zentrieren (quadratisch + cover)
      try { fitToMap(VIEW_PREF.fit); S.didInitialFit = true; }
      catch(e){ WARN('fitToMap@start fail', e); }

      if (!S.running){
        S.running = true;
        S.rafId = requestAnimationFrame(frame);
      }
    } catch (e) {
      ERR('Game.start Fehler:', e?.message||e);
    }
  };

  Game.placeBuilding = function(id,x,y,opt){
    const r=placeInternal(id,x,y,opt||{});
    if(!r.ok) WARN('placeBuilding fail',r);
    return r;
  };

  /* ----------------------------- Bridges/Events --------------------------- */
  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map, { tileset:d.tileset, tilesetUrl:d.tilesetUrl });
  });

  addEventListener('cb:game:start', ()=>{
    try{
      ensureCanvas();
      if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
    } catch(e){
      ERR('cb:game:start Fehler:', e?.message||e);
    }
  }, { once:true });

  // beide Kameraevents akzeptieren
  function onCamera(e){
    const d=e?.detail||{};
    if (typeof d.x==='number')    S.cam.x = d.x;
    if (typeof d.y==='number')    S.cam.y = d.y;
    if (typeof d.zoom==='number') S.cam.zoom = Math.max(0.1, d.zoom||1);
  }
  addEventListener('cb:camera-change', onCamera);
  addEventListener('cb:camera:update', onCamera);

  // Fokus-Zoom via Event (z. B. aus Camera-Modul/Pinch)
  addEventListener('req:camera:zoomAt', (e)=>{
    const d=e.detail||{};
    if (typeof d.cx==='number' && typeof d.cy==='number' && typeof d.zoom==='number') {
      zoomAt(d.cx, d.cy, d.zoom);
    }
  });

  // Platzierung (nur neuer Input)
  addEventListener('cb:build:place', (e)=>{
    const d=e.detail||{};
    if (d.__src !== 'input-v25.11.14'){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    const xi=d.x|0, yi=d.y|0, wi=(d.w|0)||3, hi=(d.h|0)||3;
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
  });

  // Debug-API für Inspector
  window.Game.__dbg = {
    state: S,
    resize: ()=> { if (!S.canvas) return; window.dispatchEvent(new Event('resize')); },
    fitToMap: (mode)=> fitToMap(mode||VIEW_PREF.fit),
    zoomAt
  };

  /* -------------------------- Optional: Wheel-Zoom ------------------------ */
  // Desktop: STRG/Cmd + Mausrad = Zoom am Mausfokus.
  S.canvas?.addEventListener?.('wheel', (ev)=>{
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.1 : 1/1.1;
    zoomAt(ev.clientX, ev.clientY, S.cam.zoom * factor);
  }, { passive:false });

  OK('Modul geladen (', 'v25.11.16-final', ')');
})();
