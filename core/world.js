// core/world.js — Weltzustand, Bauen, Update, Koordinaten-Invers

import { TILE_W, TILE_H, HALF_W, HALF_H } from './render.js';
import { IM } from './assets.js';
import { cam } from './camera.js';

export const TOOLS = { POINTER:0, ROAD:1, HQ:2, LUMBER:3, DEPOT:4, BULL:5 };
let currentTool = TOOLS.POINTER;
export function setTool(t){ currentTool = t; }

export const resources = { wood:0, stone:0, food:0, gold:0 };
export function carriersCount(){ return 0; } // Platzhalter

// Welt
export let W=64, H=64;
let tiles;            // Uint8: 0 grass,1 water,2 shore,3 dirt
let roads;            // Set "x,y"
let buildings=[];     // {x,y,type}
export const startPos = {x:0,y:0}; // HQ-Position

export function createWorld(w,h){
  W=w; H=h;
  tiles = new Uint8Array(W*H);
  roads = new Set();
  buildings.length=0;

  // einfache Map: Wasserblock links-oben, Rest Gras, etwas Dirt
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      let t = 0; // grass
      if(x>6 && x<26 && y>6 && y<26) t=1; // water
      if(t===0 && Math.random()<0.06) t=3; // dirt
      // Shore (einfacher Rahmen um Wasser)
      if(t===0){
        if( (x>=6 && x<=26 && (y===6||y===26)) ||
            (y>=6 && y<=26 && (x===6||x===26)) ) t=2;
      }
      tiles[y*W+x]=t;
    }
  }
  // HQ (Stein) in der Mitte
  startPos.x = (W>>1); startPos.y=(H>>1);
  buildings.push({x:startPos.x, y:startPos.y, type:'HQ_STONE'});

  // paar Start-Ressourcen
  resources.wood=20; resources.stone=10; resources.food=10; resources.gold=0;
}

export function getRenderData(){
  return { W, H, tiles, roads, buildings };
}

export function updateWorld(dt){
  // später: Produktion, Träger, Pfade … (jetzt leer)
  void dt;
}

// ------ Bauen / Abriss ------
export function buildAt(x,y){
  if(x<0||y<0||x>=W||y>=H) return false;

  if(currentTool===TOOLS.ROAD){
    const key=`${x},${y}`;
    if(tiles[y*W+x]===1) return false; // nicht im Wasser
    roads.add(key); return true;
  }
  if(currentTool===TOOLS.HQ){
    buildings.push({x,y,type:'HQ_WOOD'}); return true;
  }
  if(currentTool===TOOLS.LUMBER){
    buildings.push({x,y,type:'LUMBER'}); return true;
  }
  if(currentTool===TOOLS.DEPOT){
    buildings.push({x,y,type:'DEPOT'}); return true;
  }
  if(currentTool===TOOLS.BULL){
    // Straße löschen
    const key=`${x},${y}`; if(roads.has(key)){ roads.delete(key); return true; }
    // Gebäude löschen (kein HQ_Stein in der Mitte löschen)
    const i = buildings.findIndex(b=> b.x===x && b.y===y);
    if(i>=0){
      const isCenter = (buildings[i].type==='HQ_STONE' && x===startPos.x && y===startPos.y);
      if(!isCenter){ buildings.splice(i,1); return true; }
    }
  }
  return false;
}

// ------ Koordinaten: Screen -> Zelle (exakte Inverse) ------
export function screenToCell(sx, sy){
  // Screen -> Weltpixel (Kamera zurückrechnen)
  const wx = sx / cam.z + cam.x;
  const wy = sy / cam.z + cam.y;
  // Inverse Projektion
  const ix = Math.floor((wy / HALF_H + wx / HALF_W) * 0.5);
  const iy = Math.floor((wy / HALF_H - wx / HALF_W) * 0.5);
  return { x:ix, y:iy };
}
