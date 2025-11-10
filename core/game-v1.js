/* ============================================================================
 * Datei   : core/game-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final.2
 * Build   : cam-transform + DPR/resize-fix + view-culling + dual camera events
 * Zweck   : Map rendern (Tiles) + Kamera-Transform + Gebäude-Renderer (basic)
 *
 * Lauscht : cb:map:ready {map,tileset,tilesetUrl}
 *           cb:game:start
 *           cb:camera-change {x,y,zoom}     ← Camera-Modul A
 *           cb:camera:update {x,y,zoom}     ← Camera-Modul B (Input nutzt das)
 *           cb:build:place {__src,buildingId,x,y,w,h}
 *
 * API     : Game.start(map,{tileset,tilesetUrl})
 *           Game.placeBuilding(id, x, y, {w,h})
 *
 * Emits   : cb:build:placed {id,x,y,w,h}
 *
 * WICHTIG
 * - Diese Version behebt „Zoom/Pan zeigt nur Teilbereiche“ durch:
 *   1) **DevicePixelRatio-Canvas** (physikalische Auflösung = CSS * DPR)
 *   2) **dauerhaftes Re-Layout** bei resize/orientationchange
 *   3) **View-Culling**: nur sichtbare Tiles zeichnen (Performance & Vollständigkeit)
 *   4) **Dual-Event-Support** für Kamera (cb:camera-change & cb:camera:update)
 * - Tile- und Kamera-Koordinaten sind **Pixel-basiert** (World-Space in px).
 *   Wenn euer Kamera-Modul Tile-Koordinaten liefert, bitte dort → px umrechnen.
 * ========================================================================== */
