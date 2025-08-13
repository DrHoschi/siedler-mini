import { IM } from './core/assets.js';
import { camera, TILE_W, TILE_H, worldToScreen, screenToWorld } from './core/camera.js';
import { drawCarriers } from './core/carriers.js';

export const MAP_W = 120;
export const MAP_H = 120;

export const resources = { wood:20, stone:10, food:10, gold:0 };

export const tiles = new Array(MAP_W*MAP_H).fill('grass'); // terrain id
export const roads = new Set();                             // key "x,y"
export const buildings = [];                                // {type,x,y}
export const HQ_POS = {x:Math.floor(MAP_W/2), y:Math.floor(MAP_H/2)};
window.HQ_POS = HQ_POS;

const K=(x,y)=>`${x},${y}`;
const IDX=(x,y)=> y*MAP_W+x;
export const inBounds=(x,y)=> x>=0&&y>=0&&x<MAP_W&&y<MAP_H;
export const isRoad=(x,y)=> roads.has(K(x,y));

export function initWorld(){
  // kleiner See
  for(let y=35;y<55;y++){
    for(let x=35;x<55;x++){
      tiles[IDX(x,y)] = 'water';
      if(x===35||x===54||y===35||y===54) tiles[IDX(x,y)]='shore';
    }
  }
  // Start-HQ (Stein) mittig
  buildings.length=0;
  buildings.push({type:'hq_stone', x:HQ_POS.x, y:HQ_POS.y});
  // kurze Startstraße
  roads.add(K(HQ_POS.x, HQ_POS.y+1));
}

export function getBuildingsOfType(type){ return buildings.filter(b=>b.type===type); }
export function getHQ(){ return buildings.find(b=>b.type==='hq_stone'||b.type==='hq_wood') || {x:HQ_POS.x,y:HQ_POS.y}; }

/* ---------- Zeichnen ---------- */
export function drawWorld(ctx, debug=false){
  // Sichtfenster grob bestimmen
  const pad = 4;
  const corners = [
    screenToWorld(0,0),
    screenToWorld(ctx.canvas.width/devicePixelRatio,0),
    screenToWorld(0,ctx.canvas.height/devicePixelRatio),
    screenToWorld(ctx.canvas.width/devicePixelRatio,ctx.canvas.height/devicePixelRatio),
  ];
  let minX = Math.floor(Math.min(...corners.map(c=>c[0])))-pad;
  let maxX = Math.ceil (Math.max(...corners.map(c=>c[0])))+pad;
  let minY = Math.floor(Math.min(...corners.map(c=>c[1])))-pad;
  let maxY = Math.ceil (Math.max(...corners.map(c=>c[1])))+pad;

  minX=Math.max(0,minX); minY=Math.max(0,minY);
  maxX=Math.min(MAP_W-1,maxX); maxY=Math.min(MAP_H-1,maxY);

  // Terrain
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const t = tiles[IDX(x,y)];
      const [sx,sy] = worldToScreen(x,y);
      drawTile(ctx, t, sx, sy);
    }
  }
  // Straßen
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(roads.has(K(x,y))){
        const [sx,sy]=worldToScreen(x,y);
        drawRoadAuto(ctx,x,y,sx,sy);
      }
    }
  }
  // Gebäude
  for(const b of buildings){
    const [sx,sy] = worldToScreen(b.x,b.y);
    drawBuilding(ctx,b,sx,sy);
  }
  // Träger
  drawCarriers(ctx);

  if(debug){
    ctx.fillStyle='rgba(255,255,255,.15)';
    ctx.fillText(`Cam: ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}`, 10, 60);
  }
}

function drawTile(ctx, t, sx, sy){
  const img = IM[t];
  if(img) ctx.drawImage(img, sx-(TILE_W/2), sy-TILE_H, TILE_W, TILE_H*2);
  else {
    ctx.fillStyle = t==='water' ? '#1763a1' : t==='shore' ? '#375a4d' : '#295a2e';
    isoDiamond(ctx, sx, sy, '#000', ctx.fillStyle);
  }
}

function drawRoadAuto(ctx,x,y,sx,sy){
  const n = isRoad(x,y-1), s=isRoad(x,y+1), w=isRoad(x-1,y), e=isRoad(x+1,y);
  let img = IM.road;
  if((n&&s&&!w&&!e)||(w&&e&&!n&&!s)) img = IM.road_straight || img;
  else if((n&&e)|| (e&&s) || (s&&w) || (w&&n)) img = IM.road_curve || img;
  if(img) ctx.drawImage(img, sx-(TILE_W/2), sy-TILE_H, TILE_W, TILE_H*2);
  else isoDiamond(ctx,sx,sy,'#000','#806a4a');
}

function drawBuilding(ctx,b,sx,sy){
  const img = IM[b.type] || IM.hq_wood;
  if(img) ctx.drawImage(img, sx-64, sy-96, 128, 128);
  else { ctx.fillStyle='#c33'; isoDiamond(ctx,sx,sy,'#000','#a33'); }
}

function isoDiamond(ctx, sx, sy, stroke, fill){
  const hw=TILE_W/2, hh=TILE_H;
  ctx.beginPath();
  ctx.moveTo(sx, sy-hh);
  ctx.lineTo(sx+hw, sy);
  ctx.lineTo(sx, sy+hh);
  ctx.lineTo(sx-hw, sy);
  ctx.closePath();
  ctx.fillStyle=fill; ctx.fill();
  ctx.strokeStyle=stroke; ctx.stroke();
}

/* ---------- Bauen (liefert Ergebnis an main.js) ---------- */
export function tryBuildAtScreen(screenX,screenY, tool){
  const [wx, wy] = screenToWorld(screenX,screenY);
  const x = Math.round(wx), y = Math.round(wy);
  if(!inBounds(x,y)) return {kind:'none'};

  if(tool==='road'){
    roads.add(K(x,y));
    return {kind:'roadChanged'};
  }
  if(tool==='erase'){
    const wasRoad = roads.delete(K(x,y));
    if (wasRoad) return {kind:'roadChanged'};
    const i = buildings.findIndex(b=>b.x===x && b.y===y);
    if(i>=0){ const b=buildings[i]; buildings.splice(i,1); return {kind:'buildingRemoved', building:b}; }
    return {kind:'none'};
  }
  if(tool==='hq'){ const b={type:'hq_wood',x,y}; buildings.push(b); return {kind:'building', building:b}; }
  if(tool==='lumber'){ const b={type:'lumberjack',x,y}; buildings.push(b); return {kind:'building', building:b}; }
  if(tool==='depot'){ const b={type:'depot',x,y}; buildings.push(b); return {kind:'building', building:b}; }

  return {kind:'none'};
}
