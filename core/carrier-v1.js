/* ============================================================================
 * Datei   : core/game-v1.js
 * Version : v25.11.14-final-3 (cam-transform + internal placement)
 * Zweck   : Render Map + Buildings; akzeptiert cb:build:place aus Input ODER Placement
 * ========================================================================== */
window.Game = window.Game || {};

(function(){
  'use strict';
  const TAG  = '[game]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);

  const S = {
    canvas:null, ctx:null,
    map:null, tileset:null, tilesetUrl:null,
    cols:0, rows:0, tileW:64, tileH:64,
    firstGid:1, tsCols:0, tsRows:0,
    layers:[],
    cam:{x:0,y:0,zoom:1},
    buildings:[],
    running:false, rafId:0
  };

  function ensureCanvas(){
    if (S.canvas && S.ctx) return;
    const c = document.getElementById('game');
    if (!c) throw new Error('#game fehlt');
    const ctx = c.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;
    S.canvas=c; S.ctx=ctx;
    function resize(){
      const w = Math.floor(innerWidth);
      const h = Math.floor(innerHeight);
      if (c.width!==w||c.height!==h){ c.width=w; c.height=h; }
    }
    addEventListener('resize', resize); resize();
  }

  function deriveTilesetGrid(){
    if (S.tileset && S.tileW && S.tileH) {
      S.tsCols = S.tsCols || Math.max(1, Math.floor(S.tileset.width  / S.tileW));
      S.tsRows = S.tsRows || Math.max(1, Math.floor(S.tileset.height / S.tileH));
    }
    if (!S.tsCols) { S.tsCols = 1; S.tsRows = 1; }
  }

  function normalizeFromSimple(map){
    if (Array.isArray(map.size) && map.size.length>=2){
      S.tileW = Number(map.size[0])||64; S.tileH = Number(map.size[1])||64;
    }
    const grid = map.tiles;
    S.rows = grid.length; S.cols = grid[0].length;
    const flat = new Array(S.cols*S.rows); let i=0;
    for (let r=0;r<S.rows;r++) for (let c=0;c<S.cols;c++) flat[i++]=grid[r][c]|0;
    S.layers=[{name:'layer0',data:flat}];
    deriveTilesetGrid();
    INFO('Map (simple) normalisiert:', { cols:S.cols, rows:S.rows, tile:[S.tileW,S.tileH], tsCols:S.tsCols });
  }

  function normalizeMap(map){
    // dein Projekt nutzt „simple“
    normalizeFromSimple(map);
    window.Game.tileSize = S.tileW;
    window.Game.getTileSize = ()=>S.tileW;
  }

  function clear(){ const c=S.canvas, ctx=S.ctx; ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#101418'; ctx.fillRect(0,0,c.width,c.height); }
  function applyCamera(){ const {x,y,zoom}=S.cam; S.ctx.setTransform(zoom,0,0,zoom,-x*zoom,-y*zoom); }

  function drawTile(gid,dx,dy){
    if (!gid||!S.tileset) return;
    const index = Math.max(0,(gid|0)-(S.firstGid|0));
    const sxIndex = index % S.tsCols;
    const syIndex = Math.floor(index / S.tsCols);
    const sx = sxIndex * S.tileW, sy = syIndex * S.tileH;
    S.ctx.drawImage(S.tileset,sx,sy,S.tileW,S.tileH,dx,dy,S.tileW,S.tileH);
  }

  function drawLayers(){
    const {cols,rows,tileW,tileH}=S;
    for (const L of S.layers){
      const data=L.data; if (!Array.isArray(data)) continue;
      let i=0;
      for (let y=0;y<rows;y++){
        const py=y*tileH;
        for (let x=0;x<cols;x++,i++){
          const px=x*tileW;
          drawTile(data[i]|0, px, py);
        }
      }
    }
  }

  function drawBuildings(){
    const ctx=S.ctx, z=Math.max(1,S.cam.zoom);
    for (const b of S.buildings){
      const px=b.x*S.tileW, py=b.y*S.tileH, pw=(b.w||1)*S.tileW, ph=(b.h||1)*S.tileH;
      ctx.save();
      ctx.fillStyle='rgba(140,200,255,0.30)'; ctx.fillRect(px,py,pw,ph);
      ctx.lineWidth=2/z; ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.strokeRect(px+1,py+1,pw-2,ph-2);
      ctx.restore();
    }
  }

  function frame(){
    if (!S.running) return;
    clear(); applyCamera(); drawLayers(); drawBuildings();
    S.rafId=requestAnimationFrame(frame);
  }

  function placeInternal(id,x,y,opt={}){
    const w = (opt.w|0) || 3, h = (opt.h|0) || 3;
    if (!(Number.isFinite(x)&&Number.isFinite(y))) return {ok:false,reason:'invalid_xy'};
    S.buildings.push({id, x:x|0, y:y|0, w, h});
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x:x|0, y:y|0, w, h } }));
    return {ok:true, id, x:x|0, y:y|0, w, h};
  }

  // ------------------------------- Public API --------------------------------
  Game.start = function(map, opt={}){
    ensureCanvas();
    S.tileset    = opt.tileset    || S.tileset || null;
    S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;
    if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)');
    else WARN('Tileset fehlt – Zeichnung nur Platzhalter.');

    S.map = map||null;
    try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen', e?.message||e); }

    if (!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
  };

  Game.placeBuilding = function(id,x,y,opt={}){ const r=placeInternal(id,x,y,opt); if(!r.ok) WARN('placeBuilding failed',r); return r; };

  // Bridges
  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map,{tileset:d.tileset,tilesetUrl:d.tilesetUrl});
  });

  addEventListener('cb:game:start', ()=>{
    ensureCanvas(); if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
  }, { once:true });

  addEventListener('cb:camera-change', (ev)=>{
    const d=ev?.detail||{};
    if (typeof d.x==='number') S.cam.x=d.x;
    if (typeof d.y==='number') S.cam.y=d.y;
    if (typeof d.zoom==='number') S.cam.zoom=d.zoom;
  });

  // --------- EINZIGER Listener: akzeptiert neue & alte Events ----------------
  addEventListener('cb:build:place', (e)=>{
    const d = e.detail || {};
    // Neu: getaggt aus input/placement
    const isTagged = typeof d.__src === 'string';
    // Legacy: aus altem placement – erkennt man an „ok“ oder fehlendem Tag
    const looksLegacy = !isTagged && (('ok' in d) || ('reason' in d) || typeof d.buildingId === 'string');

    if (!isTagged && !looksLegacy){
      WARN('Ignoriere unbekanntes Platzier-Event', d);
      return;
    }

    // Quelle angleichen
    const id = d.buildingId || d.kind || d.id;
    const x  = d.x|0, y=d.y|0;
    const w  = (d.w|0) || 3;
    const h  = (d.h|0) || 3;

    const res = placeInternal(id, x, y, { w, h });
    INFO('Platzierung übernommen', { from: d.__src||'legacy', ...res });

    // Overlay sicher verbergen (falls vorhanden)
    const ov = document.getElementById('place-overlay'); if (ov) ov.hidden = true;
  });

})();
