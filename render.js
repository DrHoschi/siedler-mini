// Siedler‑Mini V15 render.js
// Kameramatrix, Welt/Screencoords, Zeichnen von Tiles, Straßen, Gebäuden

import { TILE, Tex } from './textures.js?v=1500';

export const render = (()=>{

  const state = {
    canvas:null, ctx:null, DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5
  };

  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resize();
  }

  function resize(){
    const rect = state.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width  * state.DPR));
    const h = Math.max(1, Math.floor(rect.height * state.DPR));
    if (w!==state.canvas.width || h!==state.canvas.height){
      state.canvas.width  = w;
      state.canvas.height = h;
    }
    state.width = w; state.height = h;
  }

  // ---- Koordinaten
  function toWorld(clientX, clientY){
    // client → CSS px; auf DPR bringen:
    const sx = clientX * state.DPR;
    const sy = clientY * state.DPR;
    const wx = (sx - state.width/2) / (state.zoom) + state.camX;
    const wy = (sy - state.height/2) / (state.zoom) + state.camY;
    return {x:wx, y:wy};
  }
  function toScreen(wx, wy){
    const sx = (wx - state.camX)*state.zoom + state.width/2;
    const sy = (wy - state.camY)*state.zoom + state.height/2;
    return {x:sx, y:sy};
  }
  function snap(v){ return Math.round(v / TILE) * TILE; }

  // ---- Zeichenhelfer
  function drawTile(img, gx, gy){
    const {ctx} = state;
    const {x,y} = toScreen(gx, gy);
    const s = TILE * state.zoom;
    ctx.drawImage(img,
      x - s/2, y - s/2, s, s);
  }

  function drawRoadSegment(seg){
    const ctx = state.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a07c4a'; // Erdweg-Farbe (sichtbar ohne Texturlogik)
    ctx.lineWidth = Math.max(3, 10*state.zoom);
    const a = toScreen(seg.x1, seg.y1);
    const b = toScreen(seg.x2, seg.y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(b){
    const ctx = state.ctx;
    const tex = b.type==='hq' ? Tex.hq : b.type==='woodcutter' ? Tex.woodcutter : Tex.depot;
    const {x,y} = toScreen(b.x, b.y);
    const s = TILE * state.zoom;
    ctx.drawImage(tex, x - s/2, y - s/2, s, s);
  }

  // ---- Welt zeichnen
  function draw(world){
    const ctx = state.ctx;
    ctx.save();
    ctx.clearRect(0,0,state.width, state.height);

    // Boden (einfaches Raster aus Grass; später Chunk-Renderer)
    // Zeichne sichtbares Tile-Rechteck
    const left   = Math.floor((state.camX - state.width/2/state.zoom)/TILE)-1;
    const right  = Math.floor((state.camX + state.width/2/state.zoom)/TILE)+1;
    const top    = Math.floor((state.camY - state.height/2/state.zoom)/TILE)-1;
    const bottom = Math.floor((state.camY + state.height/2/state.zoom)/TILE)+1;

    for (let gy=top; gy<=bottom; gy++){
      for (let gx=left; gx<=right; gx++){
        // simple Biome: Wasser Rand, sonst Gras (Platzhalter)
        const wx = gx*TILE, wy = gy*TILE;
        const edge = (Math.abs(gx)>40 || Math.abs(gy)>40);
        const img = edge ? Tex.water : Tex.grass;
        drawTile(img, wx, wy);
      }
    }

    // Straßen
    for (const r of world.roads) drawRoadSegment(r);

    // Gebäude
    for (const b of world.buildings) drawBuilding(b);

    ctx.restore();
  }

  // ---- Kamera APIs
  function setZoom(v){ state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, v)); }
  function zoomBy(d){ setZoom(state.zoom + d); }
  function moveBy(dx, dy){ state.camX += dx; state.camY += dy; }
  function centerOn(wx, wy){ state.camX = wx; state.camY = wy; }

  return { attachCanvas, resize, draw, toWorld, toScreen, snap, setZoom, zoomBy, moveBy, centerOn, state };
})();
