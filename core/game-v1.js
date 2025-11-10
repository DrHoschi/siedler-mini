/* ============================================================================
 * Datei   : core/game-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-final (cam-transform + accepts tagged placements)
 * Zweck   : Map rendern (Tiles) + Kamera-Transform + Gebäude-Renderer (basic)
 *
 * Lauscht : cb:map:ready {map,tileset,tilesetUrl}
 *           cb:game:start
 *           cb:camera-change {x,y,zoom}
 *           cb:build:place {__src,buildingId,x,y,w,h}  ← von core.input.js
 * API     : Game.start(map,{tileset,tilesetUrl})
 *           Game.placeBuilding(id, x, y, {w,h})
 * Emits   : cb:build:placed {id,x,y,w,h}
 * ========================================================================== */
window.Game = window.Game || {};
(function(){
  'use strict';
  const TAG  = '[game]';
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const S = {
    map:null, tileset:null, tilesetUrl:null,
    canvas:null, ctx:null,
    cols:0, rows:0, tileW:64, tileH:64,
    firstGid:1, tsCols:1, tsRows:1,
    layers:[],
    cam:{ x:0, y:0, zoom:1 },
    buildings: [],    // {id,x,y,w,h}
    running:false, rafId:0,
  };

  // -------------------- Canvas/Resize --------------------
  function ensureCanvas(){
    if (S.canvas && S.ctx) return;
    const el = document.getElementById('game');
    if (!el) throw new Error('#game Canvas fehlt');
    const ctx = el.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;
    S.canvas = el; S.ctx = ctx;
    function resize(){
      const w = Math.floor(innerWidth), h = Math.floor(innerHeight);
      if (el.width !== w || el.height !== h){ el.width = w; el.height = h; }
    }
    addEventListener('resize', resize); resize();
  }

  // -------------------- Map-Normalisierung --------------------
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
    let i=0; for (let r=0;r<S.rows;r++){ for (let c=0;c<S.cols;c++){ flat[i++] = grid[r][c]|0; } }
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
      WARN('Unbekanntes Map-Format → 1x1-Fallback'); S.cols=S.rows=1; S.layers=[{name:'layer0',data:[0]}];
    }
    window.Game.tileSize = S.tileW;
    window.Game.getTileSize = ()=> S.tileW;
  }

  // -------------------- Drawing --------------------
  function clear(){
    const c=S.canvas, ctx=S.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#101418'; ctx.fillRect(0,0,c.width,c.height);
  }
  function applyCamera(){
    const {x,y,zoom} = S.cam;
    S.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }
  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img=S.tileset; if (!img) return;
    const index = (gid|0) - (S.firstGid|0);
    const sx = (index % S.tsCols) * S.tileW;
    const sy = Math.floor(index / S.tsCols) * S.tileH;
    S.ctx.drawImage(img, sx,sy,S.tileW,S.tileH, dx,dy,S.tileW,S.tileH);
  }
  function drawLayers(){
    const { cols, rows, tileW, tileH } = S;
    for (const L of S.layers){
      const data=L.data; if(!Array.isArray(data)) continue;
      let i=0;
      for (let y=0;y<rows;y++){
        const py = y*tileH;
        for (let x=0;x<cols;x++,i++){
          const px = x*tileW;
          drawTile(data[i]|0, px, py);
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
    clear(); applyCamera(); drawLayers(); drawBuildings();
    S.rafId = requestAnimationFrame(frame);
  }

  // -------------------- Placement --------------------
  function placeInternal(id,x,y,opt={}){
    const w=(opt.w|0)||3, h=(opt.h|0)||3;
    if (!(Number.isFinite(x)&&Number.isFinite(y) && x>=0 && y>=0)){
      return { ok:false, reason:'invalid_xy' };
    }
    S.buildings.push({ id, x:x|0, y:y|0, w, h });
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x:x|0, y:y|0, w, h } }));
    return { ok:true, id, x:x|0, y:y|0, w, h };
  }

  // -------------------- Public API --------------------
  Game.start = function(map, opt={}){
    ensureCanvas();
    S.tileset    = opt.tileset    || S.tileset || null;
    S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;
    if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)'); else WARN('Tileset fehlt');
    S.map = map||null;
    try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message||e); }
    if (!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
  };
  Game.placeBuilding = function(id,x,y,opt){ const r=placeInternal(id,x,y,opt||{}); if(!r.ok) WARN('placeBuilding fail',r); return r; };

  // -------------------- Bridges/Events --------------------
  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map, { tileset:d.tileset, tilesetUrl:d.tilesetUrl });
  });
  addEventListener('cb:game:start', ()=>{
    try{ ensureCanvas(); if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); } } catch{}
  }, { once:true });

  // Kamera-Updates
  addEventListener('cb:camera-change', (ev)=>{
    const d=ev?.detail||{};
    if (typeof d.x==='number')    S.cam.x=d.x;
    if (typeof d.y==='number')    S.cam.y=d.y;
    if (typeof d.zoom==='number') S.cam.zoom=d.zoom;
  });

  // Platzierungs-Ereignis (nur von neuem Input annehmen)
  addEventListener('cb:build:place', (e)=>{
    const d=e.detail||{};
    if (d.__src !== 'input-v25.11.14'){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    const xi=d.x|0, yi=d.y|0, wi=(d.w|0)||3, hi=(d.h|0)||3;
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
  });
})();
