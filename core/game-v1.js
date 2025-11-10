/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v25.11.15-final (cam-transform + internal placement)
 * Zweck   : Rendern der Karte (Tiles) + Kamera-Transform + interne Platzierung
 *
 * Lauscht : cb:map:ready → Game.start(map,{tileset,tilesetUrl})
 *           cb:game:start (Fallback)
 *           cb:camera-change {x,y,zoom}  → Kamera in Render übernehmen
 *           cb:build:place {buildingId,x,y,w,h} → Gebäude platzieren
 *
 * API     : Game.start(map,{...})
 *           Game.placeBuilding(id, x, y, {w,h})
 *           Game.tileSize / Game.getTileSize()
 * Emits   : cb:build:placed {id,x,y,w,h}
 * ========================================================================== */

window.Game = window.Game || {};

(function(){
  'use strict';
  const TAG  = '[game]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);

  // -------------------------------- State -----------------------------------
  const state = {
    map: null,
    tileset: null,
    tilesetUrl: null,
    canvas: null,
    ctx: null,
    cols: 0,
    rows: 0,
    tileW: 64,
    tileH: 64,
    firstGid: 1,
    tsCols: 0,
    tsRows: 0,
    layers: [],
    cam: { x:0, y:0, zoom:1 },
    buildings: [],       // { id, x, y, w, h }
    running: false,
    rafId: 0,
  };

  // ---------------------------- Canvas / Resize ------------------------------
  function ensureCanvas(){
    if (state.canvas && state.ctx) return;
    const cvs = document.getElementById('game');
    if (!cvs) throw new Error('#game Canvas fehlt');
    const ctx = cvs.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;
    state.canvas = cvs;
    state.ctx = ctx;
    function resize(){
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      if (cvs.width !== w || cvs.height !== h){ cvs.width = w; cvs.height = h; }
    }
    window.addEventListener('resize', resize);
    resize();
  }

  // --------------------------- Map-Normalisierung ----------------------------
  function deriveTilesetGrid(){
    if (state.tileset && state.tileW && state.tileH){
      state.tsCols = state.tsCols || Math.max(1, Math.floor(state.tileset.width  / state.tileW));
      state.tsRows = state.tsRows || Math.max(1, Math.floor(state.tileset.height / state.tileH));
    }
    if (!state.tsCols){ state.tsCols = 1; state.tsRows = 1; }
  }

  function normalizeFromTiled(map){
    state.cols  = Number(map.width  || 0);
    state.rows  = Number(map.height || 0);
    state.tileW = Number(map.tilewidth  || 64);
    state.tileH = Number(map.tileheight || 64);
    if (Array.isArray(map.tilesets) && map.tilesets.length){
      const ts0 = map.tilesets[0];
      state.firstGid = Number(ts0.firstgid || 1);
      if (Number.isFinite(ts0.columns)) state.tsCols = Number(ts0.columns);
    }
    deriveTilesetGrid();
    state.layers = [];
    if (Array.isArray(map.layers)){
      for (const L of map.layers){
        if (L?.type === 'tilelayer' && Array.isArray(L.data)){
          state.layers.push({ name: L.name || 'layer', data: L.data.slice(0) });
        }
      }
    }
  }

  function normalizeFromSimple(map){
    if (Array.isArray(map.size) && map.size.length >= 2){
      state.tileW = Number(map.size[0]) || 64;
      state.tileH = Number(map.size[1]) || 64;
    }
    const grid2D = map.tiles;
    if (!Array.isArray(grid2D) || !Array.isArray(grid2D[0])){
      throw new Error('Simple-Map erwartet "tiles" als 2D-Array');
    }
    state.rows = grid2D.length;
    state.cols = grid2D[0].length;
    state.firstGid = 1;
    deriveTilesetGrid();
    const flat = new Array(state.cols * state.rows);
    let i = 0;
    for (let r=0; r<state.rows; r++){
      const row = grid2D[r];
      for (let c=0; c<state.cols; c++) flat[i++] = row[c]|0;
    }
    state.layers = [{ name:'layer0', data: flat }];
    INFO('Map (simple) normalisiert:', { cols:state.cols, rows:state.rows, tile:[state.tileW,state.tileH], tsCols:state.tsCols });
  }

  function normalizeMap(map){
    const looksTiled  = Array.isArray(map?.layers) && (map.tilewidth || map.tileheight);
    const looksSimple = Array.isArray(map?.tiles) && Array.isArray(map?.tiles[0]);
    if (looksTiled)      normalizeFromTiled(map);
    else if (looksSimple)normalizeFromSimple(map);
    else WARN('Unbekanntes Map-Format!');
    if (!state.cols || !state.rows){ state.cols=1; state.rows=1; state.layers=[{name:'layer0',data:[0]}]; }
    window.Game.tileSize = state.tileW;
    window.Game.getTileSize = ()=> state.tileW;
  }

  // -------------------------------- Drawing ---------------------------------
  function clear(){
    const c = state.canvas, ctx = state.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#101418';
    ctx.fillRect(0,0,c.width,c.height);
  }
  function applyCamera(){
    const { x,y,zoom } = state.cam;
    state.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }
  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img = state.tileset; if (!img) return;
    const index = Math.max(0, (gid|0) - (state.firstGid|0));
    const sxIndex = index % state.tsCols;
    const syIndex = Math.floor(index / state.tsCols);
    const sx = sxIndex * state.tileW;
    const sy = syIndex * state.tileH;
    state.ctx.drawImage(img, sx, sy, state.tileW, state.tileH, dx, dy, state.tileW, state.tileH);
  }
  function drawLayers(){
    const { cols, rows, tileW, tileH } = state;
    for (const L of state.layers){
      const data = L.data; if (!Array.isArray(data)) continue;
      let i = 0;
      for (let y=0; y<rows; y++){
        const py = y * tileH;
        for (let x=0; x<cols; x++, i++){
          const px = x * tileW;
          drawTile(data[i]|0, px, py);
        }
      }
    }
  }
  function drawBuildings(){
    const { tileW, tileH, cam } = state;
    const ctx = state.ctx;
    ctx.save();
    for (const b of state.buildings){
      const px = b.x * tileW;
      const py = b.y * tileH;
      const pw = (b.w||1) * tileW;
      const ph = (b.h||1) * tileH;
      ctx.fillStyle   = 'rgba(140,200,255,0.30)';
      ctx.fillRect(px, py, pw, ph);
      ctx.lineWidth   = 2 / Math.max(1, cam.zoom);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(px+1, py+1, pw-2, ph-2);
    }
    ctx.restore();
  }
  function frame(){
    if (!state.running) return;
    clear(); applyCamera(); drawLayers(); drawBuildings();
    state.rafId = requestAnimationFrame(frame);
  }

  // ------------------------------- Placement ---------------------------------
  function validXY(x,y){ return Number.isFinite(x) && Number.isFinite(y) && x>=0 && y>=0; }
  function placeBuildingInternal(id, x, y, size={}){
    const w = (size.w|0)||3, h = (size.h|0)||3;
    if (!validXY(x,y)) return { ok:false, reason:'invalid_xy' };
    state.buildings.push({ id, x, y, w, h });
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x, y, w, h }}));
    return { ok:true, id, x, y, w, h };
  }

  // ------------------------------- Public API --------------------------------
  Game.start = function(map, options = {}){
    ensureCanvas();
    state.tileset    = options.tileset    || state.tileset || null;
    state.tilesetUrl = options.tilesetUrl || state.tilesetUrl || null;
    if (state.tileset) INFO('Tileset bereit:', state.tilesetUrl || '(inline)');
    else WARN('Tileset fehlt – es wird ggf. nichts gezeichnet.');
    state.map = map || null;
    try { normalizeMap(state.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message || e); }
    if (!state.running){ state.running = true; state.rafId = requestAnimationFrame(frame); }
  };

  Game.placeBuilding = function(id, x, y, opt={}){
    const res = placeBuildingInternal(id, x|0, y|0, opt||{});
    if (!res.ok) WARN('placeBuilding fehlgeschlagen', res);
    return res;
  };

  // ------------------------------- Event-Bridges ------------------------------
  addEventListener('cb:map:ready', (e)=>{
    const d = e.detail || {};
    Game.start(d.map, { tileset: d.tileset, tilesetUrl: d.tilesetUrl });
  });
  addEventListener('cb:game:start', ()=>{
    ensureCanvas();
    if (!state.running){ state.running = true; state.rafId = requestAnimationFrame(frame); }
  }, { once:true });
  addEventListener('cb:camera-change', (ev)=>{
    const d = ev?.detail || {};
    if (typeof d.x==='number') state.cam.x=d.x;
    if (typeof d.y==='number') state.cam.y=d.y;
    if (typeof d.zoom==='number') state.cam.zoom=d.zoom;
  });

  // ------------------------------- Placement Bridge ---------------------------
  // Audit-Log: zeigt alle Events roh
  addEventListener('cb:build:place', (e)=>{
    const d = e.detail || {};
    console.info('[audit] cb:build:place raw', d);
  }, { capture:true });

  // Filter + Platzierung
  addEventListener('cb:build:place', (e)=>{
    const d = e.detail || {};
    const isTagged = d.__src === 'input-v25.11.14';   // nur aktuelle Quelle
    const xi = (d.x|0), yi = (d.y|0);
    const wi = (d.w|0)||3, hi = (d.h|0)||3;
    if (!isTagged){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    if (xi===0 && yi===0){ WARN('Ignoriere Platzierung 0,0 (Altlistener?)', d); return; }
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
    const overlay = document.getElementById('place-overlay');
    if (overlay) overlay.hidden = true;
  });

})();
