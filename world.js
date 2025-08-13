import { IM } from './core/assets.js';
import { camera, TILE_W, TILE_H, worldToScreen, screenToWorld } from './core/camera.js';
import { drawCarriers } from './core/carriers.js';

export const MAP_W = 120;
export const MAP_H = 120;

/* Ressourcen */
export const resources = { wood:20, stone:10, food:10, gold:0 };

/* Weltzustand */
export const tiles = new Array(MAP_W*MAP_H).fill('grass'); // terrain id
export const roads = new Set();                             // key "x,y"
export const buildings = [];                                // {type,x,y}
export const HQ_POS = {x:Math.floor(MAP_W/2), y:Math.floor(MAP_H/2)};
window.HQ_POS = HQ_POS; // für camera.centerOnHQ()

export function initWorld(){
  // kleiner See
  for(let y=35;y<55;y++){
    for(let x=35;x<55;x++){
      tiles[idx(x,y)] = 'water';
      if(x===35||x===54||y===35||y===54) tiles[idx(x,y)]='shore';
    }
  }
  // Start-HQ (Stein) mittig
  buildings.length=0;
  buildings.push({type:'hq_stone', x:HQ_POS.x, y:HQ_POS.y});
}

function idx(x,y){ return y*MAP_W+x; }
function inMap(x,y){ return x>=0&&y>=0&&x<MAP_W&&y<MAP_H; }

/* ---------- Zeichnen ---------- */
export function drawWorld(ctx, debug=false){
  // Sichtfenster grob bestimmen (etwas Rand)
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
      const t = tiles[idx(x,y)];
      const [sx,sy] = worldToScreen(x,y);
      drawTile(ctx, t, sx, sy);
    }
  }
  // Straßen
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(roads.has(key(x,y))){
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
    ctx.fillStyle = t==='water' ? '#1763a1' : '#295a2e';
    isoDiamond(ctx, sx, sy, '#000', ctx.fillStyle);
  }
}

function drawRoadAuto(ctx,x,y,sx,sy){
  // simple Autotile je Nachbarn
  const n = hasRoad(x,y-1), s=hasRoad(x,y+1), w=hasRoad(x-1,y), e=hasRoad(x+1,y);
  let img = IM.road;
  if((n&&s&&!w&&!e)||(w&&e&&!n&&!s)) img = IM.road_straight || img;
  else if((n&&e)|| (e&&s) || (s&&w) || (w&&n)) img = IM.road_curve || img;
  if(img) ctx.drawImage(img, sx-(TILE_W/2), sy-TILE_H, TILE_W, TILE_H*2);
  else isoDiamond(ctx,sx,sy,'#000','#806a4a');
}
function hasRoad(x,y){ return roads.has(key(x,y)); }

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

/* ---------- Bauen ---------- */
export function tryBuildAtScreen(screenX,screenY, tool){
  const [wx, wy] = screenToWorld(screenX,screenY);
  const x = Math.round(wx), y = Math.round(wy);
  if(!inMap(x,y)) return;

  if(tool==='road'){ roads.add(key(x,y)); }
  else if(tool==='erase'){ roads.delete(key(x,y)); removeBuildingAt(x,y); }
  else if(tool==='hq'){ buildings.push({type:'hq_wood',x,y}); }
  else if(tool==='lumber'){ buildings.push({type:'lumberjack',x,y}); }
  else if(tool==='depot'){ buildings.push({type:'depot',x,y}); }
}

function removeBuildingAt(x,y){
  const i = buildings.findIndex(b=>b.x===x && b.y===y);
  if(i>=0) buildings.splice(i,1);
}

function key(x,y){ return `${x},${y}`; }

/* ---------- Tick ---------- */
let tickAcc=0;
export function worldTick(dt){
  // primitive Produktion: +1 Holz alle 3s, wenn es mind. 1 Holzfäller gibt
  tickAcc += dt;
  if(tickAcc>=3){
    if(buildings.some(b=>b.type==='lumberjack')) resources.wood += 1;
    tickAcc = 0;
  }
}
