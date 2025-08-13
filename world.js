// world.js  v14.2 – einfache isometrische Karte + Bauen
const TILE_W = 128, TILE_H = 64;

export function isoToPixel(x, y){
  return {
    x: (x - y) * (TILE_W/2),
    y: (x + y) * (TILE_H/2)
  };
}

export function createWorld({ size=40 } = {}){
  const world = {
    size,
    tiles: new Array(size*size).fill('grass'),
    buildings: [],   // {type:'hq'|'lumber'|'depot', x,y, pixelX,pixelY}
    roads: new Set(),// key "x,y"
    originX: 0, originY: 0, // wird von Renderer gesetzt
    hq: null
  };

  // HQ mittig
  const cx = Math.floor(size/2), cy = Math.floor(size/2);
  const p = isoToPixel(cx, cy);
  world.hq = { type:'hq_stone', x:cx, y:cy, pixelX:p.x, pixelY:p.y };
  world.buildings.push(world.hq);

  world.inBounds = (x,y)=> x>=0 && y>=0 && x<size && y<size;
  world.key = (x,y)=> `${x},${y}`;

  world.placeRoad = (x,y)=>{ if(!world.inBounds(x,y)) return false; world.roads.add(world.key(x,y)); return true; };
  world.hasRoad = (x,y)=> world.roads.has(world.key(x,y));

  world.placeBuilding = (type,x,y)=>{
    if(!world.inBounds(x,y)) return false;
    // Blockiere HQ doppelt
    if(type==='hq' || type==='hq_stone' || type==='hq_wood'){
      // nur wenn nicht schon HQ an der Stelle
      if(world.buildings.some(b=>b.x===x && b.y===y)) return false;
    }
    const p=isoToPixel(x,y);
    world.buildings.push({type, x,y, pixelX:p.x, pixelY:p.y});
    return true;
  };

  return world;
}

export const TILE_SIZE = { W:TILE_W, H:TILE_H };