window.Game = window.Game || {};
(function(){
  'use strict';

  /* ------------------------------- Logging -------------------------------- */
  const TAG  = '[game]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  /* ---------------------------- Modul-Status ------------------------------ */
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

    // Gebäude-Layer (Platzierungen)
    buildings: [],    // {id,x,y,w,h} – x/y in Tiles

    // Loop
    running:false, rafId:0,
  };

  /* -------------------------- Canvas & Resize ----------------------------- */
  function ensureCanvas(){
    if (S.canvas && S.ctx) return;

    const el = document.getElementById('game');
    if (!el) throw new Error('#game Canvas fehlt');

    const ctx = el.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;

    S.canvas = el; S.ctx = ctx;
    S.dpr = (window.devicePixelRatio || 1);

    function resize(){
      // CSS-Größe in logischen Pixeln
      const cssW = Math.max(1, Math.floor(window.innerWidth));
      const cssH = Math.max(1, Math.floor(window.innerHeight));

      // Physikalische Backing-Store-Größe = CSS * DPR (gegen unscharfes/teilweises Rendering)
      const dpr = (window.devicePixelRatio || 1);
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);

      // Canvas-Backing anpassen, CSS-Size setzen
      if (S.canvas.width !== w || S.canvas.height !== h) {
        S.canvas.width  = w;
        S.canvas.height = h;
      }
      // Wichtig: CSS-Size explizit setzen (verhindert Browser-Autoscaling)
      S.canvas.style.width  = cssW + 'px';
      S.canvas.style.height = cssH + 'px';

      S.cssW = cssW; S.cssH = cssH; S.dpr = dpr;

      // Nach Resize sicherstellen, dass nächste Frames vollständig zeichnen
      // (transform wird je Frame gesetzt; hier kein persistentes setTransform nötig)
    }

    addEventListener('resize', resize);
    addEventListener('orientationchange', resize);
    resize();

    OK('Canvas init (DPR=', S.dpr, 'size=', S.canvas.width+'x'+S.canvas.height, ')');
  }

  /* ------------------------ Map-Normalisierung ---------------------------- */
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

    // Export TileSize an globale API (für andere Module)
    window.Game.tileSize    = S.tileW;
    window.Game.getTileSize = ()=> S.tileW;
  }

  /* ---------------------------- Kamera/Transform -------------------------- */
  function clear(){
    const c=S.canvas, ctx=S.ctx;
    ctx.setTransform(1,0,0,1,0,0);              // Reset (wichtig fürs Clear bei DPR)
    // Füllt die *physikalische* Backing-Store-Größe – deshalb kein CSS-Maß hier!
    ctx.fillStyle='#101418';
    ctx.fillRect(0,0,c.width,c.height);
  }

  function applyCamera(){
    // Wir zeichnen in World-Pixeln. Transform rechnet Canvas→World:
    // scale = zoom * DPR-Ausgleich? NEIN: Wir zeichnen im Backing-Store (DPR-Skaliert),
    // daher bleibt Transform rein „Weltzoom“. DPR ist bereits in Canvasgröße eingerechnet.
    const {x,y,zoom} = S.cam;
    S.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }

  /* ------------------------------ Zeichnen -------------------------------- */
  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img=S.tileset; if (!img) return;
    const index = (gid|0) - (S.firstGid|0);
    if (index < 0) return;

    const sx = (index % S.tsCols) * S.tileW;
    const sy = Math.floor(index / S.tsCols) * S.tileH;

    // Zielposition dx/dy sind World-Pixel (ohne Transform schon richtig)
    S.ctx.drawImage(img, sx,sy,S.tileW,S.tileH, dx,dy,S.tileW,S.tileH);
  }

  /**
   * Sichtfenster ermitteln (World-Pixel → Tile-Range)
   * Zeichnet nur die sichtbaren Tiles (inkl. 1-Tile Puffer gegen Ränder).
   */
  function drawLayersCulled(){
    const { cols, rows, tileW, tileH } = S;
    if (!cols || !rows) return;

    // Sichtfenster im World-Space (in px)
    const viewW = S.cssW / S.cam.zoom;
    const viewH = S.cssH / S.cam.zoom;
    const vx0   = S.cam.x;
    const vy0   = S.cam.y;
    const vx1   = vx0 + viewW;
    const vy1   = vy0 + viewH;

    // In Tiles umrechnen + 1 Tile Puffer
    const tx0 = Math.max(0, ((vx0 / tileW) | 0) - 1);
    const ty0 = Math.max(0, ((vy0 / tileH) | 0) - 1);
    const tx1 = Math.min(cols-1, ((vx1 / tileW) | 0) + 1);
    const ty1 = Math.min(rows-1, ((vy1 / tileH) | 0) + 1);

    for (const L of S.layers){
      const data=L.data; if(!Array.isArray(data)) continue;

      for (let y=ty0; y<=ty1; y++){
        const rowIndex = y * cols;
        const py = y * tileW; // tileH, aber W/H sind gleich groß im Top-Down-Tileset
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
      ctx.fillStyle='rgba(140,200,255,0.30)'; // einfache Platzhalter-Visualisierung
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
    drawLayersCulled();     // ← nur sichtbare Tiles zeichnen (vollständig + schnell)
    drawBuildings();

    S.rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------ Placement ------------------------------- */
  function placeInternal(id,x,y,opt={}){
    const w=(opt.w|0)||3, h=(opt.h|0)||3;
    if (!(Number.isFinite(x)&&Number.isFinite(y) && x>=0 && y>=0)){
      return { ok:false, reason:'invalid_xy' };
    }
    S.buildings.push({ id, x:x|0, y:y|0, w, h });
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x:x|0, y:y|0, w, h } }));
    return { ok:true, id, x:x|0, y:y|0, w, h };
  }

  /* ------------------------------ Public API ------------------------------ */
  Game.start = function(map, opt={}){
    try {
      ensureCanvas();

      S.tileset    = opt.tileset    || S.tileset || null;
      S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;

      if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)'); else WARN('Tileset fehlt');

      S.map = map||null;
      try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message||e); }

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

  /* ------------------------------ Bridges/Events -------------------------- */
  // Map-Bridge
  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map, { tileset:d.tileset, tilesetUrl:d.tilesetUrl });
  });

  // Boot: Renderloop sicher starten
  addEventListener('cb:game:start', ()=>{
    try{
      ensureCanvas();
      if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
    } catch(e){
      ERR('cb:game:start Fehler:', e?.message||e);
    }
  }, { once:true });

  // Kamera-Updates – **beide** Varianten unterstützen (Kompatibilität der Module)
  function onCamera(e){
    const d=e?.detail||{};
    if (typeof d.x==='number')    S.cam.x = d.x;
    if (typeof d.y==='number')    S.cam.y = d.y;
    if (typeof d.zoom==='number') S.cam.zoom = Math.max(0.1, d.zoom||1);
    // Kein sofortiges Redraw nötig → läuft im RAF.
  }
  addEventListener('cb:camera-change', onCamera);
  addEventListener('cb:camera:update', onCamera); // für Input/ältere Module

  // Platzierungs-Ereignis (nur von neuem Input annehmen)
  addEventListener('cb:build:place', (e)=>{
    const d=e.detail||{};
    if (d.__src !== 'input-v25.11.14'){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    const xi=d.x|0, yi=d.y|0, wi=(d.w|0)||3, hi=(d.h|0)||3;
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
  });

  // (Optional) Public Helper für externe Diagnose
  window.Game.__dbg = {
    state: S,
    resize: ()=> {
      // erzwinge sofortiges Canvas-Re-Layout (z. B. im Inspector)
      if (!S.canvas) return;
      const evt = new Event('resize');
      window.dispatchEvent(evt);
    }
  };

  OK('Modul geladen (', 'v25.11.14-final.2', ')');
})();
